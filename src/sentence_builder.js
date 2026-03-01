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
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.ghostChunk = null;
        this.originalParent = null;

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
                <button class="continue-button btn-primary" style="padding: 1rem 4rem; border-radius: 50px; font-size: 1.2rem; display: none; background: var(--accent-bamboo); box-shadow: 0 10px 30px rgba(0,0,0,0.3);">CONTINUE</button>
            </div>
        `;

        this.dropZone = this.container.querySelector('.drop-zone');
        this.wordBank = this.container.querySelector('.word-bank');
        this.targetEnglish = this.container.querySelector('.target-english');
        this.checkBtn = this.container.querySelector('.check-button');
        this.continueBtn = this.container.querySelector('.continue-button');
        this.cluePanel = this.container.querySelector('.clue-panel');
        this.perfectEl = this.container.querySelector('.perfect-count');
        this.misplacedEl = this.container.querySelector('.misplaced-count');

        this.bindEvents();
    }

    bindEvents() {
        this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));

        this.checkBtn.addEventListener('click', this.evaluateSyntax.bind(this));
        this.continueBtn.addEventListener('click', () => {
            this.loadSentence();
        });
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
        this.cluePanel.innerHTML = `
            <div style="color: #00ffaa;"><span class="perfect-count">0</span> PERFECT</div>
            <div style="color: #ffcc00;"><span class="misplaced-count">0</span> MISPLACED</div>
        `;
        this.perfectEl = this.container.querySelector('.perfect-count');
        this.misplacedEl = this.container.querySelector('.misplaced-count');
        this.cluePanel.style.opacity = '0';
        this.continueBtn.style.display = 'none';
        this.checkBtn.textContent = 'CHECK SENTENCE';
        this.dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
        this.dropZone.style.background = 'rgba(255,255,255,0.03)';

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
            // Show all bank words in lowercase to remove capitalization clues
            chunkDiv.textContent = chunkData.text.toLowerCase();
            chunkDiv.dataset.originalText = chunkData.text; // Store original for comparison
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
        if (this.continueBtn.style.display === 'block') return;
        const target = e.target.closest('.word-chunk');
        if (!target) return;

        this.draggedChunk = target;
        this.isDragging = false; // Start as a potential tap
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.originalParent = target.parentElement;

        // Prevent default touch behaviors
        if (e.pointerType === 'touch') {
            e.preventDefault();
        }
    }

    onPointerMove(e) {
        if (!this.draggedChunk) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        // Threshold to differentiate tap from drag
        if (!this.isDragging && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
            this.isDragging = true;
            this.startDrag(e);
        }

        if (this.isDragging) {
            this.updateDrag(e);
        }
    }

    startDrag(e) {
        // Capture initial dimensions to prevent 'exploding' to 100% screen width when position fixed
        const rect = this.draggedChunk.getBoundingClientRect();
        this.draggedChunk.style.width = `${rect.width}px`;
        this.draggedChunk.style.height = `${rect.height}px`;

        // Visual feedback when starting drag
        this.draggedChunk.style.zIndex = '1000';
        this.draggedChunk.style.pointerEvents = 'none';
        this.draggedChunk.style.position = 'fixed';
        this.draggedChunk.style.transform = 'scale(1.1) rotate(2deg)';
        this.draggedChunk.style.opacity = '0.8';
        this.updateDrag(e);
    }

    updateDrag(e) {
        const rect = this.draggedChunk.getBoundingClientRect();
        this.draggedChunk.style.left = `${e.clientX - rect.width / 2}px`;
        this.draggedChunk.style.top = `${e.clientY - rect.height / 2}px`;

        // Highlight potential drop targets
        this.clearHighlights();
        const hoveredSlot = this.getHoveredElement(e, '.drop-slot');
        if (hoveredSlot) {
            hoveredSlot.style.borderStyle = 'solid';
            hoveredSlot.style.borderColor = 'var(--accent-gold)';
            hoveredSlot.style.background = 'rgba(255, 217, 61, 0.1)';
        }
    }

    onPointerUp(e) {
        if (!this.draggedChunk) return;

        if (!this.isDragging) {
            // It was a tap
            this.handleTap();
        } else {
            // It was a drag
            this.handleDrop(e);
        }

        // Clean up
        if (this.draggedChunk) {
            this.draggedChunk.style.zIndex = '';
            this.draggedChunk.style.pointerEvents = '';
            this.draggedChunk.style.position = '';
            this.draggedChunk.style.left = '';
            this.draggedChunk.style.top = '';
            this.draggedChunk.style.width = '';
            this.draggedChunk.style.height = '';
            this.draggedChunk.style.transform = '';
            this.draggedChunk.style.opacity = '';
        }

        this.draggedChunk = null;
        this.isDragging = false;
        this.clearHighlights();
        this.refreshCapitalization();
        this.checkIfReady();
    }

    handleTap() {
        const target = this.draggedChunk;
        if (target.parentElement === this.wordBank) {
            const slots = Array.from(this.dropZone.querySelectorAll('.drop-slot'));
            const emptySlot = slots.find(s => s.children.length === 0);
            if (emptySlot) {
                emptySlot.appendChild(target);
                this.styleChunkInSlot(target, emptySlot);
            }
        } else if (target.parentElement.classList.contains('drop-slot')) {
            const slot = target.parentElement;
            this.wordBank.appendChild(target);
            this.styleChunkInBank(target, slot);
        }
    }

    handleDrop(e) {
        const dropTarget = this.getHoveredElement(e, '.drop-slot, .word-bank');
        const chunk = this.draggedChunk;

        if (!dropTarget) {
            // Return to original parent
            this.originalParent.appendChild(chunk);
            return;
        }

        if (dropTarget.classList.contains('drop-slot')) {
            const existingChunk = dropTarget.querySelector('.word-chunk');
            if (existingChunk) {
                // SWAP
                this.originalParent.appendChild(existingChunk);
                dropTarget.appendChild(chunk);

                // Refresh styles for both
                this.styleChunkInSlot(chunk, dropTarget);
                if (this.originalParent.classList.contains('drop-slot')) {
                    this.styleChunkInSlot(existingChunk, this.originalParent);
                } else {
                    this.styleChunkInBank(existingChunk, this.originalParent);
                }
            } else {
                // Move to empty slot
                dropTarget.appendChild(chunk);
                this.styleChunkInSlot(chunk, dropTarget);
            }
        } else {
            // Move back to bank
            this.wordBank.appendChild(chunk);
            this.styleChunkInBank(chunk, dropTarget);
        }
    }

    styleChunkInSlot(chunk, slot) {
        chunk.style.width = '100%';
        chunk.style.height = '100%';
        // Hide the slot's border/background when it is occupied
        slot.style.borderStyle = 'none';
        slot.style.background = 'transparent';
    }

    styleChunkInBank(chunk, slotOrBank) {
        chunk.style.width = 'auto';
        chunk.style.height = 'auto';
        if (slotOrBank.classList.contains('drop-slot')) {
            slotOrBank.style.borderStyle = 'dashed';
            slotOrBank.style.borderColor = 'rgba(255,255,255,0.2)';
        }
    }

    getHoveredElement(e, selectors) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        return elements.find(el => el.matches(selectors));
    }

    clearHighlights() {
        this.dropZone.querySelectorAll('.drop-slot').forEach(s => {
            if (s.children.length === 0) {
                // Return to original dashed look when empty
                s.style.borderStyle = 'dashed';
                s.style.borderColor = 'rgba(255,255,255,0.2)';
                s.style.background = 'transparent';
            } else {
                // Invisible when occupied
                s.style.borderStyle = 'none';
                s.style.background = 'transparent';
            }
        });
    }

    refreshCapitalization() {
        const slots = Array.from(this.dropZone.querySelectorAll('.drop-slot'));
        slots.forEach((slot, index) => {
            const chunk = slot.querySelector('.word-chunk');
            if (chunk) {
                const text = chunk.textContent;
                if (index === 0) {
                    chunk.textContent = text.charAt(0).toUpperCase() + text.slice(1);
                } else {
                    chunk.textContent = text.toLowerCase();
                }
            }
        });

        // Ensure all bank words are lowercase
        const bankChunks = Array.from(this.wordBank.querySelectorAll('.word-chunk'));
        bankChunks.forEach(chunk => {
            chunk.textContent = chunk.textContent.toLowerCase();
        });
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
        const currentAnswer = slots.map(s => s.children[0]?.textContent.toLowerCase() || "");
        const correctAnswer = this.currentSentence.ilonggo_chunks.map(c => c.toLowerCase());

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
            // Glow green
            this.dropZone.style.borderColor = '#00ffaa';
            this.dropZone.style.background = 'rgba(0, 255, 170, 0.1)';

            // Show "CORRECT!" in clue panel
            this.cluePanel.innerHTML = `<div style="color: #00ffaa; font-weight: 800; font-size: 1rem; letter-spacing: 2px;">✨ CORRECT! ✨</div>`;
            this.cluePanel.style.opacity = '1';

            // Swap buttons
            this.checkBtn.style.display = 'none';
            this.continueBtn.style.display = 'block';
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
