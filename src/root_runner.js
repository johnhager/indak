import levelManager from './level_manager.js';

/**
 * @file root_runner.js
 * @description Logic for the "Root Runner" morphology/affix mini-game. 
 * Players classify words as "Valid" or "Nonsense" based on a central Root word.
 */
export class RootRunner {
    constructor(containerElement, morphologyData) {
        this.container = containerElement;
        this.data = morphologyData;

        this.gameActive = false;
        this.score = 0;
        this.totalAttempts = 0;
        this.currentRound = 0;
        this.totalRounds = 10;

        this.activeWords = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 2000; // ms
        this.speed = 1.5;

        this.lessons = [
            {
                title: "Root Words",
                content: "Most Hiligaynon words come from a <b>Root</b> (e.g., KAON - Eat).",
                examples: "Roots are the heart of the language."
            },
            {
                title: "The Affix List",
                content: "These are the valid parts you'll see in the game:<br><b>Prefixes:</b> Naga-, Gin-, Ma-, Nag-, Ika-<br><b>Suffixes:</b> -on, -an, -onon",
                examples: "<i>Nagakaon</i> (Eating)<br><i>Daganon</i> (To be run)"
            },
            {
                title: "Root Runner",
                content: "Swipe <b>RIGHT</b> for valid conjugations, or <b>LEFT</b> for nonsense.",
                examples: "Success = Blue/Glow ✔ | Miss = Purple/Shake ✖"
            }
        ];

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="root-runner-ui" style="position:relative; width: 100%; height: 100%; overflow: hidden; user-select: none;">
                <!-- Lesson Overlay -->
                <div class="lesson-overlay" style="position: absolute; inset:0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 200; display: none; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; text-align: center;">
                    <div class="glass-card" style="width: 100%; max-width: 400px; padding: 2.5rem;">
                        <span style="color: var(--accent-gold); font-size: 0.8rem; letter-spacing: 3px; text-transform: uppercase;">Morphology Lesson</span>
                        <h2 class="lesson-title" style="margin: 1rem 0; font-size: 2rem; color: white;"></h2>
                        <p class="lesson-text" style="font-size: 1.1rem; line-height: 1.6; color: #ddd; margin-bottom: 2rem;"></p>
                        <div class="lesson-examples" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; font-family: monospace; color: var(--accent-gold); margin-bottom: 2rem;"></div>
                        <button class="lesson-next-btn btn-primary" style="width: 100%;">START TRAINING</button>
                    </div>
                </div>

                <!-- Game Layer -->
                <div class="game-layer" style="width:100%; height:100%; position:relative;">
                    <!-- Central Orb -->
                    <div class="central-orb-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; text-align: center;">
                        <div class="orb" style="width: 140px; height: 140px; border-radius: 50%; background: radial-gradient(circle, rgba(255,217,61,0.3) 0%, rgba(255,217,61,0) 70%); border: 2px solid rgba(255,217,61,0.5); display: flex; flex-direction: column; align-items:center; justify-content:center; box-shadow: 0 0 30px rgba(255,217,61,0.2); animation: pulse 3s infinite ease-in-out;">
                            <div id="orb-symbol" style="position: absolute; top: -20px; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; color: white; opacity: 0; transform: scale(0.5); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 20;"></div>
                            <strong id="root-display" style="color: var(--accent-gold); font-size: 1.4rem; letter-spacing: 2px; text-transform: uppercase;">ROOT</strong>
                        </div>
                        <div id="root-meaning" style="color: white; opacity: 0.6; font-size: 0.8rem; margin-top: 10px;">(meaning)</div>
                    </div>

                    <!-- Drifting Words Container -->
                    <div id="word-stream" style="width:100%; height:100%; position:absolute;"></div>
                </div>

                <!-- Hud -->
                <div style="position:absolute; bottom: 20px; width:100%; text-align:center; color:white; opacity: 0.5; font-size: 0.8rem;">
                    SWIPE LEFT (Nonsense) | SWIPE RIGHT (Valid)
                </div>
            </div>
        `;

        this.lessonOverlay = this.container.querySelector('.lesson-overlay');
        this.wordStream = this.container.querySelector('#word-stream');
        this.rootDisplay = this.container.querySelector('#root-display');
        this.rootMeaning = this.container.querySelector('#root-meaning');

        // Styles for animation
        if (!document.getElementById('root-runner-styles')) {
            const style = document.createElement('style');
            style.id = 'root-runner-styles';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                }
                .runner-word {
                    position: absolute;
                    padding: 12px 24px;
                    background: rgba(255,255,255,0.15);
                    backdrop-filter: blur(15px);
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 30px;
                    color: white;
                    font-weight: 800;
                    pointer-events: auto;
                    cursor: grab;
                    white-space: nowrap;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    touch-action: none;
                }
                .runner-word.correct-merge {
                    transform: scale(0) !important;
                    opacity: 0 !important;
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
                }
                .runner-word.shatter {
                    transform: scale(2) rotate(20deg) !important;
                    opacity: 0 !important;
                    filter: blur(20px) !important;
                    transition: all 0.5s ease-out !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    startRound() {
        this.container.style.touchAction = 'none';
        this.currentRound = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.showLesson(0);
    }

    showLesson(index) {
        if (index >= this.lessons.length) {
            this.lessonOverlay.style.display = 'none';
            this.startGame();
            return;
        }

        const lesson = this.lessons[index];
        this.lessonOverlay.querySelector('.lesson-title').textContent = lesson.title;
        this.lessonOverlay.querySelector('.lesson-text').innerHTML = lesson.content;
        this.lessonOverlay.querySelector('.lesson-examples').innerHTML = lesson.examples;
        this.lessonOverlay.style.display = 'flex';

        const nextBtn = this.lessonOverlay.querySelector('.lesson-next-btn');
        const newBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newBtn, nextBtn);
        newBtn.addEventListener('click', () => this.showLesson(index + 1));
    }

    startGame() {
        this.gameActive = true;
        this.pickNewRoot();
        this.lastSpawnTime = Date.now();
        requestAnimationFrame(() => this.loop());
    }

    pickNewRoot() {
        this.currentDrill = this.data[Math.floor(Math.random() * this.data.length)];
        this.rootDisplay.textContent = this.currentDrill.root;
        this.rootMeaning.textContent = `(${this.currentDrill.meaning})`;
    }

    loop() {
        if (!this.gameActive) return;

        const now = Date.now();
        const isPaused = this.activeWords.some(w => w.isDragging);

        if (!isPaused) {
            if (now - this.lastSpawnTime > this.spawnInterval) {
                this.spawnWord();
                this.lastSpawnTime = now;
            }
            this.updateWords();
        } else {
            // Keep pushing lastSpawnTime forward so the timer pauses while dragging
            if (this.lastFrameTime) {
                this.lastSpawnTime += (now - this.lastFrameTime);
            }
        }

        this.lastFrameTime = now;
        requestAnimationFrame(() => this.loop());
    }

    spawnWord() {
        const isCorrect = Math.random() > 0.5;
        const textPool = isCorrect ? this.currentDrill.valid_forms : this.currentDrill.nonsense_forms;
        const text = textPool[Math.floor(Math.random() * textPool.length)];

        const wordEl = document.createElement('div');
        wordEl.className = 'runner-word';
        wordEl.textContent = text;

        // Start position (random from top)
        const startX = Math.random() * (window.innerWidth - 100);
        wordEl.style.left = `${startX}px`;
        wordEl.style.top = `-50px`;

        this.wordStream.appendChild(wordEl);

        const wordObj = {
            el: wordEl,
            x: startX,
            y: -50,
            text: text,
            isCorrect: isCorrect,
            isProcessed: false,
            startX: 0,
            currentX: 0,
            isDragging: false
        };

        // Swipe Handling
        wordEl.addEventListener('pointerdown', (e) => {
            wordObj.isDragging = true;
            wordObj.startX = e.clientX;
            wordEl.style.transition = 'none';
        });

        window.addEventListener('pointermove', (e) => {
            if (wordObj.isDragging) {
                wordObj.currentX = e.clientX - wordObj.startX;
                wordEl.style.transform = `translateX(${wordObj.currentX}px) rotate(${wordObj.currentX * 0.1}deg)`;
            }
        });

        window.addEventListener('pointerup', () => {
            if (wordObj.isDragging) {
                wordObj.isDragging = false;
                if (Math.abs(wordObj.currentX) > 50) {
                    this.processSwipe(wordObj, wordObj.currentX > 0 ? 'right' : 'left');
                } else {
                    wordEl.style.transition = 'transform 0.3s';
                    wordEl.style.transform = `translateX(0) rotate(0)`;
                }
            }
        });

        this.activeWords.push(wordObj);
    }

    updateWords() {
        const isPaused = this.activeWords.some(w => w.isDragging);
        if (isPaused) return;

        for (let i = this.activeWords.length - 1; i >= 0; i--) {
            const w = this.activeWords[i];
            if (w.isProcessed) continue;

            w.y += this.speed;
            w.el.style.top = `${w.y}px`;

            if (w.y > window.innerHeight) {
                w.el.remove();
                this.activeWords.splice(i, 1);
            }
        }

        // Change root every few rounds of points
        if (this.totalAttempts > 0 && this.totalAttempts % 8 === 0 && this.totalAttempts < 50) {
            // Logic to occasionally swap root if user is doing well
        }

        if (this.totalAttempts >= 20) {
            this.endGame();
        }
    }

    processSwipe(wordObj, direction) {
        if (wordObj.isProcessed) return;
        wordObj.isProcessed = true;
        this.totalAttempts++;

        const success = (direction === 'right' && wordObj.isCorrect) || (direction === 'left' && !wordObj.isCorrect);
        const orb = this.container.querySelector('.orb');
        const symbol = this.container.querySelector('#orb-symbol');

        if (success) {
            this.score++;
            // Feedback Glow (Vibrant Orange)
            orb.style.transition = 'all 0.2s';
            orb.style.boxShadow = '0 0 60px #FF9F1C';
            orb.style.borderColor = '#FF9F1C';
            orb.style.transform = 'scale(1.1)';

            if (symbol) {
                symbol.textContent = '✔';
                symbol.style.backgroundColor = '#FF9F1C';
                symbol.style.boxShadow = '0 0 20px #FF9F1C';
                symbol.style.opacity = '1';
                symbol.style.transform = 'scale(1) translateY(-10px)';
            }

            if (direction === 'right') {
                wordObj.el.classList.add('correct-merge');
            } else {
                wordObj.el.classList.add('shatter');
            }
        } else {
            // Failure Feedback (Magenta)
            orb.style.transition = 'all 0.2s';
            orb.style.boxShadow = '0 0 60px #FF00FF';
            orb.style.borderColor = '#FF00FF';
            orb.style.transform = 'scale(0.9)';

            if (symbol) {
                symbol.textContent = '✖';
                symbol.style.backgroundColor = '#FF00FF';
                symbol.style.boxShadow = '0 0 20px #FF00FF';
                symbol.style.opacity = '1';
                symbol.style.transform = 'scale(1) translateY(10px)';
            }

            wordObj.el.style.background = '#FF00FF';
            wordObj.el.style.transition = 'all 0.4s ease-out';
            wordObj.el.style.transform = `translate(${direction === 'right' ? 300 : -300}px, 200px) rotate(90deg) scale(0)`;
            wordObj.el.style.opacity = '0';
        }

        // Reset Orb after feedback
        setTimeout(() => {
            orb.style.transform = 'scale(1)';
            orb.style.boxShadow = '0 0 30px rgba(255,217,61,0.2)';
            orb.style.borderColor = 'rgba(255,217,61,0.5)';
            if (symbol) {
                symbol.style.opacity = '0';
                symbol.style.transform = 'scale(0.5) translateY(0)';
            }
        }, 500);

        setTimeout(() => {
            wordObj.el.remove();
            this.activeWords = this.activeWords.filter(aw => aw !== wordObj);
        }, 500);

        if (this.totalAttempts >= 20) {
            this.endGame();
        }
    }

    endGame() {
        this.gameActive = false;
        this.activeWords.forEach(w => w.el.remove());
        this.activeWords = [];

        const accuracy = Math.round((this.score / this.totalAttempts) * 100);

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Morphology Complete!</h2>
                <div class="stats-grid">
                    <div class="stat-item"><span>Accuracy</span><strong>${accuracy}%</strong></div>
                    <div class="stat-item"><span>Handled</span><strong>${this.score}/${this.totalAttempts}</strong></div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem;">
                    <button id="runner-restart-btn" class="btn-primary">TEKOT (Play Again)</button>
                    <button id="runner-exit-btn" class="btn-secondary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 12px; color: white;">BACK TO MENU</button>
                </div>
            </div>
        `;
        summaryEl.classList.remove('hidden');

        document.getElementById('runner-restart-btn').addEventListener('click', () => {
            summaryEl.classList.add('hidden');
            this.startRound();
        });

        document.getElementById('runner-exit-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    stop() {
        this.gameActive = false;
        this.wordStream.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }
}
