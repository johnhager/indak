import indakAudio from './src/audio_manager.js';
import cloudManager from './src/cloud_manager.js';
import conductor from './src/conductor.js';
import levelManager from './src/level_manager.js';
import { SwipeSorter } from './src/swipe_sorter.js';
import { SentenceBuilder } from './src/sentence_builder.js';
import { MarkerMission } from './src/marker_mission.js';
import { RootRunner } from './src/root_runner.js';
import { ParticlePulse } from './src/particle_pulse.js';

const app = document.getElementById('app');
const startBtn = document.getElementById('start-btn');
const startSwipeBtn = document.getElementById('start-swipe-btn');
const startSentenceBtn = document.getElementById('start-sentence-btn');
const startMarkerBtn = document.getElementById('start-marker-btn');
const startRunnerBtn = document.getElementById('start-runner-btn');
const startParticleBtn = document.getElementById('start-particle-btn');
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
    const minAttempts = 5;

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
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2 style="color: var(--accent-gold); margin-bottom: 0.2rem;">Vocab Mastery</h2>
                        <div style="background: var(--accent-gold); color: black; display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; margin-bottom: 0.5rem;">LEVEL ${levelManager.currentTier}: ${levelManager.getSummary().tier}</div>
                    </div>
                    <!-- Cloud Sync Status -->
                    <div id="cloud-status-container" style="text-align: right;">
                        <div style="font-size: 0.6rem; opacity: 0.6; display: flex; align-items: center; gap: 4px; justify-content: flex-end;">
                            <span id="cloud-status-dot" style="width: 6px; height: 6px; border-radius: 50%; background: #aaa;"></span>
                            <span id="cloud-status-text">DISCONNECTED</span>
                            <button id="force-sync-btn" style="background: none; border: none; font-size: 0.8rem; cursor: pointer; padding: 0 4px; opacity: 0.5;">🔄</button>
                        </div>
                        <div id="last-sync-time" style="font-size: 0.5rem; opacity: 0.4; margin-top: 2px;"></div>
                        <button id="cloud-login-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 30px; color: white; font-size: 0.6rem; margin-top: 4px; cursor: pointer;">
                            ${cloudManager.user && !cloudManager.user.isAnonymous ? '🚪 EXIT ACCOUNT' : '☁️ SYNC ACCOUNT'}
                        </button>
                    </div>
                </div>
                <!-- Mini Log for debugging -->
                <div id="sync-log" style="font-size: 0.5rem; opacity: 0.3; margin-bottom: 0.5rem; text-align: left;">READY</div>
                <p style="font-size: 0.6rem; opacity: 0.7; margin-bottom: 1rem;">90% Success (5+ Tries)</p>
                
                <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="stat-item" style="padding: 12px;">
                        <span style="font-size: 0.65rem; text-transform: uppercase;">Rhythm (Drum)</span>
                        <strong>${stats.rhythmPercent}%</strong>
                        <span style="font-size: 0.6rem; opacity: 0.6;">${stats.rhythm}/${stats.total}</span>
                    </div>
                    <div class="stat-item" style="padding: 12px;">
                        <span style="font-size: 0.65rem; text-transform: uppercase;">Meaning (Book)</span>
                        <strong>${stats.meaningPercent}%</strong>
                        <span style="font-size: 0.6rem; opacity: 0.6;">${stats.meaning}/${stats.total}</span>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; text-align: left; margin-top: 0.5rem; overflow-y: auto; padding-right: 8px; flex-grow: 1;">
                ${wordItems}
            </div>

            <button id="close-dash-btn" class="btn-primary" style="flex-shrink: 0; margin-top: 1rem; width: 100%;">BALIK (Return)</button>
            <div style="text-align: center; margin-top: 0.8rem;">
                <button id="hard-reset-btn" style="background: none; border: none; font-size: 0.5rem; color: #ff4d4d; opacity: 0.4; text-decoration: underline; cursor: pointer;">RESET SYNC ENGINE (Emergency Only)</button>
            </div>
        </div>
    `;

    dash.classList.remove('hidden');
    hideMenu();

    document.getElementById('close-dash-btn').addEventListener('click', () => {
        dash.classList.add('hidden');
        showMenu();
    });

    const loginBtn = document.getElementById('cloud-login-btn');
    loginBtn?.addEventListener('click', async () => {
        if (cloudManager.user && !cloudManager.user.isAnonymous) {
            if (confirm("Sign out of cloud sync? Your local progress will stay on this device.")) {
                await cloudManager.logout();
                showMasteryDashboard();
            }
            return;
        }

        loginBtn.textContent = 'AUTHENTICATING...';
        const user = await cloudManager.loginWithGoogle();
        if (user) {
            await levelManager.syncWithCloud();
            showMasteryDashboard(); // Re-render
        } else {
            loginBtn.textContent = '☁️ SYNC ACCOUNT';
        }
    });

    document.getElementById('force-sync-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('force-sync-btn');
        btn.style.animation = 'spin 1s linear infinite';
        await levelManager.syncWithCloud();
        showMasteryDashboard();
    });

    document.getElementById('hard-reset-btn')?.addEventListener('click', async () => {
        if (confirm("This will clear the sync cache and reload the app. Continue?")) {
            await cloudManager.forceReset();
        }
    });

    updateCloudStatusUI();
}

function updateCloudStatusUI() {
    const dot = document.getElementById('cloud-status-dot');
    const txt = document.getElementById('cloud-status-text');
    const loginBtn = document.getElementById('cloud-login-btn');

    if (dot && txt) {
        if (cloudManager.status === 'synced') {
            dot.style.background = '#00ffaa';
            txt.textContent = 'CLOUD SYNCED';
            if (loginBtn && cloudManager.user && !cloudManager.user.isAnonymous) {
                loginBtn.textContent = '🚪 EXIT ACCOUNT';
                loginBtn.style.opacity = '1.0';
            }
        } else if (cloudManager.status === 'syncing') {
            dot.style.background = '#ffcc00';
            txt.textContent = 'SYNCING...';
        } else if (cloudManager.status === 'error') {
            dot.style.background = '#ff4d4d';
            txt.textContent = 'SYNC ERROR';
            if (cloudManager.lastError) {
                txt.textContent = cloudManager.lastError.includes('Timeout') ? 'TIMEOUT' : 'FAIL';
                txt.title = cloudManager.lastError;
            }
        }

        // Update mini log
        const syncLog = document.getElementById('sync-log');
        if (syncLog) {
            syncLog.textContent = `STATUS: ${cloudManager.status.toUpperCase()}`;
            if (cloudManager.lastError) syncLog.textContent += ` (${cloudManager.lastError})`;
        }

        const lastSync = localStorage.getItem('indak_last_sync');
        const timeDisplay = document.getElementById('last-sync-time');
        if (lastSync && timeDisplay) {
            const date = new Date(parseInt(lastSync));
            timeDisplay.textContent = `Last sync: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    }
}

// Global listener for cloud status changes
window.addEventListener('cloud-status-change', () => {
    updateCloudStatusUI();
});

masteryBtn?.addEventListener('click', () => {
    showMasteryDashboard();
    // Initial UI update after rendering
    setTimeout(updateCloudStatusUI, 50);
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

startParticleBtn?.addEventListener('click', async () => {
    hideMenu();
    showExitButton();
    try {
        const response = await fetch('./data/particle_pulse.json');
        const particleData = await response.json();
        activeGame = new ParticlePulse(gameStage, particleData);
        // It shows its start screen on init
    } catch (e) {
        console.error('Failed to fetch particle data:', e);
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
