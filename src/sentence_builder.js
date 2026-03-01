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
            <div class="sentence-builder-ui" style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2rem;">
                <!-- Target English Sentence -->
                <div class="target-english" style="text-align: center; font-size: clamp(1.2rem, 4vw, 2rem); font-weight: bold; color: var(--text-main, white);"></div>
                
                <!-- Drop Zone -->
                <div class="drop-zone" style="min-height: 80px; width: 90%; max-width: 500px; border: 2px dashed rgba(255,255,255,0.3); border-radius: 12px; display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 1rem; align-items: center; justify-content: center;">
                </div>

                <!-- Word Bank -->
                <div class="word-bank" style="width: 90%; max-width: 500px; display: flex; flex-wrap: wrap; gap: clamp(0.5rem, 2vw, 1rem); justify-content: center; padding: 1rem;">
                </div>
                
                <button class="check-button" style="padding: 1rem 3rem; border-radius: 50px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); color: white; border: 1px solid rgba(255,255,255,0.2); font-size: 1.2rem; display: none;">Check</button>
            </div>
        `;

        this.dropZone = this.container.querySelector('.drop-zone');
        this.wordBank = this.container.querySelector('.word-bank');
        this.targetEnglish = this.container.querySelector('.target-english');
        this.checkBtn = this.container.querySelector('.check-button');

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
        this.totalRounds = 5;
        this.currentRound = 0;
        this.score = 0;
        this.loadSentence();
    }

    loadSentence() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }

        if (!this.sentences || this.sentences.length === 0) return;
        this.currentRound++;

        // 1. Pick a random sentence
        const targetIndex = Math.floor(Math.random() * this.sentences.length);
        this.currentSentence = this.sentences[targetIndex];

        // 2. Clear current UI
        this.dropZone.innerHTML = '';
        this.wordBank.innerHTML = '';
        this.targetEnglish.textContent = this.currentSentence.english;

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
        // Logic to pick up a word chunk and move it to the drop-zone
        const target = e.target.closest('.word-chunk');
        if (!target) return;

        // Simple Tap-to-move logic (highly effective on mobile vs complex drag polyfills)
        // If in bank -> move to drop zone
        // If in drop zone -> move to bank

        if (target.parentElement === this.wordBank) {
            this.dropZone.appendChild(target);
            // Play Audio snap
        } else if (target.parentElement === this.dropZone) {
            this.wordBank.appendChild(target);
            // Play Audio reverse snap
        }

        this.checkIfReady();
    }

    checkIfReady() {
        // Reveal 'Check' button if Drop Zone has chunks
        if (this.dropZone.children.length > 0) {
            this.checkBtn.style.display = 'block';
        } else {
            this.checkBtn.style.display = 'none';
        }
    }

    evaluateSyntax() {
        // Read DOM order of chunks in this.dropZone
        const dropZoneChunks = Array.from(this.dropZone.querySelectorAll('.word-chunk'));
        const currentAnswer = dropZoneChunks.map(div => div.textContent);
        const correctAnswer = this.currentSentence.ilonggo_chunks;

        // Compare against correct VSO string
        let isCorrect = true;
        if (currentAnswer.length !== correctAnswer.length) {
            isCorrect = false;
        } else {
            for (let i = 0; i < correctAnswer.length; i++) {
                if (currentAnswer[i] !== correctAnswer[i]) {
                    isCorrect = false;
                    break;
                }
            }
        }

        if (isCorrect) {
            this.score++;
            // Glow green, proceed
            this.dropZone.style.border = '2px solid rgba(0, 255, 100, 0.8)';
            this.dropZone.style.boxShadow = '0 0 20px rgba(0, 255, 100, 0.5)';
            // play 'perfect' synth (AudioManager call would go here)

            setTimeout(() => {
                this.dropZone.style.border = '2px dashed rgba(255,255,255,0.3)';
                this.dropZone.style.boxShadow = 'none';
                this.loadSentence();
            }, 1000);
        } else {
            // Apply CSS shake class, red tint, and reset
            this.dropZone.style.border = '2px solid rgba(255, 0, 0, 0.8)';
            this.dropZone.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            // play 'error' synth (AudioManager call would go here)

            setTimeout(() => {
                this.dropZone.style.border = '2px dashed rgba(255,255,255,0.3)';
                this.dropZone.style.backgroundColor = 'transparent';

                // Reset pieces back to bank
                dropZoneChunks.forEach(chunk => {
                    this.wordBank.appendChild(chunk);
                });
                this.checkIfReady();
            }, 600);
        }
    }

    endGame() {
        this.container.innerHTML = '';
        const accuracy = Math.round((this.score / this.totalRounds) * 100);

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Builder Complete!</h2>
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
