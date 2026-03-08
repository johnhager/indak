import { Translator } from './translator.js';

/**
 * @file context_master.js
 * @description Logic for the "Contextual Choice" mini-game.
 * Focuses on choosing the best response/action based on a social scenario.
 */
export class ContextMaster {
    constructor(containerElement, situationsData, lessonData = null) {
        this.container = containerElement;
        this.situations = lessonData ? lessonData.situations : situationsData;
        this.lessonData = lessonData;

        this.currentRound = 0;
        this.totalRounds = this.situations ? Math.min(this.situations.length, 5) : 5;
        this.score = 0;
        this.totalAttempts = 0;
        this.roundAttempts = 0;

        this.gameActive = false;
        this.currentSituation = null;
        this.situationPool = [];

        this.init();
    }

    init() {
        this.setupGameUI();
        this.startRound();
    }

    setupGameUI() {
        this.container.innerHTML = `
            <div class="context-master-ui" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; overflow: hidden; user-select: none; position: relative;">
                
                <!-- Situation Prompt -->
                <div class="situation-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 2rem; text-align: center; width: 100%; max-width: 500px; margin-bottom: 3rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);">
                    <div style="font-size: 0.7rem; color: var(--accent-gold); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 1rem; opacity: 0.7;">SITUATION</div>
                    <h2 class="prompt-text" style="font-size: clamp(1.2rem, 5vw, 1.8rem); color: white; line-height: 1.4; margin: 0;"></h2>
                </div>

                <!-- Explanation (Hidden until correct) -->
                <div class="context-explanation" style="font-size: 0.9rem; color: var(--accent-gold); opacity: 0; transition: all 0.5s; text-align: center; margin-bottom: 2rem; transform: translateY(10px);"></div>

                <!-- Response Choices -->
                <div class="responses-container" style="display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 400px;">
                </div>

                <!-- Next Button (Hidden until correct) -->
                <button class="mm-next-btn hidden" style="margin-top: 2rem; padding: 1rem 3rem; border-radius: 50px; background: var(--accent-gold); color: black; border: none; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(255, 204, 0, 0.3); transform: translateY(20px); opacity: 0; pointer-events: none;">PADAYON (Continue)</button>
            </div>
        `;

        this.promptEl = this.container.querySelector('.prompt-text');
        this.explanationEl = this.container.querySelector('.context-explanation');
        this.choicesEl = this.container.querySelector('.responses-container');
        this.nextBtn = this.container.querySelector('.mm-next-btn');

        this.nextBtn.addEventListener('click', () => this.loadSituation());
    }

    startRound() {
        this.currentRound = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.gameActive = true;
        this.situationPool = []; // Reset pool
        this.loadSituation();
    }

