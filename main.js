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
const gameCanvas = document.getElementById('game-canvas');

let activeGame = null;

function showExitButton() {
    exitBtn?.classList.remove('hidden');
}

function hideExitButton() {
    exitBtn?.classList.add('hidden');
}

exitBtn?.addEventListener('click', () => {
    // Force stop all potential engines
    if (activeGame && typeof activeGame.stop === 'function') activeGame.stop();
    if (conductor && typeof conductor.stop === 'function') conductor.stop();

    // Clear the stage
    gameCanvas.innerHTML = '';
    const summaryScreen = document.getElementById('summary-screen');
    if (summaryScreen) summaryScreen.classList.add('hidden');

    // Return to Menu
    document.querySelector('.hero-section')?.classList.remove('hidden');
    hideExitButton();
    activeGame = null;
});

startBtn?.addEventListener('click', async () => {
    console.log('Indak: Initializing Engine...');

    // 1. Synchronously Unlock Audio Context (Crucial for iOS)
    if (indakAudio.ctx.state === 'suspended') {
        indakAudio.ctx.resume();
    }

    // Keep UI responsive immediately
    document.querySelector('.hero-section').classList.add('hidden');
    showExitButton();

    try {
        const speedMode = document.querySelector('input[name="game-speed"]:checked').value;
        levelManager.setSpeedMode(speedMode);

        // Init Systems
        await indakAudio.init();
        await conductor.init();
        conductor.start();
    } catch (e) {
        console.error('Failed to start game loop:', e);
    }
});

startSwipeBtn?.addEventListener('click', async () => {
    console.log('Swipe Sorter: Initializing...');
    document.querySelector('.hero-section').classList.add('hidden');
    showExitButton();

    try {
        const response = await fetch('./data/vocabulary.json');
        const vocabularyData = await response.json();

        activeGame = new SwipeSorter(gameCanvas, vocabularyData);
        activeGame.startRound();
    } catch (e) {
        console.error('Failed to fetch vocabulary:', e);
    }
});

startSentenceBtn?.addEventListener('click', async () => {
    console.log('Sentence Builder: Initializing...');
    document.querySelector('.hero-section').classList.add('hidden');
    showExitButton();

    try {
        const response = await fetch('./data/sentences.json');
        const sentencesData = await response.json();

        activeGame = new SentenceBuilder(gameCanvas, sentencesData);
        activeGame.startRound();
    } catch (e) {
        console.error('Failed to fetch sentences:', e);
    }
});

// PWA High-Performance Input
app.addEventListener('pointerdown', (e) => {
    // Prevent accidental triggers on buttons
    if (e.target.tagName === 'BUTTON') return;

    // Trigger timing check
    conductor.checkInput();

    // Optional: Visual tap feedback
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
