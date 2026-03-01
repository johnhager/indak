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
const masteryBtn = document.getElementById('mastery-btn');

let activeGame = null;
let globalVocabulary = [];

// Pre-fetch vocabulary on app load
async function preFetchData() {
    try {
        const vocabResp = await fetch('./data/vocabulary.json');
        globalVocabulary = await vocabResp.json();
        levelManager.setVocabulary(globalVocabulary);
        console.log("Indak: Dictionary Loaded.");
    } catch (e) {
        console.error("Critical: Failed to load dictionary", e);
    }
}
preFetchData();

function showExitButton() {
    exitBtn?.classList.remove('hidden');
}

function hideExitButton() {
    exitBtn?.classList.add('hidden');
}

function showMasteryDashboard() {
    const stats = levelManager.getMasteryStats();

    // Create or find container
    let dash = document.getElementById('mastery-dashboard');
    if (!dash) {
        dash = document.createElement('div');
        dash.id = 'mastery-dashboard';
        dash.className = 'summary-screen';
        document.getElementById('app').appendChild(dash);
    }

    // If dictionary isn't loaded yet, show loading state
    if (globalVocabulary.length === 0) {
        dash.innerHTML = `<div class="glass-card"><h2>Loading Dictionary...</h2></div>`;
        dash.classList.remove('hidden');
        return;
    }

    const wordItems = globalVocabulary.map(w => {
        const m = stats.details[w.word] || { rhythm: false, meaning: false };
        return `
            <div class="word-status-item" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.1);">
                <span style="font-weight: 600; font-size: 0.9rem;">${w.word}</span>
                <div style="display: flex; gap: 4px;">
                    <span title="Rhythm Mastery" style="opacity: ${m.rhythm ? 1 : 0.2}; filter: ${m.rhythm ? 'none' : 'grayscale(1)'}">🥁</span>
                    <span title="Meaning Mastery" style="opacity: ${m.meaning ? 1 : 0.2}; filter: ${m.meaning ? 'none' : 'grayscale(1)'}">📖</span>
                </div>
            </div>
        `;
    }).join('');

    dash.innerHTML = `
        <div class="glass-card" style="width: 90%; max-width: 500px; max-height: 80vh; display: flex; flex-direction: column;">
            <h2 style="color: var(--accent-gold); flex-shrink: 0;">Mastery Status</h2>
            <p style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 1rem; flex-shrink: 0;">🥁 = Rhythm Perfected | 📖 = Meaning Known</p>
            
            <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1.5rem; flex-shrink: 0;">
                <div class="stat-item" style="padding: 10px;"><span style="font-size: 0.7rem;">Rhythm</span><strong>${stats.rhythmPercent}%</strong></div>
                <div class="stat-item" style="padding: 10px;"><span style="font-size: 0.7rem;">Meaning</span><strong>${stats.meaningPercent}%</strong></div>
                <div class="stat-item" style="padding: 10px;"><span style="font-size: 0.7rem;">Goal</span><strong>${stats.fullPercent}%</strong></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: left; margin-bottom: 1.5rem; overflow-y: auto; padding-right: 5px;">
                ${wordItems}
            </div>

            <button id="close-dash-btn" class="btn-primary" style="flex-shrink: 0; margin-top: auto;">BALIK (Return)</button>
        </div>
    `;

    dash.classList.remove('hidden');
    hideMenu();

    document.getElementById('close-dash-btn').addEventListener('click', () => {
        dash.classList.add('hidden');
        showMenu();
    });
}

masteryBtn?.addEventListener('click', () => {
    showMasteryDashboard();
});

function showMenu() {
    menuOverlay.classList.remove('hidden');
    heroSection.classList.remove('hidden');
    rhythmPrep.classList.add('hidden');
}

function hideMenu() {
    menuOverlay.classList.add('hidden');
}

exitBtn?.addEventListener('click', () => {
    if (activeGame && typeof activeGame.stop === 'function') activeGame.stop();
    if (conductor && typeof conductor.stop === 'function') conductor.stop();
    gameStage.innerHTML = '';
    const summaryScreen = document.getElementById('summary-screen');
    if (summaryScreen) summaryScreen.classList.add('hidden');
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
    hideMenu();
    showExitButton();
    activeGame = new SwipeSorter(gameStage, globalVocabulary);
    activeGame.startRound();
});

startSentenceBtn?.addEventListener('click', async () => {
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
