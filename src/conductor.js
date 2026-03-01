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
        this.pendingFirstSyllables = [];
        this.combo = 0;
        this.sessionHighFlow = 0;
        this.multiplier = 1;
        this.totalHits = 0;
        this.totalPossible = 0;
        this.gameDuration = 120000; // 2 minutes

        this.windows = { PERFECT: 50, GOOD: 100 };
        this.canvas = document.getElementById('game-stage');
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
        this.topScores = JSON.parse(localStorage.getItem('indak_top_flows') || '[]');
        const oldHigh = parseInt(localStorage.getItem('indak_high_flow') || '0');
        if (this.topScores.length === 0 && oldHigh > 0) {
            this.topScores.push(oldHigh);
        }
        while (this.topScores.length < 3) {
            if (this.topScores.length >= 3) break;
            this.topScores.push(0);
        }
    }

    createDebugOverlay() {
        if (document.getElementById('debug-overlay')) return;
        this.debugOverlay = document.createElement('div');
        this.debugOverlay.id = 'debug-overlay';
        this.debugOverlay.style.cssText = `
            position: absolute; top: 10px; right: 10px; 
            background: rgba(0,0,0,0.5); color: #0f0; 
            font-family: monospace; padding: 5px; font-size: 10px;
            pointer-events: none; z-index: 1000;
        `;
        document.body.appendChild(this.debugOverlay);
    }

    start() {
        this.startTime = indakAudio.ctx.currentTime;
        this.lastFrameTime = performance.now();
        this.isPlaying = true;
        this.combo = 0;
        this.sessionHighFlow = 0;
        this.multiplier = 1;
        this.totalHits = 0;
        this.totalPossible = 0;
        this.activeSyllables = [];
        this.pendingFirstSyllables = [];
        this.queuedSyllables = [];
        this.recentWords = []; // Recent word history for spawn filter
        this.update();
        this.spawnWord();
        if (this.debugOverlay) this.debugOverlay.style.display = 'block';
    }

    stop() {
        this.isPlaying = false;
        if (this.currentWordContainer) this.currentWordContainer.remove();
        if (this.debugOverlay) this.debugOverlay.style.display = 'none';
        const status = document.getElementById('status-display');
        if (status) status.innerHTML = '';
        const summaryEl = document.getElementById('summary-screen');
        if (summaryEl) summaryEl.classList.add('hidden');
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

    spawnWord() {
        if (!this.isPlaying) return;
        if (this.songPosition >= this.gameDuration) {
            this.endGame();
            return;
        }

        const pool = levelManager.getFilteredVocabulary('rhythm', this.recentWords);
        if (!pool || pool.length === 0) {
            console.warn('No vocabulary loaded yet.');
            return;
        }

        if (this.currentWordContainer) {
            this.currentWordContainer.remove();
        }

        const wordData = pool[Math.floor(Math.random() * pool.length)];

        // Mantain a rolling history of 10 words to avoid duplicates
        this.recentWords.push(wordData.word);
        if (this.recentWords.length > 10) this.recentWords.shift();
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

        this.queuedSyllables = [];
        this.pendingFirstSyllables = [];

        wordData.syllables.forEach((syll, index) => {
            const isStress = index === wordData.stress_index;

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
                targetHitTime: 0,
                element,
                wordId,
                wordData,
                index,
                isLastSyllable: index === wordData.syllables.length - 1
            };

            // First syllable waits for user to tap to start the rhythm sequence
            if (index === 0) {
                syllableObj.element.querySelector('.syllable-card').classList.add('waiting-pulse');
                this.pendingFirstSyllables.push(syllableObj);
            } else {
                this.queuedSyllables.push(syllableObj);
            }
        });
    }

    checkInput() {
        if (!this.isPlaying) return;
        const now = this.songPosition;

        // User tapped the first syllable! Start the rhythm.
        if (this.pendingFirstSyllables.length > 0) {
            const first = this.pendingFirstSyllables.shift();

            const card = first.element.querySelector('.syllable-card');
            if (card) card.classList.remove('waiting-pulse');

            this.handleAutoHit(first);

            // 1. Pre-calculate the rhythm map for the word relative to this tap
            let cumulativeOffset = 0;
            // Strip spaces for accurate char-to-syllable mapping
            const fullWord = first.wordData.word.replace(/\s+/g, '');

            this.queuedSyllables.forEach((q, i) => {
                // Base timing
                let skipOffset = 0;

                // 2. Glottal Stop Detection (Hiccup)
                // If there is a dash in the word string, find where it is relative to syllables
                // This is a heuristic: check if the word has a dash and if we are crossing it
                if (fullWord.includes('-')) {
                    const parts = fullWord.split('-');
                    // If the current syllable (q.index) matches the start of a post-dash part
                    let charPos = 0;
                    for (let p = 0; p < parts.length - 1; p++) {
                        charPos += parts[p].length;
                        // Find which syllable index the dash occurs BEFORE
                        // We estimate syllable boundaries based on the string parts
                        const syllableBeforeDash = first.wordData.syllables.slice(0, q.index).join('').length;
                        if (syllableBeforeDash === charPos) {
                            skipOffset += 65; // The "Hiligaynon Bounce" gap
                            break;
                        }
                    }
                }

                // 3. Stress Anticipation (Punch)
                // Stressed syllables often feel more natural if hit slightly 'ahead' of a perfect grid
                if (q.isStress) {
                    skipOffset -= 15;
                }

                cumulativeOffset += skipOffset;

                q.targetHitTime = now + (q.index * this.msPerBeat) + cumulativeOffset;
                this.activeSyllables.push(q);
                this.totalPossible++;
            });
            this.queuedSyllables = [];
            return;
        }

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
        if (this.combo > this.sessionHighFlow) this.sessionHighFlow = this.combo;

        this.totalHits += (rating === 'PERFECT' ? 1 : 0.5);

        if (this.combo >= 20) this.multiplier = 4;
        else if (this.combo >= 10) this.multiplier = 2;
        else this.multiplier = 1;

        const tracker = this.wordTracking[syllableObj.wordId];
        if (tracker && tracker.isValid) {
            if (rating === 'PERFECT') tracker.perfects++;
            else tracker.isValid = false; // "GOOD" hit invalidates the "PERFECT" word chain
        }

        if (syllableObj.isLastSyllable) {
            const isPerfect = (tracker && tracker.isValid && tracker.perfects === tracker.total);
            this.showTranslation(syllableObj.wordData, isPerfect);

            if (isPerfect) {
                levelManager.markWordMastered(syllableObj.wordData.word, 'rhythm');
            }
            delete this.wordTracking[syllableObj.wordId];
            setTimeout(() => { if (this.isPlaying) this.spawnWord(); }, 1500);
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
            this.showTranslation(syllableObj.wordData, true);
            setTimeout(() => { if (this.isPlaying) this.spawnWord(); }, 1500);
        }
    }

    handleMiss(syllableObj) {
        if (syllableObj && syllableObj.isLastSyllable) {
            this.showTranslation(syllableObj.wordData, false);
            setTimeout(() => { if (this.isPlaying) this.spawnWord(); }, 1500);
        }

        if (syllableObj && syllableObj.wordId) {
            delete this.wordTracking[syllableObj.wordId];
        }
        levelManager.handleRating('MISS');
        this.updateTopScores(this.combo);
        this.combo = 0;
        this.multiplier = 1;
        indakAudio.playFail();
        document.body.classList.add('miss-shake');
        setTimeout(() => document.body.classList.remove('miss-shake'), 200);
    }

    showTranslation(wordData, isPerfect) {
        if (!this.isPlaying) return;
        const trans = document.createElement('div');
        trans.className = 'translation-reveal';
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

    updateTopScores(score) {
        if (score === 0) return;
        this.topScores.push(score);
        this.topScores.sort((a, b) => b - a);
        this.topScores = this.topScores.slice(0, 3);
        localStorage.setItem('indak_top_flows', JSON.stringify(this.topScores));
    }

    endGame() {
        this.isPlaying = false;
        this.updateTopScores(this.sessionHighFlow); // Use session max for top scores
        const accuracy = ((this.totalHits / this.totalPossible) * 100).toFixed(1);
        const summary = levelManager.getSummary();

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Session Complete!</h2>
                <div class="stats-grid">
                    <div class="stat-item"><span>Accuracy</span><strong>${accuracy}%</strong></div>
                    <div class="stat-item"><span>Session Best</span><strong>${this.sessionHighFlow}</strong></div>
                    <div class="stat-item"><span>End Tier</span><strong>${summary.tier}</strong></div>
                </div>
                <h3>All-Time Top 3 Flows</h3>
                <div class="word-list">
                    1st: ${this.topScores[0] || 0} hits<br>
                    2nd: ${this.topScores[1] || 0} hits<br>
                    3rd: ${this.topScores[2] || 0} hits
                </div>
                <h3>Words Mastered</h3>
                <div class="word-list">${summary.mastered.slice(0, 10).join(', ')}...</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button id="restart-btn" class="btn-primary">TEKOT ULI (Play Again)</button>
                    <button id="share-btn" class="btn-primary" style="background: var(--accent-bamboo)">SHARE RESULTS</button>
                    <button id="exit-summary-btn" class="btn-secondary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 10px; border-radius: 12px; color: white;">BACK TO MENU</button>
                </div>
            </div>
        `;
        summaryEl.classList.remove('hidden');

        document.getElementById('restart-btn').addEventListener('click', () => {
            summaryEl.classList.add('hidden');
            this.start();
        });

        document.getElementById('exit-summary-btn').addEventListener('click', () => {
            location.reload();
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Indak - Ilonggo Rhythm Game',
                    text: `I hit a Session Best Flow of ${this.sessionHighFlow} and mastered ${summary.mastered.length} Hiligaynon words on Indak!`,
                    url: window.location.href
                });
            }
        });
    }
}

const conductor = new Conductor();
export default conductor;
