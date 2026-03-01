import levelManager from './level_manager.js';
import indakAudio from './audio_manager.js';

export class ParticlePulse {
    constructor(containerElement, particleData) {
        this.container = containerElement;
        this.data = particleData;

        this.questions = [...this.data];
        // Shuffle questions
        this.questions.sort(() => Math.random() - 0.5);

        this.currentRound = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.timerInterval = null;
        this.timeLeft = 5.0; // Seconds per question

        this.activeCard = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;

        this.nodes = [];
        this.optionsLayout = []; // Will store which word is where

        // Ensure LevelManager has some vocab, though this game might not directly link to rhythm vocab
        // We can just log mastery generically or specifically.

        this.init();
    }

    stop() {
        this.clearTimer();
        this.container.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }

    init() {
        this.showStartScreen();
    }

    showStartScreen() {
        this.container.innerHTML = `
            <div class="particle-pulse-start" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);">
                <div class="glass-card" style="width: 90%; max-width: 400px; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; text-align: center;">
                    <div style="margin-bottom: 0.5rem;">
                        <span style="font-size: 3rem; display: block; margin-bottom: 10px;">⚡</span>
                        <h2 style="margin: 0; font-size: 1.8rem; letter-spacing: 1px; color: var(--accent-gold);">Particle Pulse</h2>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 5px;">Master Negation & Flow (Tier 4+)</p>
                    </div>

                    <button id="start-pp-btn" class="btn-primary" style="padding: 1rem; border-radius: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">ACTIVATE PULSE</button>
                    <button id="exit-pp-btn" class="btn-secondary" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem; border-radius: 12px; color: rgba(255,255,255,0.5); font-size: 0.8rem;">BACK TO MENU</button>
                </div>
            </div>
        `;

        document.getElementById('start-pp-btn').addEventListener('click', () => {
            this.setupGameUI();
            this.startNextQuestion();
        });

        document.getElementById('exit-pp-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    setupGameUI() {
        this.container.innerHTML = `
            <div class="pulse-ui" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none; touch-action: none; flex-direction: column;">
                
                <div style="position: absolute; top: 5vh; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 2rem; z-index: 10;">
                    <div style="color: white; font-weight: bold; font-size: 1.2rem;">Score: <span id="pp-score" style="color: var(--accent-gold);">0</span></div>
                    <div style="color: white; font-weight: bold; font-size: 1.2rem;">Time: <span id="pp-time" style="color: #ffcc00;">5.0</span>s</div>
                </div>

                <!-- 4 Nodes -->
                <div class="pulse-node node-up" style="position: absolute; top: 15vh; left: 50%; transform: translateX(-50%); text-align: center; font-weight: 800; padding: 15px 25px; border-radius: 30px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px); transition: all 0.2s; color: white;">UP</div>
                <div class="pulse-node node-down" style="position: absolute; bottom: 15vh; left: 50%; transform: translateX(-50%); text-align: center; font-weight: 800; padding: 15px 25px; border-radius: 30px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px); transition: all 0.2s; color: white;">DOWN</div>
                <div class="pulse-node node-left" style="position: absolute; left: 3vw; top: 50%; transform: translateY(-50%); text-align: center; font-weight: 800; padding: 15px 25px; border-radius: 30px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px); transition: all 0.2s; color: white;">LEFT</div>
                <div class="pulse-node node-right" style="position: absolute; right: 3vw; top: 50%; transform: translateY(-50%); text-align: center; font-weight: 800; padding: 15px 25px; border-radius: 30px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px); transition: all 0.2s; color: white;">RIGHT</div>

                <!-- Central Area -->
                <div id="card-placeholder" style="position: relative; width: 180px; height: 120px; z-index: 100;"></div>
            </div>
        `;

        this.nodeElements = {
            'up': this.container.querySelector('.node-up'),
            'down': this.container.querySelector('.node-down'),
            'left': this.container.querySelector('.node-left'),
            'right': this.container.querySelector('.node-right')
        };
        this.scoreDisplay = this.container.querySelector('#pp-score');
        this.timeDisplay = this.container.querySelector('#pp-time');
        this.placeholder = this.container.querySelector('#card-placeholder');

        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
        window.addEventListener('touchmove', (e) => { if (this.isDragging) e.preventDefault(); }, { passive: false });
    }

    startNextQuestion() {
        this.clearTimer();

        if (this.currentRound >= this.questions.length) {
            this.endGame();
            return;
        }

        const data = this.questions[this.currentRound];
        this.currentData = data;

        // Shuffle options
        let opts = [...data.options];
        opts.sort(() => Math.random() - 0.5);

        this.optionsLayout = {
            'up': opts[0],
            'down': opts[1],
            'left': opts[2],
            'right': opts[3]
        };

        // Render nodes
        for (const [dir, word] of Object.entries(this.optionsLayout)) {
            this.nodeElements[dir].innerText = word.toUpperCase();
            this.nodeElements[dir].style.background = 'rgba(255,255,255,0.1)';
            this.nodeElements[dir].style.borderColor = 'rgba(255,255,255,0.3)';
            this.nodeElements[dir].style.transform = dir === 'up' || dir === 'down' ? 'translateX(-50%) scale(1)' : 'translateY(-50%) scale(1)';
        }

        this.spawnCard(data.context);

        this.timeLeft = 5.0;
        this.timeDisplay.innerText = this.timeLeft.toFixed(1);
        this.timerInterval = setInterval(() => {
            this.timeLeft -= 0.1;
            this.timeDisplay.innerText = Math.max(0, this.timeLeft).toFixed(1);
            if (this.timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 100);
    }

    spawnCard(contextText) {
        if (this.activeCard) {
            this.activeCard.remove();
        }

        this.activeCard = document.createElement('div');
        this.activeCard.className = 'pulse-card';
        this.activeCard.innerText = contextText;

        // Styling
        this.activeCard.style.position = 'absolute';
        this.activeCard.style.width = '100%';
        this.activeCard.style.height = '100%';
        this.activeCard.style.background = 'rgba(255, 255, 255, 0.9)';
        this.activeCard.style.color = '#1a1a2e';
        this.activeCard.style.display = 'flex';
        this.activeCard.style.alignItems = 'center';
        this.activeCard.style.justifyContent = 'center';
        this.activeCard.style.textAlign = 'center';
        this.activeCard.style.padding = '1rem';
        this.activeCard.style.borderRadius = '16px';
        this.activeCard.style.fontWeight = '800';
        this.activeCard.style.fontSize = '1rem';
        this.activeCard.style.boxShadow = '0 15px 35px rgba(0,0,0,0.4)';
        this.activeCard.style.cursor = 'grab';
        this.activeCard.style.transition = 'transform 0.1s, opacity 0.3s';
        this.activeCard.style.transform = 'translate(0px, 0px)';

        this.activeCard.addEventListener('pointerdown', this.onPointerDown.bind(this));

        this.placeholder.appendChild(this.activeCard);

        // Entrance animation
        this.activeCard.animate([
            { transform: 'scale(0.8) translateY(50px)', opacity: 0 },
            { transform: 'scale(1) translateY(0px)', opacity: 1 }
        ], { duration: 300, easing: 'ease-out' });
    }

    onPointerDown(e) {
        if (!this.activeCard) return;
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.activeCard.style.cursor = 'grabbing';
        this.activeCard.style.transition = 'none'; // Disable transition during drag
    }

    onPointerMove(e) {
        if (!this.isDragging || !this.activeCard) return;

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        // Add resistance/rubber-band effect if they drag too far
        const maxDrag = 150;
        const limitedDx = Math.sign(dx) * Math.min(Math.abs(dx), maxDrag + Math.pow(Math.abs(dx) - maxDrag, 0.5));
        const limitedDy = Math.sign(dy) * Math.min(Math.abs(dy), maxDrag + Math.pow(Math.abs(dy) - maxDrag, 0.5));

        this.activeCard.style.transform = `translate(${limitedDx}px, ${limitedDy}px) rotate(${limitedDx * 0.05}deg)`;

        this.highlightNearestNode(dx, dy);
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        const distance = Math.hypot(dx, dy);
        const threshold = 60; // minimum drag distance to commit

        if (distance > threshold) {
            const dir = this.getDirection(dx, dy);
            this.evaluateAnswer(dir);
        } else {
            // Snap back
            this.activeCard.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            this.activeCard.style.transform = 'translate(0px, 0px) rotate(0deg)';
        }

        // Reset visual nodes
        for (const [dir, node] of Object.entries(this.nodeElements)) {
            node.style.background = 'rgba(255,255,255,0.1)';
            node.style.transform = dir === 'up' || dir === 'down' ? 'translateX(-50%) scale(1)' : 'translateY(-50%) scale(1)';
        }
    }

    getDirection(dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    highlightNearestNode(dx, dy) {
        const threshold = 30;
        let activeDir = null;
        if (Math.hypot(dx, dy) > threshold) {
            activeDir = this.getDirection(dx, dy);
        }

        for (const [dir, node] of Object.entries(this.nodeElements)) {
            if (dir === activeDir) {
                node.style.background = 'rgba(255, 204, 0, 0.4)'; // Gold glow
                node.style.transform = dir === 'up' || dir === 'down' ? 'translateX(-50%) scale(1.1)' : 'translateY(-50%) scale(1.1)';
            } else {
                node.style.background = 'rgba(255,255,255,0.1)';
                node.style.transform = dir === 'up' || dir === 'down' ? 'translateX(-50%) scale(1)' : 'translateY(-50%) scale(1)';
            }
        }
    }

    handleTimeout() {
        this.clearTimer();
        this.totalAttempts++;
        this.showFeedback(false, "TIMEOUT!");

        levelManager.handleRating('MISS');
        if (this.activeCard) {
            this.activeCard.style.transition = 'all 0.3s';
            this.activeCard.style.transform = 'scale(0.5)';
            this.activeCard.style.opacity = '0';
        }

        setTimeout(() => {
            this.currentRound++;
            this.startNextQuestion();
        }, 1000);
    }

    evaluateAnswer(direction) {
        this.clearTimer();
        this.totalAttempts++;

        const selectedWord = this.optionsLayout[direction];
        const isCorrect = selectedWord === this.currentData.correct;

        // Log mastery for the correct particle word (we mark success/fail)
        levelManager.markWordMastered(this.currentData.correct, 'meaning', isCorrect);

        if (isCorrect) {
            this.score++;
            this.scoreDisplay.innerText = this.score;
            levelManager.handleRating('PERFECT');
            this.showFeedback(true, "PERFECT");

            // Shatter/fly away animation
            this.activeCard.style.transition = 'all 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53)'; // easeInQuad
            const endX = direction === 'right' ? 500 : (direction === 'left' ? -500 : 0);
            const endY = direction === 'down' ? 500 : (direction === 'up' ? -500 : 0);
            this.activeCard.style.transform = `translate(${endX}px, ${endY}px) rotate(${endX * 0.1}deg)`;
            this.activeCard.style.opacity = '0';

        } else {
            levelManager.handleRating('MISS');
            this.showFeedback(false, "MISS");

            // Error shake
            this.activeCard.style.transition = 'all 0.1s';
            this.activeCard.style.background = '#ff4d4d';
            this.activeCard.style.color = 'white';
            const shakePattern = [
                { transform: 'translate(10px, 0)' },
                { transform: 'translate(-10px, 0)' },
                { transform: 'translate(10px, 0)' },
                { transform: 'translate(0, 0)' }
            ];
            this.activeCard.animate(shakePattern, { duration: 300 });

            setTimeout(() => {
                this.activeCard.style.opacity = '0';
            }, 500);
        }

        setTimeout(() => {
            this.currentRound++;
            this.startNextQuestion();
        }, 1000);
    }

    showFeedback(isCorrect, text) {
        if (isCorrect) {
            indakAudio.playHit();
            const hitRing = document.createElement('div');
            hitRing.className = 'hit-ring';
            const rect = this.activeCard.getBoundingClientRect();
            hitRing.style.left = `${rect.left + rect.width / 2 - 25}px`;
            hitRing.style.top = `${rect.top + rect.height / 2 - 25}px`;
            hitRing.style.borderColor = '#00ffaa';
            document.body.appendChild(hitRing);
            setTimeout(() => hitRing.remove(), 400);
        } else {
            indakAudio.playFail();
        }

        const feedback = document.createElement('div');
        feedback.className = `hit-feedback ${isCorrect ? 'perfect' : 'miss'}`;
        feedback.innerText = text;
        feedback.style.fontSize = '2rem';
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 500);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    endGame() {
        this.clearTimer();
        this.container.innerHTML = '';
        const accuracy = this.totalAttempts === 0 ? 0 : Math.round((this.score / this.totalAttempts) * 100);

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card">
                <h2>Pulse Complete!</h2>
                <div class="stats-grid">
                    <div class="stat-item"><span>Accuracy</span><strong>${accuracy}%</strong></div>
                    <div class="stat-item"><span>Score</span><strong>${this.score}/${this.totalAttempts}</strong></div>
                </div>
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem;">
                    <button id="pp-restart-btn" class="btn-primary">TEKOT ULI (Play Again)</button>
                    <button id="pp-exit-btn" class="btn-secondary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 12px; color: white;">BACK TO MENU</button>
                </div>
            </div>
        `;
        summaryEl.classList.remove('hidden');

        document.getElementById('pp-restart-btn').addEventListener('click', () => {
            summaryEl.classList.add('hidden');
            this.currentRound = 0;
            this.score = 0;
            this.totalAttempts = 0;
            this.questions.sort(() => Math.random() - 0.5); // reshuffle
            this.setupGameUI();
            this.startNextQuestion();
        });

        document.getElementById('pp-exit-btn').addEventListener('click', () => {
            location.reload();
        });
    }
}
