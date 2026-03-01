import indakAudio from './src/audio_manager.js';
import conductor from './src/conductor.js';
import levelManager from './src/level_manager.js';
import { SwipeSorter } from './src/swipe_sorter.js';
import { SentenceBuilder } from './src/sentence_builder.js';
import { MarkerMission } from './src/marker_mission.js';
import { RootRunner } from './src/root_runner.js';

const app = document.getElementById('app');
const startBtn = document.getElementById('start-btn');
const startSwipeBtn = document.getElementById('start-swipe-btn');
const startSentenceBtn = document.getElementById('start-sentence-btn');
const startMarkerBtn = document.getElementById('start-marker-btn');
const startRunnerBtn = document.getElementById('start-runner-btn');
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
    const threshold = 0.9;
    const minAttempts = 1; // Show as "mastered" immediately if they hit the target on first try

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
        const m = stats.details[w.word] || {
            rhythm: { c: 0, t: 0 },
            meaning: { c: 0, t: 0 }
        };

        const rSR = m.rhythm.t === 0 ? 0 : m.rhythm.c / m.rhythm.t;
        const mSR = m.meaning.t === 0 ? 0 : m.meaning.c / m.meaning.t;

        const rMastered = rSR >= threshold && m.rhythm.t >= minAttempts;
        const mMastered = mSR >= threshold && m.meaning.t >= minAttempts;

        return `
            <div class="word-status-item" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; font-size: 0.9rem;">${w.word}</span>
                    <span style="font-size: 0.6rem; opacity: 0.4;">${m.meaning.t} tries</span>
                </div>
                <div style="display: flex; gap: 4px;">
                    <span title="Rhythm: ${Math.round(rSR * 100)}%" style="opacity: ${rMastered ? 1 : 0.2}; filter: ${rMastered ? 'none' : 'grayscale(1)'}">🥁</span>
                    <span title="Meaning: ${Math.round(mSR * 100)}%" style="opacity: ${mMastered ? 1 : 0.2}; filter: ${mMastered ? 'none' : 'grayscale(1)'}">📖</span>
                </div>
            </div>
        `;
    }).join('');

    dash.innerHTML = `
        <div class="glass-card" style="width: 95%; max-width: 550px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;">
            <div style="flex-shrink: 0; padding-bottom: 1rem;">
                <h2 style="color: var(--accent-gold); margin-bottom: 0.5rem;">Vocab Mastery</h2>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <p style="font-size: 0.7rem; opacity: 0.7;">Threshold: <b>90% Efficiency</b></p>
                    <p style="font-size: 0.7rem; color: var(--accent-gold);">Mastered: <b>${stats.full}/${stats.total}</b></p>
                </div>
                
                <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="stat-item" style="padding: 12px;"><span style="font-size: 0.65rem; text-transform: uppercase;">Rhythm</span><strong>${stats.rhythmPercent}%</strong></div>
                    <div class="stat-item" style="padding: 12px;"><span style="font-size: 0.65rem; text-transform: uppercase;">Meaning</span><strong>${stats.meaningPercent}%</strong></div>
                    <div class="stat-item" style="padding: 12px;"><span style="font-size: 0.65rem; text-transform: uppercase;">Total</span><strong>${stats.fullPercent}%</strong></div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; text-align: left; margin-top: 0.5rem; overflow-y: auto; padding-right: 8px; flex-grow: 1;">
                ${wordItems}
            </div>

            <button id="close-dash-btn" class="btn-primary" style="flex-shrink: 0; margin-top: 1.5rem; width: 100%;">BALIK (Return)</button>
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

startMarkerBtn?.addEventListener('click', async () => {
    hideMenu();
    showExitButton();
    try {
        const response = await fetch('./data/grammar_drills.json');
        const drillsData = await response.json();
        activeGame = new MarkerMission(gameStage, drillsData);
        activeGame.startRound();
    } catch (e) {
        console.error('Failed to fetch drills:', e);
    }
});

startRunnerBtn?.addEventListener('click', async () => {
    hideMenu();
    showExitButton();
    try {
        const response = await fetch('./data/morphology.json');
        const morphologyData = await response.json();
        activeGame = new RootRunner(gameStage, morphologyData);
        activeGame.startRound();
    } catch (e) {
        console.error('Failed to fetch morphology data:', e);
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
