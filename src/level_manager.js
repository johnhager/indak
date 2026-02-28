class LevelManager {
    constructor() {
        this.currentBpm = 80;
        this.tiers = this.getTeirsForSpeed();
        this.currentTier = 1;
        this.consecutivePerfects = 0;
        this.consecutiveMisses = 0;
        this.vocabulary = [];
        this.masteredWords = new Set();
    }

    getTeirsForSpeed() {
        return {
            1: { name: 'Bugtaw', maxSyllables: 2 },
            2: { name: 'Lakat', maxSyllables: 3 },
            3: { name: 'Indak', maxSyllables: 10 }
        };
    }

    setSpeedMode(mode) {
        this.tiers = this.getTeirsForSpeed();
        this.currentBpm = mode === 'fast' ? 140 : 80;
        this.currentTier = 1;
    }


    setVocabulary(vocab) {
        this.vocabulary = vocab;
    }

    getFilteredVocabulary() {
        const tier = this.tiers[this.currentTier];
        return this.vocabulary.filter(word => word.syllables.length <= tier.maxSyllables);
    }

    handleRating(rating) {
        if (rating === 'PERFECT') {
            this.consecutivePerfects++;
            this.consecutiveMisses = 0;
            if (this.consecutivePerfects >= 4) { // Upgrade tier every 4 consecutive perfects
                this.consecutivePerfects = 0;
                this.checkTierUpgrade();
            }
        } else if (rating === 'MISS') {
            this.consecutiveMisses++;
            this.consecutivePerfects = 0;
            if (this.consecutiveMisses >= 3) {
                this.consecutiveMisses = 0;
                this.checkTierDowngrade();
            }
        }
    }

    checkTierUpgrade() {
        if (this.currentTier < 3) {
            this.currentTier++;
            console.log(`Tier Up: ${this.tiers[this.currentTier].name}`);
        }
    }

    checkTierDowngrade() {
        if (this.currentTier > 1) {
            this.currentTier--;
            console.log(`Tier Down: ${this.tiers[this.currentTier].name}`);
        }
    }

    markWordMastered(word) {
        this.masteredWords.add(word);
    }

    getSummary() {
        return {
            tier: this.tiers[this.currentTier].name,
            bpm: this.currentBpm,
            mastered: Array.from(this.masteredWords)
        };
    }
}

const levelManager = new LevelManager();
export default levelManager;
