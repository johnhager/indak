/**
 * @file sentence_builder.js
 * @description Architecture for the "Sentence Builder" mini-game. 
 * Handles dragging puzzle chunks to form complete Ilonggo sentences correctly (VSO structure).
 */

import { Translator } from './translator.js';

export class SentenceBuilder {
    constructor(containerElement, sentencesData, lessonData = null) {
        this.container = containerElement;
        this.sentences = lessonData ? lessonData.sentences : sentencesData;

        // Normalize curriculum sentence format (strings separated by '|') to SentenceBuilder format (arrays)
        if (this.sentences) {
            this.sentences.forEach(s => {
                if (s.chunks && !s.ilonggo_chunks) {
                    s.ilonggo_chunks = s.chunks.split('|').map(x => x.trim());
                }
                if (s.distractors && !s.trap_words) {
                    s.trap_words = typeof s.distractors === 'string'
                        ? s.distractors.split('|').map(x => x.trim())
                        : s.distractors;
                }
            });
        }

        this.lessonData = lessonData;
        this.currentSentence = null;

        this.draggedChunk = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.ghostChunk = null;
        this.originalParent = null;

        this.gameDirection = 'en-to-il';
        this.timerEnabled = lessonData?.settings?.timer !== false;

        if (this.lessonData) {
            this.setupGameUI();
            this.startRound();
        } else {
            this.showStartScreen();
        }
    }

    stop() {
        if (this.timerEnabled) this.stopTimer();
        this.container.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }

