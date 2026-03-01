import cloudManager from './cloud_manager.js';

class LevelManager {
    constructor() {
        this.currentBpm = 80;
        this.tiers = this.getTeirsForSpeed();
        this.currentTier = 1;
        this.consecutivePerfects = 0;
        this.consecutiveMisses = 0;
        this.vocabulary = [];

        // Mastery V3: { [word]: { rhythm: { c: N, t: M }, meaning: { c: N, t: M } } }
        // Migration from V2 (bool) to V3 (stats)
        const rawData = JSON.parse(localStorage.getItem('indak_mastery_v3')) ||
            JSON.parse(localStorage.getItem('indak_mastery_v2')) || {};

        this.masteryData = {};
        for (const [word, stats] of Object.entries(rawData)) {
            this.masteryData[word] = {
                rhythm: this.migrateStat(stats.rhythm),
                meaning: this.migrateStat(stats.meaning)
            };
        }

        this.currentTier = parseInt(localStorage.getItem('indak_tier')) || 1;

        // Initialize cloud sync
        this.syncWithCloud();
    }

    migrateStat(val) {
        if (val === true) return { c: 5, t: 5 }; // Assume stable
        if (typeof val === 'object' && val !== null) return val; // Already v3
        return { c: 0, t: 0 };
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

    getFilteredVocabulary(gameType = 'rhythm', excludeWords = [], hardMode = false) {
        const tier = this.tiers[this.currentTier];
        let validWords = this.vocabulary.filter(word => word.syllables.length <= tier.maxSyllables);

        // Hard Mode: Filter to bottom 50% success rate
        if (hardMode) {
            const wordStats = validWords.map(word => {
                const stats = this.masteryData[word.word] || {
                    rhythm: { c: 0, t: 0 },
                    meaning: { c: 0, t: 0 }
                };
                const skill = stats[gameType] || { c: 0, t: 0 };
                const sr = skill.t === 0 ? 0 : skill.c / skill.t;
                return { word, sr };
            });

            // Sort by SR (asc)
            wordStats.sort((a, b) => a.sr - b.sr);
            const cutoff = Math.max(4, Math.ceil(wordStats.length / 2));
            validWords = wordStats.slice(0, cutoff).map(s => s.word);
        }

        const nonDuplicateWords = validWords.filter(w => !excludeWords.includes(w.word));
        if (nonDuplicateWords.length > 0) {
            validWords = nonDuplicateWords;
        }

        let pool = [];
        validWords.forEach(word => {
            const stats = this.masteryData[word.word] || {
                rhythm: { c: 0, t: 0 },
                meaning: { c: 0, t: 0 }
            };
            const skill = stats[gameType] || { c: 0, t: 0 };

            // Inverse Proportional Spawning:
            // Successfully mastered words (sr=1) get weight 1
            // Words with 0 tries (t=0) get weight 15
            // Partial success scales between 1-10
            const sr = skill.t === 0 ? 0 : skill.c / skill.t;
            let weight = Math.max(1, Math.round(10 - (9 * sr)));

            if (skill.t === 0) weight = 15;

            for (let i = 0; i < weight; i++) {
                pool.push(word);
            }
        });
        return pool;
    }

    advanceTier() {
        if (this.currentTier < 3) {
            this.currentTier++;
            localStorage.setItem('indak_tier', this.currentTier);
            this.syncWithCloud();
            return true;
        }
        return false;
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
            localStorage.setItem('indak_tier', this.currentTier);
            this.syncWithCloud();
        }
    }

    checkTierDowngrade() {
        if (this.currentTier > 1) {
            this.currentTier--;
            localStorage.setItem('indak_tier', this.currentTier);
            this.syncWithCloud();
        }
    }

    markWordMastered(word, type, success = true) {
        if (!this.masteryData[word]) {
            this.masteryData[word] = {
                rhythm: { c: 0, t: 0 },
                meaning: { c: 0, t: 0 }
            };
        }

        const stats = this.masteryData[word][type] || { c: 0, t: 0 };
        stats.t++;
        if (success) stats.c++;

        this.masteryData[word][type] = stats;
        localStorage.setItem('indak_mastery_v3', JSON.stringify(this.masteryData));
        this.syncWithCloud();
    }

    async syncWithCloud() {
        await cloudManager.init();

        // 1. Load from cloud
        const cloudData = await cloudManager.loadProgress();
        if (cloudData) {
            // Merge logic: Prefer the data with the highest total attempts (t) per word
            let merged = false;

            // Prefer higher tier
            if (cloudData.tier > this.currentTier) {
                this.currentTier = cloudData.tier;
                localStorage.setItem('indak_tier', this.currentTier);
                merged = true;
            }

            for (const [word, cloudStats] of Object.entries(cloudData.mastery)) {
                if (!this.masteryData[word]) {
                    this.masteryData[word] = cloudStats;
                    merged = true;
                } else {
                    ['rhythm', 'meaning'].forEach(type => {
                        if (cloudStats[type].t > this.masteryData[word][type].t) {
                            this.masteryData[word][type] = cloudStats[type];
                            merged = true;
                        }
                    });
                }
            }

            if (merged) {
                localStorage.setItem('indak_mastery_v3', JSON.stringify(this.masteryData));
                console.log("LevelManager: Merged cloud data into local");
            }
        }

        // 2. Save current state to cloud
        await cloudManager.saveProgress(this.masteryData, this.currentTier);
    }

    getMasteryStats() {
        const totalWords = this.vocabulary.length;
        if (totalWords === 0) {
            return {
                total: 0, rhythm: 0, meaning: 0, full: 0,
                rhythmPercent: 0, meaningPercent: 0, fullPercent: 0,
                details: this.masteryData
            };
        }

        const threshold = 0.9;
        const minAttempts = 5;
        const rhythmCount = Object.values(this.masteryData).filter(m =>
            m.rhythm.t >= minAttempts && (m.rhythm.c / m.rhythm.t) >= threshold).length;
        const meaningCount = Object.values(this.masteryData).filter(m =>
            m.meaning.t >= minAttempts && (m.meaning.c / m.meaning.t) >= threshold).length;

        const bothCount = Object.values(this.masteryData).filter(m =>
            (m.rhythm.t >= minAttempts && (m.rhythm.c / m.rhythm.t) >= threshold) &&
            (m.meaning.t >= minAttempts && (m.meaning.c / m.meaning.t) >= threshold)
        ).length;

        return {
            total: totalWords,
            rhythm: rhythmCount,
            meaning: meaningCount,
            rhythmPercent: Math.round((rhythmCount / totalWords) * 100),
            meaningPercent: Math.round((meaningCount / totalWords) * 100),
            details: this.masteryData
        };
    }

    getSummary() {
        const stats = this.getMasteryStats();
        return {
            tier: this.tiers[this.currentTier].name,
            bpm: this.currentBpm,
            rhythmMastered: stats.rhythm,
            meaningMastered: stats.meaning,
            totalWords: stats.total,
            mastered: Object.keys(this.masteryData)
        };
    }
}

const levelManager = new LevelManager();
export default levelManager;
