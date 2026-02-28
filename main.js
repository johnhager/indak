import indakAudio from './src/audio_manager.js';
import conductor from './src/conductor.js';

// Indak Main Logic
const app = document.getElementById('app');
const startBtn = document.getElementById('start-btn');

startBtn?.addEventListener('click', async () => {
    console.log('Indak: Initializing Engine...');

    // UI Transitions
    document.querySelector('.hero-section').classList.add('hidden');

    // Init Systems
    await indakAudio.init();
    await conductor.init();

    // Fix: Resume AudioContext (crucial for iOS/Chrome to advance currentTime)
    if (indakAudio.ctx.state === 'suspended') {
        await indakAudio.ctx.resume();
    }

    conductor.start();
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
