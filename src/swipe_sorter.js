/**
 * @file swipe_sorter.js
 * @description Architecture for the "Swipe Sorter" mini-game. 
 * Handles the binary Tinder-style swiping mechanics for rapid word definition association.
 */

// Import shared audio or level managers if available
// import { AudioManager } from './audio_manager.js';
// import { LevelManager } from './level_manager.js';

export class SwipeSorter {
    constructor(containerElement, vocabularyData) {
        this.container = containerElement;
        this.vocabulary = vocabularyData;
        this.currentCard = null;
        this.gameActive = false;

        // Swiping State
        this.startX = 0;
        this.currentX = 0;
        this.isDragging = false;

        this.init();
    }

    init() {
        // Setup initial UI layout
        this.container.innerHTML = `
            <div class="swipe-sorter-ui" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none; touch-action: none;">
                <div class="definition-left" style="position: absolute; left: 1rem; opacity: 0; transition: opacity 0.2s;"></div>
                <div class="definition-right" style="position: absolute; right: 1rem; opacity: 0; transition: opacity 0.2s;"></div>
                <div class="card-stack" style="position: relative; z-index: 10;"></div>
            </div>
        `;

        this.cardStack = this.container.querySelector('.card-stack');
        this.defLeft = this.container.querySelector('.definition-left');
        this.defRight = this.container.querySelector('.definition-right');

        this.bindEvents();
    }

    bindEvents() {
        // Pointer events for desktop + mobile unified dragging
        this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.container.addEventListener('pointermove', this.onPointerMove.bind(this));

        // Use window for release to catch drags outside bounds
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
        window.addEventListener('pointercancel', this.onPointerUp.bind(this));
    }

    startRound() {
        this.gameActive = true;
        this.loadNextCard();
    }

    loadNextCard() {
        if (!this.vocabulary || this.vocabulary.length < 2) return;

        // 1. Pick a random word from this.vocabulary
        const targetIndex = Math.floor(Math.random() * this.vocabulary.length);
        this.targetWordData = this.vocabulary[targetIndex];

        // 2. Pick a "trap" definition from this.vocabulary
        let trapIndex = Math.floor(Math.random() * this.vocabulary.length);
        while (trapIndex === targetIndex) {
            trapIndex = Math.floor(Math.random() * this.vocabulary.length);
        }
        this.trapWordData = this.vocabulary[trapIndex];

        // 3. Randomize whether left or right is the correct answer
        this.correctDirection = Math.random() < 0.5 ? 'left' : 'right';

        // 4. Render the card in DOM
        const cardHTML = `
            <div class="swipe-card" style="width: 250px; height: 350px; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); transform-origin: center bottom;">
                <h1 style="font-size: clamp(2rem, 8vw, 3rem); color: white; margin: 0; pointer-events: none;">${this.targetWordData.word}</h1>
            </div>
        `;
        this.cardStack.innerHTML = cardHTML;
        this.currentCard = this.cardStack.querySelector('.swipe-card');

        // 5. Update .definition-left and .definition-right text
        if (this.correctDirection === 'left') {
            this.defLeft.innerHTML = `<div>&larr; ${this.targetWordData.meaning}</div>`;
            this.defRight.innerHTML = `<div>${this.trapWordData.meaning} &rarr;</div>`;
        } else {
            this.defLeft.innerHTML = `<div>&larr; ${this.trapWordData.meaning}</div>`;
            this.defRight.innerHTML = `<div>${this.targetWordData.meaning} &rarr;</div>`;
        }
    }

    onPointerDown(e) {
        if (!this.gameActive || !this.currentCard) return;
        this.isDragging = true;
        this.startX = e.clientX;

        // Remove transitions so it follows finger instantly
        this.currentCard.style.transition = 'none';

        // Show definitions slightly
        this.defLeft.style.opacity = '0.5';
        this.defRight.style.opacity = '0.5';
    }

    onPointerMove(e) {
        if (!this.isDragging || !this.currentCard) return;

        const deltaX = e.clientX - this.startX;
        this.currentX = deltaX;

        // Calculate rotation based on horizontal drag distance
        const rotation = deltaX * 0.05;

        this.currentCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

        // Highlight the side being dragged towards
        if (deltaX < 0) {
            this.defLeft.style.opacity = '1';
            this.defLeft.style.color = 'var(--accent-color, white)';
            this.defRight.style.opacity = '0.5';
            this.defRight.style.color = 'white';
        } else {
            this.defRight.style.opacity = '1';
            this.defRight.style.color = 'var(--accent-color, white)';
            this.defLeft.style.opacity = '0.5';
            this.defLeft.style.color = 'white';
        }
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Hide definitions again
        this.defLeft.style.opacity = '0';
        this.defRight.style.opacity = '0';

        const screenWidth = window.innerWidth;
        const threshold = screenWidth * 0.35; // 35% of screen to commit

        if (this.currentX < -threshold) {
            this.commitSwipe('left');
        } else if (this.currentX > threshold) {
            this.commitSwipe('right');
        } else {
            // Snap back
            if (this.currentCard) {
                this.currentCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
                this.currentCard.style.transform = `translateX(0px) rotate(0deg)`;
            }
        }

        this.currentX = 0;
    }

    commitSwipe(direction) {
        if (!this.currentCard) return;

        const isCorrect = direction === this.correctDirection;

        // Evaluate logic
        if (isCorrect) {
            // play 'perfect' synth (AudioManager call would go here)
            this.currentCard.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
            const throwX = direction === 'left' ? -window.innerWidth : window.innerWidth;
            const throwRotate = direction === 'left' ? -30 : 30;
            this.currentCard.style.transform = `translateX(${throwX}px) rotate(${throwRotate}deg)`;
            this.currentCard.style.opacity = '0';

            // Load next after animation
            setTimeout(() => {
                this.loadNextCard();
            }, 400);
        } else {
            // play 'error' synth (AudioManager call would go here)
            // Shake card red, reset position
            this.currentCard.style.transition = 'transform 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97)';
            this.currentCard.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.6)';

            // Basic shake animation via inline transforms (simplistic for now)
            this.currentCard.style.transform = `translateX(10px)`;
            setTimeout(() => { this.currentCard.style.transform = `translateX(-10px)`; }, 50);
            setTimeout(() => { this.currentCard.style.transform = `translateX(5px)`; }, 100);
            setTimeout(() => { this.currentCard.style.transform = `translateX(-5px)`; }, 150);
            setTimeout(() => {
                this.currentCard.style.transform = `translateX(0px) rotate(0deg)`;
                this.currentCard.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
            }, 200);
        }
    }
}
