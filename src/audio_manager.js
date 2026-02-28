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

        // Native Speech Synthesis Fallback
        this.synth = window.speechSynthesis || null;
        this.voice = null;
        if (this.synth) {
            this.initVoice();
        }
    }

    initVoice() {
        const setVoice = () => {
            const voices = this.synth.getVoices();
            // Priority: Regional native -> Indonesian/Malay (phonetically identical vowels to Ilonggo) -> Spanish -> Any
            this.voice = voices.find(v => v.lang === 'hil-PH') ||
                voices.find(v => v.lang === 'tl-PH') ||
                voices.find(v => v.lang === 'fil-PH') ||
                voices.find(v => v.lang === 'id-ID') || // Indonesian
                voices.find(v => v.lang === 'ms-MY') || // Malay
                voices.find(v => v.lang.startsWith('es-')) || // Spanish (Monica/Paulina)
                voices[0];

            if (this.voice) {
                console.log('AudioManager: Voice loaded -', this.voice.name, this.voice.lang);
            } else {
                console.warn('AudioManager: No voices found yet.');
            }
        };

        setVoice();

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = setVoice;
        }
    }

    /**
     * Pre-load all required audio samples
     */
    async init() {
        const loadPromises = this.sounds.map(sound => this.loadBuffer(sound));
        await Promise.all(loadPromises);
        console.log('Indak Audio Manager: Percussion samples loaded.');
    }

    /**
     * Loads a vocal syllable into the cache on-demand or during initial load
     */
    async loadVocal(syllable) {
        const key = syllable.toLowerCase().replace(/[^a-z-]/g, '');
        if (this.vocalBuffers[key]) return;

        try {
            const response = await fetch(`${this.vocalPath}${key}.webm`);
            if (!response.ok) throw new Error('Vocal missing');
            const arrayBuffer = await response.arrayBuffer();
            this.vocalBuffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            // No error log here to prevent console spam for missing syllables
            this.vocalBuffers[key] = null;
        }
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
    playSyllable(isStress, syllableText = '') {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const filename = isStress ? 'beat_stress.wav' : 'beat_normal.wav';
        this.playSound(filename);

        if (syllableText) {
            this.playVocal(syllableText, isStress);
        }

        // Trigger visual pulse event
        if (isStress) {
            document.body.classList.add('pulse-active');
            setTimeout(() => document.body.classList.remove('pulse-active'), 150);
        }
    }

    playVocal(syllableText, isStress) {
        const key = syllableText.toLowerCase().replace(/[^a-z-]/g, '');
        const buffer = this.vocalBuffers[key];

        if (buffer) {
            const source = this.ctx.createBufferSource();
            const gainNode = this.ctx.createGain();

            source.buffer = buffer;

            // Rhythmic Pitch Shifting for Ilonggo "Lilt"
            if (isStress) {
                source.playbackRate.value = 1.05;
                gainNode.gain.value = 0.8;
            } else {
                gainNode.gain.value = 0.6;
            }

            source.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            source.start(0);
        } else {
            // Fallback: Native Speech Synthesis
            this.speakSyllable(syllableText, isStress);
        }
    }

    speakSyllable(text, isStress) {
        if (!this.synth) return;

        // Note: Removed this.synth.cancel() to prevent iOS Safari from hanging or abruptly chopping off rapid consecutive syllables.

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) utterance.voice = this.voice;

        // Ilonggo Lilt via Synthesis
        utterance.pitch = isStress ? 1.3 : 1.1;
        utterance.rate = 1.1; // Slower speed to allow the syllable to fully form
        utterance.volume = isStress ? 1.0 : 0.8;

        this.synth.speak(utterance);
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
}

const indakAudio = new AudioManager();
export default indakAudio;
