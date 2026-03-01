import levelManager from './level_manager.js';

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

        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="marker-mission-ui" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-around; padding: 2rem; overflow: hidden; user-select: none;">
                <!-- Drill Info -->
                <div class="drill-category" style="font-size: 0.8rem; color: var(--accent-gold); opacity: 0.7; letter-spacing: 2px; text-transform: uppercase;"></div>
                
                <!-- Main Sentence with Gap -->
                <div class="sentence-display" style="text-align: center; width: 100%;">
                    <h1 class="drill-sentence" style="font-size: clamp(1.8rem, 8vw, 2.5rem); color: white; display: inline-block; position: relative;">
                        <!-- Sentence word by word to identify the gap position -->
                    </h1>
                </div>

                <!-- Translation (Hidden until correct) -->
                <div class="drill-translation" style="font-size: clamp(1rem, 4vw, 1.4rem); color: var(--accent-gold); opacity: 0; transition: all 0.5s; text-align: center; margin-top: -1rem;"></div>

                <!-- Choice Bubbles -->
                <div class="choices-container" style="display: flex; gap: 1rem; justify-content: center; width: 100%; padding-bottom: 2rem;">
                    <!-- Bubbles will be injected here -->
                </div>
            </div>
        `;

        this.sentenceEl = this.container.querySelector('.drill-sentence');
        this.categoryEl = this.container.querySelector('.drill-category');
        this.translationEl = this.container.querySelector('.drill-translation');
        this.choicesEl = this.container.querySelector('.choices-container');
    }

    startRound() {
        this.gameActive = true;
        this.currentRound = 0;
        this.score = 0;
        this.totalAttempts = 0;
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
    }

    evaluateChoice(choice, element) {
        if (!this.gameActive) return;
        this.totalAttempts++;
        this.roundAttempts++;

        const isCorrect = choice === this.currentDrill.correct;
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
        const accuracy = Math.round((this.totalRounds / this.totalAttempts) * 100);

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Mission Complete!</h2>
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
