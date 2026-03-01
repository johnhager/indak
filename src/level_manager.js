class LevelManager {
    constructor() {
        this.currentBpm = 80;
        this.tiers = this.getTeirsForSpeed();
        this.currentTier = 1;
        this.consecutivePerfects = 0;
        this.consecutiveMisses = 0;
        this.vocabulary = [];

        // Granular Mastery: { [word]: { rhythm: bool, meaning: bool } }
        this.masteryData = JSON.parse(localStorage.getItem('indak_mastery_v2')) || {};
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

    getFilteredVocabulary(gameType = 'rhythm') {
        const tier = this.tiers[this.currentTier];
        const validWords = this.vocabulary.filter(word => word.syllables.length <= tier.maxSyllables);

        let pool = [];
        validWords.forEach(word => {
            const status = this.masteryData[word.word] || { rhythm: false, meaning: false };

            // Spaced Repetition: 20% reduction per specific mastery type
            // If the specific skill for this game is mastered, reduce weighting
            let weight = 5;
            if (gameType === 'rhythm' && status.rhythm) weight = 4;
            if (gameType === 'meaning' && status.meaning) weight = 4;
            // Bonus reduction if BOTH are mastered
            if (status.rhythm && status.meaning) weight = 3;

            for (let i = 0; i < weight; i++) {
                pool.push(word);
            }
        });
        return pool;
    }

    handleRating(rating) {
        if (rating === 'PERFECT') {
            this.consecutivePerfects++;
            this.consecutiveMisses = 0;
            if (this.consecutivePerfects >= 4) {
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
        }
    }

    checkTierDowngrade() {
        if (this.currentTier > 1) {
            this.currentTier--;
        }
    }

    markWordMastered(word, type) {
        if (!this.masteryData[word]) {
            this.masteryData[word] = { rhythm: false, meaning: false };
        }
        this.masteryData[word][type] = true;
        localStorage.setItem('indak_mastery_v2', JSON.stringify(this.masteryData));
    }

    getMasteryStats() {
        const totalWords = this.vocabulary.length || 1;
        const rhythmCount = Object.values(this.masteryData).filter(m => m.rhythm).length;
        const meaningCount = Object.values(this.masteryData).filter(m => m.meaning).length;
        const bothCount = Object.values(this.masteryData).filter(m => m.rhythm && m.meaning).length;

        return {
            total: totalWords,
            rhythm: rhythmCount,
            meaning: meaningCount,
            full: bothCount,
            rhythmPercent: Math.round((rhythmCount / totalWords) * 100),
            meaningPercent: Math.round((meaningCount / totalWords) * 100),
            fullPercent: Math.round((bothCount / totalWords) * 100),
            details: this.masteryData
        };
    }

    getSummary() {
        return {
            tier: this.tiers[this.currentTier].name,
            bpm: this.currentBpm,
            masteredCount: Object.keys(this.masteryData).length
        };
    }
}

const levelManager = new LevelManager();
export default levelManager;
