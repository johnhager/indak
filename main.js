import indakAudio from './src/audio_manager.js';
import conductor from './src/conductor.js';

// Indak Main Logic
const app = document.getElementById('app');
const startBtn = document.getElementById('start-btn');

startBtn?.addEventListener('click', async () => {
    console.log('Indak: Initializing Engine...');

    // 1. Synchronously Unlock Audio Context (Crucial for iOS)
    if (indakAudio.ctx.state === 'suspended') {
        indakAudio.ctx.resume();
    }

    // 2. Synchronously Unlock Speech Synthesis (Crucial for iOS)
    if (window.speechSynthesis) {
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
    }

    // 3. Keep UI responsive immediately
    document.querySelector('.hero-section').classList.add('hidden');

    try {
        // Init Systems
        await indakAudio.init();
        await conductor.init();
        conductor.start();
    } catch (e) {
        console.error('Failed to start game loop:', e);
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
