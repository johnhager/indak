/**
 * @file sentence_builder.js
 * @description Architecture for the "Sentence Builder" mini-game. 
 * Handles dragging puzzle chunks to form complete Ilonggo sentences correctly (VSO structure).
 */

export class SentenceBuilder {
    constructor(containerElement, sentencesData) {
        this.container = containerElement;
        this.sentences = sentencesData;
        this.currentSentence = null;

        this.draggedChunk = null;

        this.init();
    }

    stop() {
        this.container.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }

    init() {
        this.container.innerHTML = `
            <div class="sentence-builder-ui" style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding-top: 1rem;">
                <!-- Target English Sentence -->
                <div class="target-english" style="text-align: center; font-size: clamp(1.2rem, 4vw, 1.8rem); font-weight: 800; color: white; text-shadow: 0 4px 10px rgba(0,0,0,0.3); padding: 0 1rem;"></div>
                
                <!-- Feedback Clue Panel -->
                <div class="clue-panel" style="display: flex; gap: 1rem; opacity: 0; transition: opacity 0.3s; background: rgba(0,0,0,0.2); padding: 0.5rem 1.5rem; border-radius: 50px; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase;">
                    <div style="color: #00ffaa;"><span class="perfect-count">0</span> PERFECT</div>
                    <div style="color: #ffcc00;"><span class="misplaced-count">0</span> MISPLACED</div>
                </div>

                <!-- Drop Zone (Slots) -->
                <div class="drop-zone" style="min-height: 100px; width: 95%; max-width: 600px; display: flex; flex-wrap: wrap; gap: 0.8rem; padding: 1.5rem; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                </div>

                <!-- Word Bank -->
                <div class="word-bank" style="width: 95%; max-width: 600px; display: flex; flex-wrap: wrap; gap: 0.8rem; justify-content: center; padding: 1rem; background: rgba(0,0,0,0.1); border-radius: 20px;">
                </div>
                
                <button class="check-button btn-primary" style="padding: 1rem 4rem; border-radius: 50px; font-size: 1.2rem; display: none; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">CHECK SENTENCE</button>
            </div>
        `;

        this.dropZone = this.container.querySelector('.drop-zone');
        this.wordBank = this.container.querySelector('.word-bank');
        this.targetEnglish = this.container.querySelector('.target-english');
        this.checkBtn = this.container.querySelector('.check-button');
        this.cluePanel = this.container.querySelector('.clue-panel');
        this.perfectEl = this.container.querySelector('.perfect-count');
        this.misplacedEl = this.container.querySelector('.misplaced-count');

        this.bindEvents();
    }

    bindEvents() {
        // Native HTML5 Drag & Drop is finicky on mobile
        // Need to add touch polyfill logic or pointer events for "Glassy puzzle pieces"

        // For now, setting up delegation for pointer down/up to move chunks between bank/zone 
        // purely on tap as a fallback, or robust pointer-tracking for drag.

        this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.checkBtn.addEventListener('click', this.evaluateSyntax.bind(this));
    }

    startRound() {
        this.currentRound = 0;
        this.totalRounds = 10;
        this.score = 0;
        this.totalAttempts = 0;
        this.roundUsedSentences = new Set();
        this.loadSentence();
    }

