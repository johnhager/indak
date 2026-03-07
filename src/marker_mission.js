import levelManager from './level_manager.js';
import { Translator } from './translator.js';

/**
 * @file marker_mission.js
 * @description Logic for the "Marker Mission" grammar gap-fill mini-game. 
 * Features magnetic snap animations and glassy choice bubbles.
 */
export class MarkerMission {
    constructor(containerElement, drillsData) {
        this.container = containerElement;
        this.drills = drillsData;

        this.currentRound = 0;
        this.totalRounds = 10;
        this.score = 0;
        this.totalAttempts = 0;
        this.roundAttempts = 0;

        this.gameActive = false;
        this.currentDrill = null;

        this.lessons = [
            {
                title: "ANG vs SI",
                content: "Use <b>ANG</b> for objects and general nouns.<br>Use <b>SI</b> for people's names.",
                examples: "<i>Ang balay</i> (The house)<br><i>Si Juan</i> (Juan)"
            },
            {
                title: "SA (Direction)",
                content: "Use <b>SA</b> for locations, directions, or 'In/At/To'.",
                examples: "<i>Sa palengke</i> (To the market)<br><i>Sa gwa</i> (Outside)"
            },
            {
                title: "SANG vs NI",
                content: "Use <b>SANG</b> for 'of' or 'a' (general objects).<br>Use <b>NI</b> for personal ownership (names).",
                examples: "<i>Inum sang tubig</i> (Drink water)<br><i>Libro ni Maria</i> (Maria's book)"
            },
            {
                title: "NGA (The Linker)",
                content: "Use <b>NGA</b> to connect adjectives (describing words) to nouns.",
                examples: "<i>Namit nga kape</i> (Delicious coffee)<br><i>Gwapa nga maestra</i> (Beautiful teacher)"
            }
        ];
        this.currentLessonIndex = 0;

        this.init();
    }

    init() {
        this.showStartScreen();
    }

    stop() {
        this.gameActive = false;
        if (this.timerEnabled) this.stopTimer();
        this.container.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }

