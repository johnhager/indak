import indakAudio from './audio_manager.js';
import levelManager from './level_manager.js';

class Conductor {
    constructor() {
        this.bpm = 80;
        this.msPerBeat = 60000 / this.bpm;
        this.songPosition = 0;
        this.lastFrameTime = 0;
        this.startTime = 0;
        this.isPlaying = false;

        this.activeSyllables = [];
        this.combo = 0;
        this.multiplier = 1;
        this.totalHits = 0;
        this.totalPossible = 0;
        this.gameDuration = 120000; // 2 minutes

        this.windows = { PERFECT: 50, GOOD: 100 };
        this.canvas = document.getElementById('game-canvas');
        this.debugOverlay = null;

        this.wordSequence = [];
        this.wordTracking = {}; // { wordId: { total: N, perfects: M, isValid: bool } }
    }

    async init() {
        try {
            const response = await fetch('/data/vocabulary.json');
            if (!response.ok) throw new Error('Vocabulary fail');
            const vocab = await response.json();
            levelManager.setVocabulary(vocab);
        } catch (error) {
            console.error('Conductor Init Error:', error);
            levelManager.setVocabulary([
                { word: "Indak", syllables: ["In", "dak"], stress_index: 0, meaning: "To dance rhythmically" }
            ]);
        }

        // Critical UI/State - ensure these run regardless of network
        this.createDebugOverlay();
        this.highScore = parseInt(localStorage.getItem('indak_high_flow') || '0');
    }

    createDebugOverlay() {
        if (document.getElementById('debug-overlay')) return;
        this.debugOverlay = document.createElement('div');
        this.debugOverlay.id = 'debug-overlay';
        this.debugOverlay.style.cssText = `
            position: absolute; top: 10px; right: 10px; 
            background: rgba(0,0,0,0.5); color: #0f0; 
            font-family: monospace; padding: 5px; font-size: 12px;
            pointer-events: none; z-index: 1000;
        `;
        document.body.appendChild(this.debugOverlay);
    }

    start() {
        this.startTime = indakAudio.ctx.currentTime;
        this.lastFrameTime = performance.now();
        this.isPlaying = true;
        this.combo = 0;
        this.multiplier = 1;
        this.totalHits = 0;
        this.totalPossible = 0;
        this.update();
        this.spawnLoop();

        setTimeout(() => this.endGame(), this.gameDuration);
    }

    update() {
        if (!this.isPlaying) return;

        const now = performance.now();
        this.lastFrameTime = now;

        // Sync with AudioContext
        this.songPosition = (indakAudio.ctx.currentTime - this.startTime) * 1000;

        // Static BPM update
        this.bpm = levelManager.currentBpm;
        this.msPerBeat = 60000 / this.bpm;

        this.updateSyllables();
        this.draw();

        if (this.debugOverlay) {
            this.debugOverlay.innerText = `Pos: ${Math.floor(this.songPosition)}ms\nBPM: ${Math.floor(this.bpm)}\nCombo: ${this.combo}\nMult: ${this.multiplier}x\nTier: ${levelManager.tiers[levelManager.currentTier].name}`;
        }

        requestAnimationFrame(() => this.update());
    }

    updateSyllables() {
        const now = this.songPosition;

        // Auto-play the first syllable exactly on beat
        if (this.pendingFirstSyllables.length > 0) {
            const pendingParams = this.pendingFirstSyllables[0];
            if (now >= pendingParams.targetHitTime) {
                this.pendingFirstSyllables.shift();
                this.handleAutoHit(pendingParams);
            }
        }

        this.activeSyllables = this.activeSyllables.filter(s => {
            if (now > s.targetHitTime + this.windows.GOOD) {
                this.handleMiss(s);
                const card = s.element.querySelector('.syllable-card');
                if (card) card.classList.add('missed');
                const ring = s.element.querySelector('.approach-ring');
                if (ring) ring.style.display = 'none';
                return false;
            }
            return true;
        });

        this.activeSyllables.forEach(s => {
            const remaining = s.targetHitTime - now;
            const ring = s.element.querySelector('.approach-ring');
            if (!ring) return;

            if (remaining < 1500 && remaining > 0) {
                // Shrink ring from 3x down to 1x exactly at 0ms
                const scale = 1 + (remaining / 1500) * 2;
                const opacity = remaining > 1200 ? (1500 - remaining) / 300 : 1;
                ring.style.transform = `translate(-50%, -50%) scale(${scale})`;
                ring.style.opacity = opacity;
                if (s.isStress && remaining < 100) {
                    ring.style.borderColor = 'var(--accent-gold)';
                }
            } else if (remaining <= 0) {
                ring.style.transform = `translate(-50%, -50%) scale(1)`;
                ring.style.opacity = 0;
            } else {
                ring.style.opacity = 0;
            }
        });
    }