    loadSituation() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }

        this.currentRound++;
        this.roundAttempts = 0;
        this.explanationEl.style.opacity = '0';
        this.explanationEl.style.transform = 'translateY(10px)';

        if (this.situationPool.length === 0) {
            this.situationPool = [...this.situations].sort(() => Math.random() - 0.5);
            if (this.situationPool.length > 1 && this.situationPool[0] === this.currentSituation) {
                this.situationPool.sort(() => Math.random() - 0.5);
            }
        }

        const nextSit = this.situationPool.pop();
        this.currentSituation = nextSit;

        this.promptEl.textContent = this.currentSituation.prompt;
        this.explanationEl.textContent = this.currentSituation.context;

        // Hide next button
        this.nextBtn.classList.add('hidden');
        this.nextBtn.style.opacity = '0';
        this.nextBtn.style.transform = 'translateY(20px)';
        this.nextBtn.style.pointerEvents = 'none';

        // Reset prompt card scale/opacity just in case
        this.promptEl.parentElement.style.opacity = '1';
        this.promptEl.parentElement.style.transform = 'translateY(0)';

        // Render Choices
        const choices = [...this.currentSituation.choices];
        // Ensure correct is in there if not already
        if (!choices.includes(this.currentSituation.correct)) {
            choices.push(this.currentSituation.correct);
        }
        choices.sort(() => Math.random() - 0.5);

        this.choicesEl.innerHTML = '';
        choices.forEach(text => {
            const btn = document.createElement('div');
            btn.className = 'response-btn';
            btn.innerHTML = `
                <span class="response-text">${text}</span>
                <span class="status-icon" style="opacity: 0; font-size: 1.2rem;">✨</span>
            `;

            // Premium Button Style
            btn.style.cssText = `
                padding: 1.2rem 2rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 18px;
                color: white;
                font-weight: 700;
                font-size: 1.1rem;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                animation: fadeIn 0.4s ease forwards;
                animation-delay: ${choices.indexOf(text) * 0.1}s;
            `;

            btn.addEventListener('pointerdown', () => this.evaluateChoice(text, btn));

            // Hover effect for PC
            btn.addEventListener('pointerenter', () => {
                if (!btn.classList.contains('correct') && !btn.classList.contains('wrong')) {
                    btn.style.background = 'rgba(255, 255, 255, 0.1)';
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }
            });
            btn.addEventListener('pointerleave', () => {
                if (!btn.classList.contains('correct') && !btn.classList.contains('wrong')) {
                    btn.style.background = 'rgba(255, 255, 255, 0.05)';
                    btn.style.transform = 'translateY(0)';
                    btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }
            });

            this.choicesEl.appendChild(btn);
        });
    }

    evaluateChoice(choice, element) {
        if (!this.gameActive) return;

        this.totalAttempts++;
        this.roundAttempts++;

        const isCorrect = choice === this.currentSituation.correct;

        if (isCorrect) {
            if (this.roundAttempts === 1) this.score++;

            element.classList.add('correct');
            element.style.background = 'rgba(0, 255, 170, 0.15)';
            element.style.borderColor = 'var(--accent-bamboo)';
            element.style.color = 'var(--accent-bamboo)';
            element.querySelector('.status-icon').style.opacity = '1';
            element.querySelector('.status-icon').textContent = '✔';

            this.explanationEl.style.opacity = '1';
            this.explanationEl.style.transform = 'translateY(0)';

            // Fade out others
            Array.from(this.choicesEl.children).forEach(child => {
                if (child !== element) {
                    child.style.opacity = '0.3';
                    child.style.pointerEvents = 'none';
                }
            });

            // Show Padayon button
            this.nextBtn.classList.remove('hidden');
            setTimeout(() => {
                this.nextBtn.style.opacity = '1';
                this.nextBtn.style.transform = 'translateY(0)';
                this.nextBtn.style.pointerEvents = 'auto';
            }, 500);
        } else {
            element.classList.add('wrong');
            element.style.background = 'rgba(255, 74, 74, 0.15)';
            element.style.borderColor = '#ff4a4a';
            element.style.color = '#ff4a4a';
            element.querySelector('.status-icon').style.opacity = '1';
            element.querySelector('.status-icon').textContent = '✘';

            // Shake effect
            element.style.transform = 'translateX(10px)';
            setTimeout(() => element.style.transform = 'translateX(-10px)', 50);
            setTimeout(() => element.style.transform = 'translateX(5px)', 100);
            setTimeout(() => element.style.transform = 'translateX(0)', 150);
        }
    }

    endGame() {
        this.gameActive = false;
        const accuracy = this.totalAttempts === 0 ? 0 : Math.round((this.score / this.totalRounds) * 100);

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card" style="padding: 2.5rem; text-align: center; max-width: 400px; width: 90%;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🗣️</div>
                <h2 style="color: var(--accent-gold); margin-bottom: 0.5rem;">Dialogue Mastered!</h2>
                <p style="opacity: 0.6; font-size: 0.9rem; margin-bottom: 2rem;">You're learning natural Ilonggo flow.</p>
                
                <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 0.6rem; opacity: 0.5; text-transform: uppercase;">Correct</div>
                        <div style="font-size: 1.5rem; font-weight: 800;">${this.score}/${this.totalRounds}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 0.6rem; opacity: 0.5; text-transform: uppercase;">Accuracy</div>
                        <div style="font-size: 1.5rem; font-weight: 800;">${accuracy}%</div>
                    </div>
                </div>

                <div id="context-action-container"></div>
            </div>
        `;
        summaryEl.classList.remove('hidden');
    }

    stop() {
        this.gameActive = false;
        this.container.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }
}