    showStartScreen() {
        const savedTimer = localStorage.getItem('indak_marker_timer') !== 'false';

        this.container.innerHTML = `
            <div class="marker-mission-start" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);">
                <div class="glass-card" style="width: 90%; max-width: 400px; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; text-align: center;">
                    <div style="margin-bottom: 0.5rem;">
                        <span style="font-size: 3rem; display: block; margin-bottom: 10px;">🎯</span>
                        <h2 style="margin: 0; font-size: 1.8rem; letter-spacing: 1px; color: var(--accent-gold);">Marker Mission</h2>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 5px;">Master Grammar Gap-Fills</p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
                        <!-- Timer Toggle -->
                        <div class="toggle-group" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <label style="font-size: 0.9rem; font-weight: bold;">5s Timer</label>
                            <label class="switch">
                                <input type="checkbox" id="mm-timer-toggle" ${savedTimer ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button id="start-mm-btn" class="btn-primary" style="flex: 2; padding: 1rem; border-radius: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">START</button>
                        <button id="lesson-btn" class="btn-secondary" style="flex: 1; padding: 1rem; border-radius: 16px; font-weight: 800; background: rgba(255, 204, 0, 0.1); border: 1px solid var(--accent-gold); color: var(--accent-gold);">📖 HELP</button>
                    </div>

                    <button id="exit-mm-btn" class="btn-secondary" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem; border-radius: 12px; color: rgba(255,255,255,0.5); font-size: 0.8rem;">BACK TO MENU</button>
                </div>
            </div>
        `;

        document.getElementById('start-mm-btn').addEventListener('click', () => {
            const isTimerChecked = document.getElementById('mm-timer-toggle').checked;
            this.timerEnabled = isTimerChecked;
            localStorage.setItem('indak_marker_timer', isTimerChecked);

            this.setupGameUI();
            this.startRound();
        });

        document.getElementById('lesson-btn').addEventListener('click', () => {
            this.showLessonScreen();
        });

        document.getElementById('exit-mm-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    showLessonScreen() {
        this.container.innerHTML = `
            <div class="marker-mission-start" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%); padding: 1rem;">
                <div class="glass-card" style="width: 100%; max-width: 450px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; text-align: left; max-height: 85vh; overflow-y: auto;">
                    <h2 style="margin: 0; font-size: 1.5rem; color: var(--accent-gold); text-align: center;">📖 Crash Course</h2>
                    
                    ${this.lessons.map((lesson, i) => `
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <strong style="color: ${['#00ffaa', '#ffcc00', '#ff6b6b', '#00bfff'][i % 4]}; font-size: 1.1rem;">${i + 1}. ${lesson.title}</strong>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 0.85rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
                            <li style="margin-bottom: 5px;">${lesson.content}</li>
                            <li><i style="color: var(--accent-gold);">${lesson.examples}</i></li>
                        </ul>
                    </div>
                    `).join('')}

                    <button id="back-to-mm-btn" class="btn-primary" style="margin-top: 5px; padding: 1rem; border-radius: 16px; font-weight: 800;">GOT IT, LET'S PLAY</button>
                </div>
            </div>
        `;

        document.getElementById('back-to-mm-btn').addEventListener('click', () => {
            this.showStartScreen();
        });
    }

    setupGameUI() {
        this.container.innerHTML = `
            <div class="marker-mission-ui" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-around; padding: 2rem; overflow: hidden; user-select: none; position: relative;">
                
                <div id="mm-time-container" style="position: absolute; top: 1rem; right: 2rem; display: none; z-index: 10;">
                    <div style="font-size: 2rem; font-weight: 800; color: white; text-shadow: 0 0 10px rgba(0,0,0,0.5);"><span id="mm-time">5.0</span>s</div>
                </div>

                <!-- Drill Info -->
                <div class="drill-category" style="font-size: 0.8rem; color: var(--accent-gold); opacity: 0.7; letter-spacing: 2px; text-transform: uppercase;"></div>
                
                <!-- Main Sentence with Gap -->
                <div class="sentence-display" style="text-align: center; width: 100%;">
                    <h1 class="drill-sentence" style="font-size: clamp(1.8rem, 8vw, 2.5rem); color: white; display: inline-block; position: relative;">
                    </h1>
                </div>

                <!-- Translation (Hidden until correct) -->
                <div class="drill-translation" style="font-size: clamp(1rem, 4vw, 1.4rem); color: var(--accent-gold); opacity: 0; transition: all 0.5s; text-align: center; margin-top: -1rem;"></div>

                <!-- Choice Bubbles -->
                <div class="choices-container" style="display: flex; gap: 1rem; justify-content: center; width: 100%; padding-bottom: 2rem;">
                </div>
            </div>
        `;

        this.sentenceEl = this.container.querySelector('.drill-sentence');
        this.categoryEl = this.container.querySelector('.drill-category');
        this.translationEl = this.container.querySelector('.drill-translation');
        this.choicesEl = this.container.querySelector('.choices-container');
    }

    startRound() {
        this.currentRound = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.gameActive = true;
        this.loadDrill();
    }

    loadDrill() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }

        this.currentRound++;
        this.roundAttempts = 0;
        this.translationEl.style.opacity = '0';
        this.translationEl.style.transform = 'translateY(10px)';

        // Pick a random drill
        const randomDrill = this.drills[Math.floor(Math.random() * this.drills.length)];
        this.currentDrill = randomDrill;

        // Render Sentence with ___ as a target
        const parts = randomDrill.sentence.split('___');
        this.sentenceEl.innerHTML = `
            <span>${parts[0]}</span>
            <span class="gap-target" style="display: inline-block; width: 80px; border-bottom: 3px solid rgba(255,255,255,0.3); margin: 0 10px; transition: all 0.3s;">&nbsp;</span>
            <span>${parts[1] || ''}</span>
        `;

        this.categoryEl.textContent = randomDrill.category;
        this.translationEl.textContent = `"${randomDrill.english}"`;

        // Render Choices
        const choices = [...randomDrill.distractors, randomDrill.correct];
        choices.sort(() => Math.random() - 0.5);

        this.choicesEl.innerHTML = '';
        choices.forEach(text => {
            const btn = document.createElement('div');
            btn.className = 'choice-bubble';
            btn.textContent = text;

            // Glassy Style
            btn.style.cssText = `
                padding: 1rem 1.8rem;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 50px;
                color: white;
                font-weight: 800;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            `;

            btn.addEventListener('pointerdown', () => this.evaluateChoice(text, btn));
            this.choicesEl.appendChild(btn);
        });