    draw() {
        const status = document.getElementById('status-display');
        if (status) {
            status.innerHTML = `<div class="combo-meter">FLOW: ${this.combo} <span>x${this.multiplier}</span></div>`;
        }
    }

    spawnLoop() {
        if (!this.isPlaying) return;
        try {
            this.spawnWord();
        } catch (e) {
            console.warn('Spawn loop error, retrying...', e);
        }
    }

    spawnWord() {
        const pool = levelManager.getFilteredVocabulary();
        if (!pool || pool.length === 0) {
            console.warn('No vocabulary loaded yet.');
            return;
        }

        if (this.currentWordContainer) {
            this.currentWordContainer.remove();
        }

        const wordData = pool[Math.floor(Math.random() * pool.length)];
        const baseTime = this.songPosition + 1500;

        const wordId = Math.random().toString(36).substr(2, 9);
        this.wordTracking[wordId] = {
            total: wordData.syllables.length - 1, // First syllable is free
            perfects: 0,
            isValid: true
        };

        if (wordData.syllables.length === 1) {
            this.wordTracking[wordId].total = 1; // Unless it's a 1-syllable word
        }

        const wordContainer = document.createElement('div');
        wordContainer.className = 'word-container';
        if (wordData.syllables.length <= 3) {
            wordContainer.classList.add('fewer-syllables');
        }
        this.canvas.appendChild(wordContainer);
        this.currentWordContainer = wordContainer;

        wordData.syllables.forEach((syll, index) => {
            const isStress = index === wordData.stress_index;
            const targetHitTime = baseTime + (index * this.msPerBeat);
            this.totalPossible++;

            const element = document.createElement('div');
            element.className = 'syllable-wrapper';
            element.innerHTML = `
                <div class="approach-ring" style="opacity: 0;"></div>
                <div class="syllable-card ${isStress ? 'stress-beat' : ''}">${syll}</div>
            `;
            wordContainer.appendChild(element);

            const syllableObj = {
                syllable: syll,
                isStress,
                targetHitTime,
                element,
                wordId,
                wordData,
                isLastSyllable: index === wordData.syllables.length - 1
            };

            // If it's the first syllable of a multi-syllable word, it's a "free" beat to establish rhythm
            if (index === 0 && wordData.syllables.length > 1) {
                // We pre-decrement the total possible targets so accuracy math doesn't break
                // And schedule it to be auto-played
                if (!this.pendingFirstSyllables) this.pendingFirstSyllables = [];
                this.pendingFirstSyllables.push(syllableObj);
            } else {
                this.totalPossible++;
                this.activeSyllables.push(syllableObj);
            }
        });

        let loopWait = 1500 + (wordData.syllables.length * this.msPerBeat) + 800;
        if (this.nextWordTimeout) clearTimeout(this.nextWordTimeout);
        this.nextWordTimeout = setTimeout(() => this.spawnLoop(), loopWait);
    }

    checkInput() {
        if (!this.isPlaying) return;
        const now = this.songPosition;
        let hit = false;

        if (this.activeSyllables.length > 0) {
            const first = this.activeSyllables[0];
            const diff = Math.abs(now - first.targetHitTime);

            if (diff <= this.windows.GOOD) {
                hit = true;
                const rating = diff <= this.windows.PERFECT ? 'PERFECT' : 'GOOD';
                this.handleHit(rating, diff, first);
                indakAudio.playSyllable(first.isStress);

                const card = first.element.querySelector('.syllable-card');
                if (card) {
                    card.classList.add('hit', rating.toLowerCase());
                }
                const ring = first.element.querySelector('.approach-ring');
                if (ring) {
                    ring.style.display = 'none';
                }

                this.activeSyllables.shift();
                this.spawnParticles(first.element.getBoundingClientRect());
            }
        }
    }