    showStartScreen() {
        const savedDirection = localStorage.getItem('indak_sentence_direction') !== 'false';
        const savedTimer = localStorage.getItem('indak_sentence_timer') !== 'false'; // default true

        this.container.innerHTML = `
            <div class="sentence-builder-start" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top, rgba(255,255,255,0.05) 0%, transparent 60%);">
                <div class="glass-card" style="width: 90%; max-width: 400px; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; text-align: center;">
                    <div style="margin-bottom: 0.5rem;">
                        <h2 style="margin: 0; font-size: 1.8rem; letter-spacing: 1px; color: var(--accent-gold);">Sentence Builder</h2>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 5px;">Master Syntax & Structure</p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
                        <!-- Direction Toggle -->
                        <div class="toggle-group" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <label style="font-size: 0.9rem; font-weight: bold;">EN ➔ IL Mode</label>
                            <label class="switch">
                                <input type="checkbox" id="sb-direction-toggle" ${savedDirection ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                        
                        <!-- Timer Toggle -->
                        <div class="toggle-group" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <label style="font-size: 0.9rem; font-weight: bold;">5s Timer</label>
                            <label class="switch">
                                <input type="checkbox" id="sb-timer-toggle" ${savedTimer ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button id="start-sb-btn" class="btn-primary" style="flex: 2; padding: 1rem; border-radius: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">START</button>
                        <button id="lesson-btn" class="btn-secondary" style="flex: 1; padding: 1rem; border-radius: 16px; font-weight: 800; background: rgba(255, 204, 0, 0.1); border: 1px solid var(--accent-gold); color: var(--accent-gold);">📖 HELP</button>
                    </div>

                    <button id="exit-sb-btn" class="btn-secondary" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem; border-radius: 12px; color: rgba(255,255,255,0.5); font-size: 0.8rem;">BACK TO MENU</button>
                </div>
            </div>
        `;

        const startBtn = document.getElementById('start-sb-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const isDirectionChecked = document.getElementById('sb-direction-toggle').checked;
                const isTimerChecked = document.getElementById('sb-timer-toggle').checked;

                this.gameDirection = isDirectionChecked ? 'en-to-il' : 'il-to-en';
                this.timerEnabled = isTimerChecked;

                localStorage.setItem('indak_sentence_direction', isDirectionChecked);
                localStorage.setItem('indak_sentence_timer', isTimerChecked);

                this.setupGameUI();
                this.startRound();
            });
        }

        const lessonBtn = document.getElementById('lesson-btn');
        if (lessonBtn) {
            lessonBtn.addEventListener('click', () => {
                this.showLessonScreen();
            });
        }

        const exitBtn = document.getElementById('exit-sb-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    showLessonScreen() {
        this.container.innerHTML = `
            <div class="sentence-builder-start" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at top, rgba(255,255,255,0.05) 0%, transparent 60%); padding: 1rem;">
                <div class="glass-card" style="width: 100%; max-width: 450px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; text-align: left; max-height: 85vh; overflow-y: auto;">
                    <h2 style="margin: 0; font-size: 1.5rem; color: var(--accent-gold); text-align: center;">📖 Crash Course</h2>
                    
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <strong style="color: #00ffaa; font-size: 1.1rem;">1. Verb-Subject-Object (VSO)</strong>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 0.85rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
                            <li style="margin-bottom: 5px;">Unlike English (Subject-Verb-Object), Ilonggo usually starts with the <strong>Action</strong>, followed by the <strong>Doer</strong>, and then the <strong>Object</strong>.</li>
                            <li><i style="color: #ffcc00;">Eng: "I ate dinner."</i><br><i style="color: #00ffaa;">Hil: "(Ate) (I) (dinner)." ➔ "Nagkaon ako sang panyapon."</i></li>
                        </ul>
                    </div>

                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <strong style="color: #ffcc00; font-size: 1.1rem;">2. The Linker "Nga"</strong>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 0.85rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
                            <li style="margin-bottom: 5px;">When connecting an Adjective to a Noun, use the linker <strong>nga</strong>.</li>
                            <li><i style="color: #ffcc00;">Eng: "Big dog"</i><br><i style="color: #00ffaa;">Hil: "Daku nga ido"</i></li>
                        </ul>
                    </div>

                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <strong style="color: #ff6b6b; font-size: 1.1rem;">3. Ang vs Sang</strong>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 0.85rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
                            <li><strong>Ang:</strong> Marks the main focus or subject of the sentence.</li>
                            <li><strong>Sang:</strong> Marks the object receiving the action.</li>
                        </ul>
                    </div>

                    <button id="back-to-sb-btn" class="btn-primary" style="margin-top: 5px; padding: 1rem; border-radius: 16px; font-weight: 800;">GOT IT, LET'S BUILD</button>
                </div>
            </div>
        `;

        document.getElementById('back-to-sb-btn').addEventListener('click', () => {
            this.showStartScreen();
        });
    }

    setupGameUI() {

        this.container.innerHTML = `
            <div class="sentence-builder-ui" style="position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding-top: 1rem;">
                
                <div id="sb-time-container" style="position: absolute; top: 1rem; right: 2rem; display: none; z-index: 10;">
                    <div style="font-size: 2rem; font-weight: 800; color: white; text-shadow: 0 0 10px rgba(0,0,0,0.5);"><span id="sb-time">5.0</span>s</div>
                </div>

                <!-- Target English Sentence -->
                <div class="target-english" style="text-align: center; font-size: clamp(1.2rem, 4vw, 1.8rem); font-weight: 800; color: white; text-shadow: 0 4px 10px rgba(0,0,0,0.3); padding: 0 1rem; margin-top: 1.5rem;"></div>
                
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
        // If playing a lesson, cap rounds at sentence count, otherwise default to 10
        if (this.lessonData && this.lessonData.sentences) {
            this.totalRounds = this.lessonData.sentences.length;
        } else {
            this.totalRounds = 10;
        }

        this.currentRound = 0;
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

        const isILToEN = this.gameDirection === 'il-to-en';

        // 1. Pick a unique sentence
        let options = this.sentences.filter(s => !this.roundUsedSentences.has(s.english));
        if (options.length === 0) {
            options = this.sentences; // Fallback if all used
            this.roundUsedSentences.clear();
        }

        const targetIndex = Math.floor(Math.random() * options.length);
        this.currentSentence = options[targetIndex];
        this.roundUsedSentences.add(this.currentSentence.english);

        // 2. Clear current UI
        this.dropZone.innerHTML = '';
        this.wordBank.innerHTML = '';

        if (isILToEN) {
            this.targetEnglish.textContent = this.currentSentence.ilonggo_chunks
                .map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())
                .join(' ') + '.';
        } else {
            this.targetEnglish.textContent = this.currentSentence.english;
        }
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
        const correctChunksText = isILToEN
            ? this.currentSentence.english.replace(/[^a-zA-Z\s]/g, '').split(' ')
            : this.currentSentence.ilonggo_chunks;

        correctChunksText.forEach(() => {
            const slot = document.createElement('div');
            slot.className = 'drop-slot';
            slot.style.minWidth = '80px';
            slot.style.width = 'auto'; // Dynamic width based on content
            slot.style.minHeight = '45px';
            slot.style.border = '2px dashed rgba(255,255,255,0.2)';
            slot.style.borderRadius = '12px';
            slot.style.display = 'flex';
            slot.style.alignItems = 'center';
            slot.style.justifyContent = 'center';
            this.dropZone.appendChild(slot);
        });

        // 3. Mix valid chunks with trap words
        const correctChunks = correctChunksText.map(chunk => ({ text: chunk, isCorrect: true }));
        let trapChunks = [];

        if (!isILToEN && this.currentSentence.trap_words) {
            trapChunks = this.currentSentence.trap_words.map(chunk => ({ text: chunk, isCorrect: false }));
        } else if (isILToEN) {
            // Generate some random English trap words from other sentences
            const otherSentences = this.sentences.filter(s => s.english !== this.currentSentence.english);
            if (otherSentences.length > 0) {
                for (let i = 0; i < 2; i++) {
                    const randomSent = otherSentences[Math.floor(Math.random() * otherSentences.length)];
                    const words = randomSent.english.replace(/[^a-zA-Z\s]/g, '').split(' ');
                    const trapWord = words[Math.floor(Math.random() * words.length)].toLowerCase();
                    trapChunks.push({ text: trapWord, isCorrect: false });
                }
            }
        }

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
            chunkDiv.style.whiteSpace = 'nowrap'; // Prevent text wrapping
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

        if (this.timerEnabled) {
            this.startTimer();
        }
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
        this.draggedChunk.style.transition = 'none'; // CRITICAL: Stop 'ghosting' fly-away effects
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
            this.draggedChunk.style.transition = 'all 0.2s'; // Restore for standard UI motion
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
        chunk.style.width = 'auto'; // Don't force full width, let it center naturally
        chunk.style.height = 'auto';
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

    startTimer() {
        this.stopTimer();
        const timeContainer = this.container.querySelector('#sb-time-container');
        const timeDisplay = this.container.querySelector('#sb-time');

        if (!timeContainer || !timeDisplay) return;

        let timeLeft = 5.0;
        timeContainer.style.display = 'block';
        timeDisplay.textContent = timeLeft.toFixed(1);
        timeDisplay.style.color = 'white';

        this.pulseTimer = setInterval(() => {
            timeLeft -= 0.1;

            if (timeLeft <= 0) {
                this.stopTimer();
                timeDisplay.textContent = '0.0';
                this.handleTimeout();
            } else {
                timeDisplay.textContent = timeLeft.toFixed(1);
                if (timeLeft <= 2) {
                    timeDisplay.style.color = '#ff4d4d'; // Red warning
                }
            }
        }, 100);
    }

    stopTimer() {
        if (this.pulseTimer) {
            clearInterval(this.pulseTimer);
            this.pulseTimer = null;
        }
    }

    handleTimeout() {
        this.totalAttempts++;
        this.roundAttempts++;

        this.cluePanel.style.opacity = '1';
        this.cluePanel.innerHTML = '<div style="color: #ff4d4d; font-weight: bold; font-size: 1.2rem;">TIMEOUT!</div>';

        this.checkBtn.style.display = 'none';
        this.continueBtn.style.display = 'block';
        this.continueBtn.style.background = '#ff4d4d';

        this.wordBank.style.opacity = '0.5';
        this.wordBank.style.pointerEvents = 'none';
        this.dropZone.style.pointerEvents = 'none';

        const isILToEN = this.gameDirection === 'il-to-en';
        const slots = Array.from(this.dropZone.querySelectorAll('.drop-slot'));
        const correctAnswer = isILToEN
            ? this.currentSentence.english.replace(/[^a-zA-Z\s]/g, '').toLowerCase().split(' ')
            : this.currentSentence.ilonggo_chunks.map(c => c.toLowerCase());

        // Flash correct answers in the slots visually
        slots.forEach((slot, i) => {
            slot.textContent = correctAnswer[i];
            slot.style.border = '2px solid rgba(255, 107, 107, 0.5)';
            slot.style.background = 'rgba(255, 107, 107, 0.2)';
            slot.style.color = '#ff4d4d';
            slot.style.fontWeight = 'bold';
        });
    }

    evaluateSyntax() {
        this.stopTimer();

        this.totalAttempts++;
        this.roundAttempts++;

        const isILToEN = this.gameDirection === 'il-to-en';

        const slots = Array.from(this.dropZone.querySelectorAll('.drop-slot'));
        // Use dataset.originalText to sidestep any UI capitalization variations
        const currentAnswer = slots.map(s => Translator.normalize(s.children[0]?.dataset.originalText || ""));
        const correctAnswer = isILToEN
            ? this.currentSentence.english.replace(/[^a-zA-Z\s]/g, '').toLowerCase().split(' ')
            : this.currentSentence.ilonggo_chunks.map(c => Translator.normalize(c));

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

        // Record accuracy for all Ilonggo words in the sentence on first attempt
        if (this.roundAttempts === 1) {
            const ilonggoWords = this.currentSentence.ilonggo_chunks.map(c => Translator.normalize(c));
            ilonggoWords.forEach(word => {
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
