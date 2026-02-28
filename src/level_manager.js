class LevelManager {
    constructor() {
        this.baseBpm = 80;
        this.maxBpm = 160;
        this.minBpm = 60;
        this.tiers = this.getTeirsForSpeed('slow');
        this.currentTier = 1;
        this.adaptiveBpm = this.baseBpm;
        this.consecutivePerfects = 0;
        this.consecutiveMisses = 0;
        this.vocabulary = [];
        this.masteredWords = new Set();
    }

    getTeirsForSpeed(mode) {
        if (mode === 'fast') {
            return {
                1: { name: 'Bugtaw', bpm: 140, maxSyllables: 2 },
                2: { name: 'Lakat', bpm: 160, maxSyllables: 3 },
                3: { name: 'Indak', bpm: 180, maxSyllables: 10 }
            };
        }
        return {
            1: { name: 'Bugtaw', bpm: 80, maxSyllables: 2 },
            2: { name: 'Lakat', bpm: 100, maxSyllables: 3 },
            3: { name: 'Indak', bpm: 120, maxSyllables: 10 }
        };
    }

    setSpeedMode(mode) {
        this.tiers = this.getTeirsForSpeed(mode);
        this.baseBpm = this.tiers[1].bpm;
        this.maxBpm = mode === 'fast' ? 220 : 160;
        this.minBpm = mode === 'fast' ? 120 : 60;
        this.adaptiveBpm = this.baseBpm;
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
            if (this.consecutivePerfects >= 3) {
                this.adaptiveBpm = Math.min(this.adaptiveBpm + 2, this.maxBpm);
                this.consecutivePerfects = 0;
                this.checkTierUpgrade();
            }
        } else if (rating === 'MISS') {
            this.consecutiveMisses++;
            this.consecutivePerfects = 0;
            if (this.consecutiveMisses >= 2) {
                this.adaptiveBpm = Math.max(this.adaptiveBpm - 5, this.minBpm);
                this.consecutiveMisses = 0;
                this.checkTierDowngrade();
            }
        }
    }

    checkTierUpgrade() {
        if (this.currentTier < 3 && this.adaptiveBpm >= this.tiers[this.currentTier + 1].bpm) {
            this.currentTier++;
            console.log(`Tier Up: ${this.tiers[this.currentTier].name}`);
        }
    }

    checkTierDowngrade() {
        if (this.currentTier > 1 && this.adaptiveBpm < this.tiers[this.currentTier].bpm) {
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
            bpm: Math.floor(this.adaptiveBpm),
            mastered: Array.from(this.masteredWords)
        };
    }
}

const levelManager = new LevelManager();
export default levelManager;
