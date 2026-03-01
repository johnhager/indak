import indakAudio from './src/audio_manager.js';
import conductor from './src/conductor.js';
import levelManager from './src/level_manager.js';
import { SwipeSorter } from './src/swipe_sorter.js';
import { SentenceBuilder } from './src/sentence_builder.js';

const app = document.getElementById('app');
const startBtn = document.getElementById('start-btn');
const startSwipeBtn = document.getElementById('start-swipe-btn');
const startSentenceBtn = document.getElementById('start-sentence-btn');
const exitBtn = document.getElementById('exit-btn');
const gameStage = document.getElementById('game-stage');
const menuOverlay = document.getElementById('menu-overlay');
const rhythmPrep = document.getElementById('rhythm-prep');
const heroSection = document.querySelector('.hero-section');
const confirmStartBtn = document.getElementById('confirm-start-btn');
const cancelPrepBtn = document.getElementById('cancel-prep-btn');

let activeGame = null;

function showExitButton() {
    exitBtn?.classList.remove('hidden');
}

function hideExitButton() {
    exitBtn?.classList.add('hidden');
}

function showMenu() {
    menuOverlay.classList.remove('hidden');
    heroSection.classList.remove('hidden');
    rhythmPrep.classList.add('hidden');
}

function hideMenu() {
    menuOverlay.classList.add('hidden');
}

exitBtn?.addEventListener('click', () => {
    // Force stop all potential engines
    if (activeGame && typeof activeGame.stop === 'function') activeGame.stop();
    if (conductor && typeof conductor.stop === 'function') conductor.stop();

    // Clear the dynamic stage
    gameStage.innerHTML = '';

    // Reset Overlays
    const summaryScreen = document.getElementById('summary-screen');
    if (summaryScreen) summaryScreen.classList.add('hidden');

    // Return to Menu
    showMenu();
    hideExitButton();
    activeGame = null;
});

startBtn?.addEventListener('click', () => {
    heroSection.classList.add('hidden');
    rhythmPrep.classList.remove('hidden');
});

cancelPrepBtn?.addEventListener('click', () => {
    showMenu();
});

confirmStartBtn?.addEventListener('click', async () => {
    console.log('Indak: Initializing Engine...');

    if (indakAudio.ctx.state === 'suspended') {
        indakAudio.ctx.resume();
    }

    hideMenu();
    showExitButton();

    try {
        const speedMode = document.querySelector('input[name="game-speed"]:checked').value;
        levelManager.setSpeedMode(speedMode);

        await indakAudio.init();
        await conductor.init();
        conductor.start();
    } catch (e) {
        console.error('Failed to start game loop:', e);
    }
});

startSwipeBtn?.addEventListener('click', async () => {
    console.log('Swipe Sorter: Initializing...');
    hideMenu();
    showExitButton();

    try {
        const response = await fetch('./data/vocabulary.json');
        const vocabularyData = await response.json();

        activeGame = new SwipeSorter(gameStage, vocabularyData);
        activeGame.startRound();
    } catch (e) {
        console.error('Failed to fetch vocabulary:', e);
    }
});

startSentenceBtn?.addEventListener('click', async () => {
    console.log('Sentence Builder: Initializing...');
    hideMenu();
    showExitButton();

    try {
        const response = await fetch('./data/sentences.json');
        const sentencesData = await response.json();

        activeGame = new SentenceBuilder(gameStage, sentencesData);
        activeGame.startRound();
    } catch (e) {
        console.error('Failed to fetch sentences:', e);
    }
});

// PWA High-Performance Input
app.addEventListener('pointerdown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    conductor.checkInput();
    createTapCircle(e.clientX, e.clientY);
});

function createTapCircle(x, y) {
    const circle = document.createElement('div');
    circle.className = 'tap-circle';
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    document.body.appendChild(circle);
    setTimeout(() => circle.remove(), 400);
}

console.log('Indak Core Initialized.');
