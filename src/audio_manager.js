/**
 * Indak Audio Manager
 * Uses Web Audio API for low-latency rhythm mechanics.
 */

class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.audioPath = '/assets/audio/';
        this.vocalPath = '/assets/audio/vocals/';
        this.sounds = ['beat_normal.wav', 'beat_stress.wav', 'beat_fail.wav'];
        this.buffers = {};
        this.vocalBuffers = {};
        // Speech Synthesis and Vocals have been removed for performance reasons.
    }

    /**
     * Pre-load all required audio samples
     */
    async init() {
        const loadPromises = this.sounds.map(sound => this.loadBuffer(sound));
        await Promise.all(loadPromises);
        console.log('Indak Audio Manager: Percussion samples loaded.');
    }

    async loadBuffer(filename) {
        try {
            const response = await fetch(this.audioPath + filename);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            this.buffers[filename] = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.warn(`AudioManager: Using synth fallback for ${filename} (${error.message})`);
            this.buffers[filename] = null;
        }
    }

    /**
     * Plays the appropriate beat based on stress
     * @param {boolean} isStress - Whether the current syllable is the stressed beat
     */
    playSyllable(isStress) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const filename = isStress ? 'beat_stress.wav' : 'beat_normal.wav';
        this.playSound(filename);

        // Trigger visual pulse event
        if (isStress) {
            document.body.classList.add('pulse-active');
            setTimeout(() => document.body.classList.remove('pulse-active'), 150);
        }
    }


    playFail() {
        this.playSound('beat_fail.wav');
    }

    playSound(filename) {
        const buffer = this.buffers[filename];
        if (!buffer) {
            // Procedural fallback for testing when files are missing
            this.playSynth(filename.includes('stress') ? 220 : 440);
            return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
    }

    playSynth(freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Woodblock/Percussion style envelope
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.1, this.ctx.currentTime + 0.1);

        // Stronger, louder initial strike
        gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
}

const indakAudio = new AudioManager();
export default indakAudio;
