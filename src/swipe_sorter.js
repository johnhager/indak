/**
 * @file swipe_sorter.js
 * @description Architecture for the "Swipe Sorter" mini-game. 
 * Handles the 4-way swiping mechanics for rapid word definition association.
 */

export class SwipeSorter {
    constructor(containerElement, vocabularyData) {
        this.container = containerElement;
        this.vocabulary = vocabularyData;
        this.currentCard = null;
        this.gameActive = false;

        // Swiping State
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isDragging = false;

        this.init();
    }

    init() {
        // Setup initial UI layout
        this.container.innerHTML = `
            <div class="swipe-sorter-ui" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none; touch-action: none;">
                <!-- Directional Definitions -->
                <div class="def-label def-top" style="position: absolute; top: 12vh; width: 85%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 12px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); z-index: 5; font-size: 0.9rem;"></div>
                <div class="def-label def-bottom" style="position: absolute; bottom: 12vh; width: 85%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 12px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); z-index: 5; font-size: 0.9rem;"></div>
                <div class="def-label def-left" style="position: absolute; left: 2vw; width: 30%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 8px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); transform: translateY(-50%); top: 50%; z-index: 5; font-size: 0.8rem;"></div>
                <div class="def-label def-right" style="position: absolute; right: 2vw; width: 30%; text-align: center; opacity: 0; transition: all 0.2s; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 8px; border-radius: 12px; color: white; border: 1px solid rgba(255,255,255,0.2); transform: translateY(-50%); top: 50%; z-index: 5; font-size: 0.8rem;"></div>
                
                <div class="card-stack" style="position: relative; z-index: 10; width: 100%; display: flex; justify-content: center;"></div>
            </div>
        `;

        this.cardStack = this.container.querySelector('.card-stack');
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
        this.loadNextCard();
    }

    loadNextCard() {
        if (!this.vocabulary || this.vocabulary.length < 4) return;

        // 1. Pick a random word
        const targetIndex = Math.floor(Math.random() * this.vocabulary.length);
        this.targetWordData = this.vocabulary[targetIndex];

        // 2. Pick 3 unique trap definitions
        let traps = [];
        while (traps.length < 3) {
            let trapIdx = Math.floor(Math.random() * this.vocabulary.length);
            // Check for meaning duplicates to avoid confusing the user
            if (trapIdx !== targetIndex && !traps.some(t => t.meaning === this.vocabulary[trapIdx].meaning)) {
                traps.push(this.vocabulary[trapIdx]);
            }
        }

        // 3. Assign 4 directions (Top, Bottom, Left, Right)
        const directions = ['top', 'bottom', 'left', 'right'];
        const options = [this.targetWordData, ...traps];

        // Shuffle options
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        this.directionMap = {};
        directions.forEach((dir, i) => {
            this.directionMap[dir] = options[i];
            if (options[i] === this.targetWordData) this.correctDirection = dir;
        });

        // 4. Update Labels
        this.defTop.textContent = this.directionMap.top.meaning;
        this.defBottom.textContent = this.directionMap.bottom.meaning;
        this.defLeft.textContent = this.directionMap.left.meaning;
        this.defRight.textContent = this.directionMap.right.meaning;

        // 5. Render Card
        const cardHTML = `
            <div class="swipe-card" style="width: 180px; height: 260px; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); transform-origin: center center; transition: transform 0.1s linear;">
                <h1 style="font-size: clamp(0.9rem, 5vw, 1.3rem); color: white; margin: 0; pointer-events: none; text-align: center; padding: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${this.targetWordData.word}</h1>
            </div>
        `;
        this.cardStack.innerHTML = cardHTML;
        this.currentCard = this.cardStack.querySelector('.swipe-card');
    }

    onPointerDown(e) {
        if (!this.gameActive || !this.currentCard) return;
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.currentCard.style.transition = 'none';

        // Show all labels slightly
        [this.defTop, this.defBottom, this.defLeft, this.defRight].forEach(el => el.style.opacity = '0.4');
    }

    onPointerMove(e) {
        if (!this.isDragging || !this.currentCard) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;
        this.currentX = deltaX;
        this.currentY = deltaY;

        const rotation = deltaX * 0.05;
        this.currentCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;

        // Visual Feedback for primary direction
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

    commitSwipe(direction) {
        if (!this.currentCard) return;
        const isCorrect = direction === this.correctDirection;

        if (isCorrect) {
            this.currentCard.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
            let tx = 0, ty = 0;
            if (direction === 'left') tx = -window.innerWidth;
            else if (direction === 'right') tx = window.innerWidth;
            else if (direction === 'top') ty = -window.innerHeight;
            else if (direction === 'bottom') ty = window.innerHeight;

            this.currentCard.style.transform = `translate(${tx}px, ${ty}px) rotate(${this.currentX * 0.1}deg)`;
            this.currentCard.style.opacity = '0';
            setTimeout(() => this.loadNextCard(), 300);
        } else {
            // Shake/Reset
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
}