    loadSentence() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }

        if (!this.sentences || this.sentences.length === 0) return;
        this.currentRound++;
        this.roundAttempts = 0; // Reset for the new sentence

        // 1. Pick a unique sentence
        let options = this.sentences.filter(s => !this.roundUsedSentences.has(s.ilonggo));
        if (options.length === 0) {
            options = this.sentences; // Fallback if all used
            this.roundUsedSentences.clear();
        }

        const targetIndex = Math.floor(Math.random() * options.length);
        this.currentSentence = options[targetIndex];
        this.roundUsedSentences.add(this.currentSentence.ilonggo);

        // 2. Clear current UI
        this.dropZone.innerHTML = '';
        this.wordBank.innerHTML = '';
        this.targetEnglish.textContent = this.currentSentence.english;
        this.cluePanel.style.opacity = '0';

        // Create Slots
        this.currentSentence.ilonggo_chunks.forEach(() => {
            const slot = document.createElement('div');
            slot.className = 'drop-slot';
            slot.style.width = '100px';
            slot.style.minHeight = '45px';
            slot.style.border = '2px dashed rgba(255,255,255,0.2)';
            slot.style.borderRadius = '12px';
            slot.style.display = 'flex';
            slot.style.alignItems = 'center';
            slot.style.justifyContent = 'center';
            this.dropZone.appendChild(slot);
        });

        // 3. Mix valid Ilonggo chunks with trap words
        const correctChunks = this.currentSentence.ilonggo_chunks.map(chunk => ({ text: chunk, isCorrect: true }));
        const trapChunks = this.currentSentence.trap_words.map(chunk => ({ text: chunk, isCorrect: false }));

        const allChunks = [...correctChunks, ...trapChunks];

        // Shuffle the array
        for (let i = allChunks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allChunks[i], allChunks[j]] = [allChunks[j], allChunks[i]];
        }

        // 4. Render chunks into .word-bank via document.createElement
        allChunks.forEach(chunkData => {
            const chunkDiv = document.createElement('div');
            chunkDiv.className = 'word-chunk';
            chunkDiv.textContent = chunkData.text;
            chunkDiv.dataset.isCorrect = chunkData.isCorrect;

            // Stylish glassmorphism styling
            chunkDiv.style.padding = '0.8rem 1.5rem';
            chunkDiv.style.background = 'rgba(255, 255, 255, 0.15)';
            chunkDiv.style.backdropFilter = 'blur(10px)';
            chunkDiv.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            chunkDiv.style.borderRadius = '12px';
            chunkDiv.style.color = 'white';
            chunkDiv.style.fontSize = 'clamp(1rem, 3vw, 1.2rem)';
            chunkDiv.style.cursor = 'pointer';
            chunkDiv.style.userSelect = 'none';
            chunkDiv.style.touchAction = 'none';
            chunkDiv.style.transition = 'all 0.2s';
            chunkDiv.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';

            // Optional hover effect (will mostly trigger on desktop, mobile relies on taps)
            chunkDiv.addEventListener('pointerenter', () => {
                chunkDiv.style.background = 'rgba(255, 255, 255, 0.25)';
            });
            chunkDiv.addEventListener('pointerleave', () => {
                chunkDiv.style.background = 'rgba(255, 255, 255, 0.15)';
            });

            this.wordBank.appendChild(chunkDiv);
        });

        this.checkIfReady();
    }

    onPointerDown(e) {
        const target = e.target.closest('.word-chunk');
        if (!target) return;

        if (target.parentElement === this.wordBank) {
            // Find first empty slot
            const slots = Array.from(this.dropZone.querySelectorAll('.drop-slot'));
            const emptySlot = slots.find(s => s.children.length === 0);
            if (emptySlot) {
                emptySlot.appendChild(target);
                target.style.width = '100%';
                target.style.height = '100%';
                emptySlot.style.borderStyle = 'solid';
                emptySlot.style.borderColor = 'rgba(255,255,255,0.4)';
            }
        } else if (target.parentElement.classList.contains('drop-slot')) {
            const slot = target.parentElement;
            this.wordBank.appendChild(target);
            target.style.width = 'auto';
            target.style.height = 'auto';
            slot.style.borderStyle = 'dashed';
            slot.style.borderColor = 'rgba(255,255,255,0.2)';
        }

        this.checkIfReady();
    }

    checkIfReady() {
        const slots = Array.from(this.dropZone.querySelectorAll('.drop-slot'));
        const fullSlots = slots.filter(s => s.children.length > 0);
        if (fullSlots.length === slots.length) {
            this.checkBtn.style.display = 'block';
        } else {
            this.checkBtn.style.display = 'none';
        }
    }

    evaluateSyntax() {
        this.totalAttempts++;
        this.roundAttempts++;

        const slots = Array.from(this.dropZone.querySelectorAll('.drop-slot'));
        const currentAnswer = slots.map(s => s.children[0]?.textContent || "");
        const correctAnswer = this.currentSentence.ilonggo_chunks;

        // Mastermind Logic
        let perfectMatches = 0;
        let misplacedMatches = 0;

        const tempCorrect = [...correctAnswer];
        const tempAnswer = [...currentAnswer];

        // 1. Check for perfect matches (correct word, correct spot)
        for (let i = 0; i < tempAnswer.length; i++) {
            if (tempAnswer[i] === tempCorrect[i]) {
                perfectMatches++;
                tempAnswer[i] = null; // Mark as handled
                tempCorrect[i] = null;
            }
        }

        // 2. Check for misplaced matches (correct word, wrong spot)
        for (let i = 0; i < tempAnswer.length; i++) {
            if (tempAnswer[i] !== null) {
                const foundIdx = tempCorrect.indexOf(tempAnswer[i]);
                if (foundIdx !== -1) {
                    misplacedMatches++;
                    tempCorrect[foundIdx] = null; // Consume the word from pool
                }
            }
        }

        const isCorrect = perfectMatches === correctAnswer.length;

        // Record accuracy for all words in the sentence on first attempt
        if (this.roundAttempts === 1) {
            correctAnswer.forEach(word => {
                levelManager.markWordMastered(word, 'meaning', isCorrect);
            });
        }

        if (isCorrect) {
            if (this.roundAttempts === 1) {
                this.score++;
            }
            // Glow green, proceed
            this.dropZone.style.borderColor = '#00ffaa';
            this.dropZone.style.background = 'rgba(0, 255, 170, 0.1)';

            setTimeout(() => {
                this.dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
                this.dropZone.style.background = 'rgba(255,255,255,0.03)';
                this.loadSentence();
            }, 1200);
        } else {
            // Update Clue Panel
            this.perfectEl.textContent = perfectMatches;
            this.misplacedEl.textContent = misplacedMatches;
            this.cluePanel.style.opacity = '1';

            // Error Shake and Feedback
            this.dropZone.classList.add('shake');
            this.dropZone.style.borderColor = '#ff4d4d';

            setTimeout(() => {
                this.dropZone.classList.remove('shake');
                this.dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
            }, 600);
        }
    }

    endGame() {
        this.container.innerHTML = '';
        const accuracy = this.totalRounds === 0 ? 0 : Math.round((this.score / this.totalRounds) * 100);

        let levelUpMessage = '';
        if (accuracy >= 80) {
            const leveled = levelManager.advanceTier();
            if (leveled) levelUpMessage = `<div style="color: var(--accent-gold); font-weight: 800; margin-bottom: 1rem; animation: pulse 2s infinite;">LEVEL UP! ACCESSING COMPLEX SYNTAX...</div>`;
        }

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Builder Complete!</h2>
                ${levelUpMessage}
                <div class="stats-grid">
                    <div class="stat-item"><span>Success Rate</span><strong>${accuracy}%</strong></div>
                    <div class="stat-item"><span>Solved</span><strong>${this.score}/${this.totalRounds}</strong></div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem;">
                    <button id="builder-restart-btn" class="btn-primary">TEKOT ULI (Play Again)</button>
                    <button id="builder-exit-btn" class="btn-secondary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 12px; color: white;">BACK TO MENU</button>
                </div>
            </div>
        `;
        summaryEl.classList.remove('hidden');

        document.getElementById('builder-restart-btn').addEventListener('click', () => {
            summaryEl.classList.add('hidden');
            this.init();
            this.startRound();
        });

        document.getElementById('builder-exit-btn').addEventListener('click', () => {
            location.reload();
        });
    }
}