    handleHit(rating, offset, syllableObj) {
        levelManager.handleRating(rating);
        this.combo++;
        this.totalHits += (rating === 'PERFECT' ? 1 : 0.5);

        if (this.combo >= 20) this.multiplier = 4;
        else if (this.combo >= 10) this.multiplier = 2;
        else this.multiplier = 1;

        if (this.combo > this.highScore) {
            this.highScore = this.combo;
            localStorage.setItem('indak_high_flow', this.highScore.toString());
        }

        const tracker = this.wordTracking[syllableObj.wordId];
        if (tracker && tracker.isValid) {
            if (rating === 'PERFECT') tracker.perfects++;
            else tracker.isValid = false; // "GOOD" hit invalidates the "PERFECT" word chain
        }

        if (syllableObj.isLastSyllable) {
            const isPerfect = (tracker && tracker.isValid && tracker.perfects === tracker.total);
            this.showTranslation(syllableObj.wordData, isPerfect);

            if (isPerfect) {
                levelManager.markWordMastered(syllableObj.wordData.word);
            }
            delete this.wordTracking[syllableObj.wordId];
        }

        const feedback = document.createElement('div');
        feedback.className = `hit-feedback ${rating.toLowerCase()}`;
        feedback.innerText = rating;
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 500);
    }

    handleAutoHit(syllableObj) {
        indakAudio.playSyllable(syllableObj.isStress);
        const card = syllableObj.element.querySelector('.syllable-card');
        if (card) {
            card.classList.add('hit', 'perfect');
        }
        const ring = syllableObj.element.querySelector('.approach-ring');
        if (ring) {
            ring.style.display = 'none';
        }
        this.spawnParticles(syllableObj.element.getBoundingClientRect());

        if (syllableObj.isLastSyllable) {
            // Technically impossible under current rules, but safe guarding
            this.showTranslation(syllableObj.wordData, true);
        }
    }

    handleMiss(syllableObj) {
        if (syllableObj && syllableObj.isLastSyllable) {
            this.showTranslation(syllableObj.wordData, false);
        }

        if (syllableObj && syllableObj.wordId) {
            delete this.wordTracking[syllableObj.wordId];
        }
        levelManager.handleRating('MISS');
        this.combo = 0;
        this.multiplier = 1;
        indakAudio.playFail();
        document.body.classList.add('miss-shake');
        setTimeout(() => document.body.classList.remove('miss-shake'), 200);
    }

    showTranslation(wordData, isPerfect) {
        const trans = document.createElement('div');
        trans.className = 'translation-reveal';

        // Definition
        let content = `<div>${wordData.word} = ${wordData.meaning}</div>`;

        if (!isPerfect) {
            const pron = wordData.syllables.map((s, i) =>
                i === wordData.stress_index ? s.toUpperCase() : s.toLowerCase()
            ).join('-');
            content += `<div class="pronunciation-guide">Stress: ${pron}</div>`;
        }

        trans.innerHTML = content;
        this.canvas.appendChild(trans);
        setTimeout(() => trans.remove(), 2000);
    }

    spawnParticles(rect) {
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.className = 'spark';
            p.style.left = `${rect.left + rect.width / 2}px`;
            p.style.top = `${rect.top + rect.height / 2}px`;
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 5;
            p.style.setProperty('--vx', Math.cos(angle) * velocity + 'px');
            p.style.setProperty('--vy', Math.sin(angle) * velocity + 'px');
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 600);
        }
    }

    endGame() {
        this.isPlaying = false;
        const accuracy = ((this.totalHits / this.totalPossible) * 100).toFixed(1);
        const summary = levelManager.getSummary();

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Song Complete!</h2>
                <div class="stats-grid">
                    <div class="stat-item"><span>Accuracy</span><strong>${accuracy}%</strong></div>
                    <div class="stat-item"><span>Highest Flow</span><strong>${this.highScore}</strong></div>
                    <div class="stat-item"><span>End Tier</span><strong>${summary.tier}</strong></div>
                </div>
                <h3>Words Mastered</h3>
                <div class="word-list">${summary.mastered.slice(0, 10).join(', ')}...</div>
                <button id="restart-btn" class="btn-primary">TEKOT ULI (Play Again)</button>
                <button id="share-btn" class="btn-primary" style="background: var(--accent-bamboo)">SHARE TO ILOILO</button>
            </div>
        `;
        summaryEl.classList.remove('hidden');

        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Indak - Ilonggo Rhythm Game',
                    text: `I scored ${this.highScore} Flow and mastered ${summary.mastered.length} Hiligaynon words on Indak!`,
                    url: window.location.href
                });
            }
        });
    }
}

const conductor = new Conductor();
export default conductor;