        if (this.timerEnabled) {
            this.startTimer();
        }
    }

    startTimer() {
        this.stopTimer();
        const timeContainer = this.container.querySelector('#mm-time-container');
        const timeDisplay = this.container.querySelector('#mm-time');

        if (!timeContainer || !timeDisplay) return;

        let timeLeft = 5.0;
        timeContainer.style.display = 'block';
        timeDisplay.textContent = timeLeft.toFixed(1);
        timeDisplay.style.color = 'white';

        this.pulseTimer = setInterval(() => {
            if (!this.gameActive) return;
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
        if (!this.gameActive) return;
        this.totalAttempts++;
        this.roundAttempts++;

        const gap = this.container.querySelector('.gap-target');

        // Find the correct choice bubble visually
        const correctChoice = Array.from(this.choicesEl.children).find(b => b.textContent === this.currentDrill.correct);

        if (correctChoice) {
            // Animate it flying into the slot (similar to evaluateChoice success)
            const gapRect = gap.getBoundingClientRect();
            const elRect = correctChoice.getBoundingClientRect();

            const deltaX = gapRect.left - elRect.left;
            const deltaY = gapRect.top - elRect.top;

            correctChoice.style.zIndex = '100';
            correctChoice.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.9)`;
            correctChoice.style.background = 'rgba(255, 107, 107, 0.3)'; // Redish background to show timeout
            correctChoice.style.borderColor = 'rgba(255, 107, 107, 0.6)';

            // Gap Feedback
            gap.textContent = this.currentDrill.correct;
            gap.style.borderBottomColor = '#ff4d4d';
            gap.style.color = '#ff4d4d';
        }

        this.translationEl.style.opacity = '1';
        this.translationEl.style.transform = 'translateY(0)';
        this.translationEl.textContent = 'TIMEOUT! ' + `"${this.currentDrill.english}"`;
        this.translationEl.style.color = '#ff4d4d';

        setTimeout(() => this.loadDrill(), 1500);
    }

    evaluateChoice(choice, element) {
        if (!this.gameActive) return;
        this.stopTimer();

        this.totalAttempts++;
        this.roundAttempts++;

        const isCorrect = Translator.normalize(choice) === Translator.normalize(this.currentDrill.correct);
        const gap = this.container.querySelector('.gap-target');

        if (isCorrect) {
            if (this.roundAttempts === 1) this.score++;

            // Magnetic Animation
            const gapRect = gap.getBoundingClientRect();
            const elRect = element.getBoundingClientRect();

            const deltaX = gapRect.left - elRect.left;
            const deltaY = gapRect.top - elRect.top;

            // Animate it flying into the slot
            element.style.zIndex = '100';
            element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.9)`;
            element.style.background = 'var(--accent-bamboo)';

            // Gap Feedback
            gap.textContent = choice;
            gap.style.borderBottomColor = 'var(--accent-bamboo)';
            gap.style.color = 'var(--accent-bamboo)';

            this.translationEl.style.opacity = '1';
            this.translationEl.style.transform = 'translateY(0)';

            // Move to next after delay
            setTimeout(() => this.loadDrill(), 1500);
        } else {
            // Error Shake
            element.style.background = 'rgba(255, 107, 107, 0.3)';
            element.style.borderColor = 'rgba(255, 107, 107, 0.6)';
            element.style.transform = 'translateX(10px)';
            setTimeout(() => element.style.transform = 'translateX(-10px)', 50);
            setTimeout(() => element.style.transform = 'translateX(5px)', 100);
            setTimeout(() => element.style.transform = 'translateX(0)', 150);
        }
    }

    endGame() {
        this.gameActive = false;
        const accuracy = this.totalAttempts === 0 ? 0 : Math.round((this.score / this.totalRounds) * 100);

        let levelUpMessage = '';
        if (accuracy >= 80) {
            const leveled = levelManager.advanceTier();
            if (leveled) levelUpMessage = `<div style="color: var(--accent-gold); font-weight: 800; margin-bottom: 1rem; animation: pulse 2s infinite;">LEVEL UP! ACCESSING NEW RULES...</div>`;
        }

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Mission Complete!</h2>
                ${levelUpMessage}
                <div class="stats-grid">
                    <div class="stat-item"><span>Accuracy</span><strong>${accuracy}%</strong></div>
                    <div class="stat-item"><span>Correct</span><strong>${this.score}/${this.totalRounds}</strong></div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem;">
                    <button id="marker-restart-btn" class="btn-primary">BALIK (Try Again)</button>
                    <button id="marker-exit-btn" class="btn-secondary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 12px; color: white;">BACK TO MENU</button>
                </div>
            </div>
        `;
        summaryEl.classList.remove('hidden');

        document.getElementById('marker-restart-btn').addEventListener('click', () => {
            summaryEl.classList.add('hidden');
            this.startRound();
        });

        document.getElementById('marker-exit-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    stop() {
        this.gameActive = false;
        this.container.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }
}
