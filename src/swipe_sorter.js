import levelManager from './level_manager.js';

export class SwipeSorter {
    constructor(containerElement, vocabularyData, lessonData = null) {
        this.container = containerElement;
        this.vocabulary = vocabularyData;
        this.lessonData = lessonData;

        // If we have lesson-specific vocab, use that, otherwise use global
        const activeVocab = lessonData ? lessonData.vocabulary : vocabularyData;

        // Ensure LevelManager has the latest vocab
        levelManager.setVocabulary(activeVocab);

        this.currentCard = null;
        this.gameActive = false;

        // Game Settings
        this.gameDirection = 'il-to-en'; // 'il-to-en' or 'en-to-il'
        this.hardMode = false;

        // Swiping State
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isDragging = false;

        // Timer State
        this.timerEnabled = lessonData?.settings?.timer !== false;
        this.timerInterval = null;
        this.timeLeft = 5.0;

        this.init();
    }

    init() {
        if (this.lessonData) {
            this.setupGameUI();
            this.startRound();
        } else {
            this.showStartScreen();
        }
    }

    showStartScreen() {
        this.gameActive = false;

        const categoriesMap = {};
        this.vocabulary.forEach(v => {
            const cat = v.category || 'Other';
            if (!categoriesMap[cat]) {
                categoriesMap[cat] = { c: 0, t: 0, total: 0 };
            }
            categoriesMap[cat].total++;
            const stats = levelManager.masteryData[v.word]?.meaning;
            if (stats && stats.t > 0) {
                categoriesMap[cat].c += stats.c;
                categoriesMap[cat].t += stats.t;
            }
        });

        const savedCategoriesStr = localStorage.getItem('indak_swipe_categories');
        const savedCategories = savedCategoriesStr ? JSON.parse(savedCategoriesStr) : null;

        const categoryOptionsHTML = Object.entries(categoriesMap).map(([cat, counts]) => {
            const sr = counts.t > 0 ? Math.round((counts.c / counts.t) * 100) : 0;
            const srDisplay = counts.t > 0 ? `${sr}% Success` : 'New';

            // If we have saved categories, only check those. Otherwise, check all by default.
            const isChecked = savedCategories ? savedCategories.includes(cat) : true;
            const checkedAttr = isChecked ? 'checked' : '';

            return `
                <div class="toggle-group" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 5px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-top: 5px;">
                    <div style="text-align: left;">
                        <label style="font-size: 0.85rem; font-weight: bold; display: block;">${cat} ${srDisplay === 'New' ? '<span style="color:var(--accent-gold);font-size:0.6rem;text-transform:uppercase;">[NEW]</span>' : ''}</label>
                        <span style="font-size: 0.65rem; color: ${sr > 80 ? '#00ffaa' : (sr > 50 ? '#ffcc00' : '#ff6b6b')}; opacity: 0.8;">${srDisplay} (${counts.total} items)</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" class="category-toggle" value="${cat}" ${checkedAttr}>
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
        }).join('');

        const savedDirection = localStorage.getItem('indak_swipe_direction') === 'true';
        const savedHardMode = localStorage.getItem('indak_swipe_hard') === 'true';
        const savedTimer = localStorage.getItem('indak_swipe_timer') !== 'false'; // default true

        this.container.innerHTML = `
            <div class="swipe-sorter-start" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);">
                <div class="glass-card" style="width: 90%; max-width: 400px; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; text-align: center; max-height: 90vh; overflow-y: auto;">
                    <div style="margin-bottom: 0;">
                        <h2 style="margin: 0; font-size: 1.8rem; letter-spacing: 1px;">Swipe Sorter</h2>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 5px;">Master Hiligaynon Vocabulary</p>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 0.5rem 0;">
                        <!-- Direction Toggle -->
                        <div class="toggle-group">
                            <label>EN ➔ IL Mode</label>
                            <label class="switch">
                                <input type="checkbox" id="direction-toggle" ${savedDirection ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>

                        <!-- Difficulty Toggle -->
                        <div class="toggle-group">
                            <div style="text-align: left;">
                                <label style="display: block;">Hard Mode</label>
                                <span style="font-size: 0.65rem; color: var(--accent-gold); opacity: 0.8;">Target 30% Most Challenging</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="difficulty-toggle" ${savedHardMode ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                        
                        <!-- Timer Toggle -->
                        <div class="toggle-group" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 5px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                            <label style="font-size: 0.9rem; font-weight: bold;">5s Timer</label>
                            <label class="switch">
                                <input type="checkbox" id="swipe-timer-toggle" ${savedTimer ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>

                        <!-- Category Selector -->
                        <div style="margin-top: 1rem; text-align: left;">
                            <h3 style="font-size: 1rem; color: var(--accent-gold); margin-bottom: 0.5rem;">Categories</h3>
                            ${categoryOptionsHTML}
                        </div>
                    </div>

                    <button id="start-swipe-btn" class="btn-primary" style="padding: 1rem; border-radius: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">START SESSION</button>
                    <button id="exit-swipe-btn" class="btn-secondary" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); padding: 0.8rem; border-radius: 12px; color: rgba(255,255,255,0.5); font-size: 0.8rem;">BACK TO MENU</button>
                </div>
            </div>
        `;

        document.getElementById('start-swipe-btn').addEventListener('click', () => {
            const isDirectionChecked = document.getElementById('direction-toggle').checked;
            const isHardModeChecked = document.getElementById('difficulty-toggle').checked;
            const isTimerChecked = document.getElementById('swipe-timer-toggle').checked;

            this.gameDirection = isDirectionChecked ? 'en-to-il' : 'il-to-en';
            this.hardMode = isHardModeChecked;
            this.timerEnabled = isTimerChecked;

            localStorage.setItem('indak_swipe_direction', isDirectionChecked);
            localStorage.setItem('indak_swipe_hard', isHardModeChecked);
            localStorage.setItem('indak_swipe_timer', isTimerChecked);

            // Get selected categories
            const checkedBoxes = document.querySelectorAll('.category-toggle:checked');
            this.selectedCategories = Array.from(checkedBoxes).map(cb => cb.value);

            // Save preferences
            localStorage.setItem('indak_swipe_categories', JSON.stringify(this.selectedCategories));

            this.setupGameUI();
            this.startRound();
        });

        document.getElementById('exit-swipe-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    setupGameUI() {
        this.container.innerHTML = `
            <div class="swipe-sorter-ui" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none; touch-action: none;">
                
                <div id="swipe-time-container" style="position: absolute; top: 5vh; left: 0; right: 0; display: flex; justify-content: flex-end; padding: 0 2rem; z-index: 10; display: none;">
                    <div style="color: white; font-weight: bold; font-size: 1.2rem;">Time: <span id="swipe-time" style="color: #ffcc00;">5.0</span>s</div>
                </div>

                <!-- Directional Definitions -->
                <div class="def-label def-top" style="position: absolute; top: 12vh; width: 85%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 12px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); z-index: 5; font-size: 0.9rem;"></div>
                <div class="def-label def-bottom" style="position: absolute; bottom: 12vh; width: 85%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 12px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); z-index: 5; font-size: 0.9rem;"></div>
                <div class="def-label def-left" style="position: absolute; left: 2vw; width: 30%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 8px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); transform: translateY(-50%); top: 50%; z-index: 5; font-size: 0.8rem;"></div>
                <div class="def-label def-right" style="position: absolute; right: 2vw; width: 30%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 8px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); transform: translateY(-50%); top: 50%; z-index: 5; font-size: 0.8rem;"></div>
                
                <div class="card-stack" style="position: relative; z-index: 10; width: 100%; display: flex; justify-content: center;"></div>
            </div>
        `;

        this.cardStack = this.container.querySelector('.card-stack');
        this.timeContainer = this.container.querySelector('#swipe-time-container');
        this.timeDisplay = this.container.querySelector('#swipe-time');
        this.defTop = this.container.querySelector('.def-top');
        this.defBottom = this.container.querySelector('.def-bottom');
        this.defLeft = this.container.querySelector('.def-left');
        this.defRight = this.container.querySelector('.def-right');

        this.bindEvents();
    }

    bindEvents() {
        this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.container.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
        window.addEventListener('pointercancel', this.onPointerUp.bind(this));
    }

    startRound() {
        this.gameActive = true;

        // If playing a lesson, cap rounds at vocabulary size, otherwise default to 15
        if (this.lessonData && this.lessonData.vocabulary) {
            this.totalRounds = this.lessonData.vocabulary.length;
        } else {
            this.totalRounds = 15;
        }

        this.currentRound = 0;
        this.score = 0;
        this.totalAttempts = 0;
        this.missedWords = new Set();
        this.roundUsedWords = [];
        this.resetLabelHighlight();
        [this.defTop, this.defBottom, this.defLeft, this.defRight].forEach(el => el.style.opacity = '0');
        this.loadNextCard();
    }

    loadNextCard() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }

        this.roundAttempts = 0; // Reset for the new card
        this.resetLabelHighlight();
        [this.defTop, this.defBottom, this.defLeft, this.defRight].forEach(el => el.style.opacity = '0');

        // 1. Get the pool of available words
        let pool = [];

        if (this.lessonData) {
            // Strict lesson boundary: only use lesson vocabulary, filter out ones we've already done
            pool = this.vocabulary.filter(v => !this.roundUsedWords.includes(v.word));

            // Allow reuse if the remaining lesson pool is too small to complete the round
            if (!pool || pool.length < 1) {
                pool = this.vocabulary;
            }
        } else {
            // Free play mode: Get algorithmically weighted pool from LevelManager
            pool = levelManager.getFilteredVocabulary('meaning', this.roundUsedWords, this.hardMode, this.selectedCategories);

            // If not enough words because of used-list, allow reuse
            if (!pool || pool.length < 4) {
                pool = levelManager.getFilteredVocabulary('meaning', [], this.hardMode, this.selectedCategories);
            }
        }

        if (!pool || pool.length < 2) { // Minimum 2 for a game to even work (top/bottom)
            console.warn('Insufficient vocabulary for Swipe Sorter');
            this.endGame();
            return;
        }

        this.currentRound++;

        // 1. Pick a random word from the weighted pool
        const targetIndex = Math.floor(Math.random() * pool.length);
        this.targetWordData = pool[targetIndex];
        this.roundUsedWords.push(this.targetWordData.word);

        // 2. Pick 3 unique trap definitions from the full vocabulary or selected categories
        let trapPool = this.vocabulary;
        const hasSelectedCategories = this.selectedCategories && this.selectedCategories.length > 0;

        if (hasSelectedCategories) {
            const filteredTraps = this.vocabulary.filter(v => this.selectedCategories.includes(v.category || 'Other'));
            // Use filtered traps if we have at least some variety
            if (filteredTraps.length > 1) {
                trapPool = filteredTraps;
            }
        }

        let traps = [];
        let attempts = 0;
        while (traps.length < 3 && attempts < 100) {
            attempts++;
            let trapIdx = Math.floor(Math.random() * trapPool.length);
            let trapWord = trapPool[trapIdx];
            // Ensure trap is not the target and not already a trap
            if (trapWord.word !== this.targetWordData.word && !traps.some(t => t.meaning === trapWord.meaning)) {
                traps.push(trapWord);
            }
        }

        // Failsafe: if we still don't have enough traps (very small category), only then pull from global
        if (traps.length < 3) {
            attempts = 0;
            while (traps.length < 3 && attempts < 100) {
                attempts++;
                let globalIdx = Math.floor(Math.random() * this.vocabulary.length);
                let globalWord = this.vocabulary[globalIdx];
                if (globalWord.word !== this.targetWordData.word && !traps.some(t => t.meaning === globalWord.meaning)) {
                    traps.push(globalWord);
                }
            }
        }

        // 3. Assign 4 directions
        const directions = ['top', 'bottom', 'left', 'right'];
        const options = [this.targetWordData, ...traps];

        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        this.directionMap = {};
        directions.forEach((dir, i) => {
            this.directionMap[dir] = options[i];
            if (options[i] === this.targetWordData) this.correctDirection = dir;
        });

        // Directional labels based on game mode
        const labelKey = this.gameDirection === 'il-to-en' ? 'meaning' : 'word';
        const cardKey = this.gameDirection === 'il-to-en' ? 'word' : 'meaning';

        this.defTop.textContent = this.directionMap.top[labelKey];
        this.defBottom.textContent = this.directionMap.bottom[labelKey];
        this.defLeft.textContent = this.directionMap.left[labelKey];
        this.defRight.textContent = this.directionMap.right[labelKey];

        const cardHTML = `
            <div class="swipe-card" style="width: 150px; height: 220px; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); transform-origin: center center; transition: transform 0.1s linear;">
                <h1 style="font-size: clamp(0.8rem, 4vw, 1.1rem); color: white; margin: 0; pointer-events: none; text-align: center; padding: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${this.targetWordData[cardKey]}</h1>
            </div>
        `;
        this.cardStack.innerHTML = cardHTML;
        this.currentCard = this.cardStack.querySelector('.swipe-card');

        this.clearTimer();
        if (this.timerEnabled && this.timeContainer && this.timeDisplay) {
            this.timeContainer.style.display = 'flex';
            this.timeLeft = 5.0;
            this.timeDisplay.innerText = this.timeLeft.toFixed(1);
            this.timerInterval = setInterval(() => {
                this.timeLeft -= 0.1;
                this.timeDisplay.innerText = Math.max(0, this.timeLeft).toFixed(1);
                if (this.timeLeft <= 0) {
                    this.handleTimeout();
                }
            }, 100);
        } else if (this.timeContainer) {
            this.timeContainer.style.display = 'none';
        }
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleTimeout() {
        this.clearTimer();
        if (!this.currentCard) return;

        this.totalAttempts++;
        if (this.roundAttempts === 0) {
            this.roundAttempts = 1;
            if (!this.timerEnabled) {
                levelManager.markWordMastered(this.targetWordData.word, 'meaning', false);
            }
            this.missedWords.add(this.targetWordData);
        }

        this.currentCard.style.transition = 'all 0.3s';
        this.currentCard.style.transform = 'scale(0.5)';
        this.currentCard.style.opacity = '0';

        setTimeout(() => this.loadNextCard(), 500);
    }

    onPointerDown(e) {
        if (!this.gameActive || !this.currentCard) return;
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.currentCard.style.transition = 'none';

        this.resetLabelHighlight();
    }

    onPointerMove(e) {
        if (!this.isDragging || !this.currentCard) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;
        this.currentX = deltaX;
        this.currentY = deltaY;

        const rotation = deltaX * 0.05;
        this.currentCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;

        this.resetLabelHighlight();
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY) {
            if (deltaX < -30) this.highlightLabel(this.defLeft);
            else if (deltaX > 30) this.highlightLabel(this.defRight);
        } else {
            if (deltaY < -30) this.highlightLabel(this.defTop);
            else if (deltaY > 30) this.highlightLabel(this.defBottom);
        }
    }

    resetLabelHighlight() {
        [this.defTop, this.defBottom, this.defLeft, this.defRight].forEach(el => {
            el.style.opacity = '0.4';
            el.style.background = 'rgba(0,0,0,0.7)';
            el.style.borderColor = 'rgba(255,255,255,0.2)';
            el.style.transform = el === this.defLeft || el === this.defRight ? 'translateY(-50%)' : 'none';
        });
    }

    highlightLabel(el) {
        el.style.opacity = '1';
        el.style.background = 'rgba(255, 255, 255, 0.25)';
        el.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        const baseTransform = (el === this.defLeft || el === this.defRight) ? 'translateY(-50%)' : '';
        el.style.transform = baseTransform + ' scale(1.08)';
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        this.resetLabelHighlight();
        [this.defTop, this.defBottom, this.defLeft, this.defRight].forEach(el => el.style.opacity = '0');

        const threshold = 60;
        let finalDir = null;

        const absX = Math.abs(this.currentX);
        const absY = Math.abs(this.currentY);

        if (absX > absY) {
            if (absX > threshold) finalDir = (this.currentX < 0) ? 'left' : 'right';
        } else {
            if (absY > threshold) finalDir = (this.currentY < 0) ? 'top' : 'bottom';
        }

        if (finalDir) {
            this.commitSwipe(finalDir);
        } else {
            if (this.currentCard) {
                this.currentCard.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                this.currentCard.style.transform = `translate(0px, 0px) rotate(0deg)`;
            }
        }

        this.currentX = 0;
        this.currentY = 0;
    }

    stop() {
        this.clearTimer();
        this.gameActive = false;
        this.container.innerHTML = '';
        const summary = document.getElementById('summary-screen');
        if (summary) summary.classList.add('hidden');
    }

    commitSwipe(direction) {
        if (!this.currentCard) return;
        this.totalAttempts++;
        this.roundAttempts++;
        const isCorrect = direction === this.correctDirection;

        // Record mastery data on first attempt only
        if (this.roundAttempts === 1) {
            if (isCorrect || !this.timerEnabled) {
                levelManager.markWordMastered(this.targetWordData.word, 'meaning', isCorrect);
            }
        }

        if (isCorrect) {
            if (this.roundAttempts === 1) {
                this.score++;
            }

            this.currentCard.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
            let tx = 0, ty = 0;
            if (direction === 'left') tx = -window.innerWidth;
            else if (direction === 'right') tx = window.innerWidth;
            else if (direction === 'top') ty = -window.innerHeight;
            else if (direction === 'bottom') ty = window.innerHeight;

            this.currentCard.style.transform = `translate(${tx}px, ${ty}px) rotate(${this.currentX * 0.1}deg)`;
            this.currentCard.style.opacity = '0';
            this.clearTimer();
            setTimeout(() => this.loadNextCard(), 300);
        } else {
            // First time missing this word in this round
            if (this.roundAttempts === 1) {
                this.missedWords.add(this.targetWordData);
            }

            this.currentCard.style.transition = 'transform 0.1s linear';
            this.currentCard.style.boxShadow = '0 0 30px rgba(255, 0, 0, 0.6)';

            const shake = (offset) => {
                this.currentCard.style.transform = `translate(${offset}px, ${this.currentY}px)`;
            };

            setTimeout(() => shake(15), 0);
            setTimeout(() => shake(-15), 50);
            setTimeout(() => shake(10), 100);
            setTimeout(() => shake(-10), 150);
            setTimeout(() => {
                this.currentCard.style.transition = 'transform 0.4s ease';
                this.currentCard.style.transform = `translate(0px, 0px) rotate(0deg)`;
                this.currentCard.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
            }, 200);
        }
    }

    endGame() {
        this.clearTimer();
        this.gameActive = false;
        this.container.innerHTML = '';
        const accuracy = this.totalRounds === 0 ? 0 : Math.round((this.score / this.totalRounds) * 100);

        // Level up logic: if 80%+ accuracy, try to advance the global tier
        let levelUpMessage = '';
        if (accuracy >= 80) {
            const leveled = levelManager.advanceTier();
            if (leveled) levelUpMessage = `<div style="color: var(--accent-gold); font-weight: 800; margin-bottom: 1rem; animation: pulse 2s infinite;">LEVEL UP! ACCESSING NEW WORDS...</div>`;
        }

        const masteryStats = levelManager.getMasteryStats();

        let reviewHtml = '';
        if (this.missedWords.size > 0) {
            reviewHtml = `
                <h3 style="margin-top: 1.5rem; color: #ff4d4d; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Review Missed Words</h3>
                <div class="review-list" style="max-height: 200px; overflow-y: auto; text-align: left; margin-top: 0.5rem; padding-right: 5px; display: flex; flex-direction: column; gap: 8px;">
                    ${Array.from(this.missedWords).map(w => {
                const stats = masteryStats.details[w.word] || { meaning: { c: 0, t: 0 } };
                const sr = stats.meaning.t === 0 ? 0 : Math.round((stats.meaning.c / stats.meaning.t) * 100);
                return `
                            <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; border-left: 3px solid #ff4d4d;">
                                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                                    <strong style="color: white; font-size: 1rem;">${w.word}</strong>
                                    <span style="font-size: 0.7rem; color: #ff4d4d;">(${sr}%)</span>
                                </div>
                                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7); font-style: italic;">${w.meaning}</div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        const summaryEl = document.getElementById('summary-screen');
        summaryEl.innerHTML = `
            <div class="glass-card" style="width: 90%; max-width: 450px; display: flex; flex-direction: column;">
                <h2 style="margin-bottom: 1.5rem;">Session Complete</h2>
                
                ${levelUpMessage}

                <div class="stats-grid" style="margin-bottom: 1.5rem;">
                    <div class="stat-item"><span>Accuracy</span><strong>${accuracy}%</strong></div>
                    <div class="stat-item"><span>Correct</span><strong>${this.score}/${this.totalRounds}</strong></div>
                </div>
                
                ${reviewHtml}

                <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 0.8rem;">
                    <button id="swipe-restart-btn" class="btn-primary">TEKOT ULI (Play Again)</button>
                    <button id="swipe-exit-btn" class="btn-secondary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 12px; color: white;">BACK TO MENU</button>
                </div>
            </div>
        `;
        summaryEl.classList.remove('hidden');

        document.getElementById('swipe-restart-btn').addEventListener('click', () => {
            summaryEl.classList.add('hidden');
            this.showStartScreen();
        });

        document.getElementById('swipe-exit-btn').addEventListener('click', () => {
            location.reload();
        });
    }

}
