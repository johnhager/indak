import cloudManager from './cloud_manager.js';
import { Translator } from './translator.js';

class LevelManager {
    constructor() {
        this.currentBpm = 80;
        this.tiers = this.getTeirsForSpeed();
        this.currentTier = 1;
        this.consecutivePerfects = 0;
        this.consecutiveMisses = 0;
        this.vocabulary = [];
        this.speedMode = 'native'; // Default

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

        // Curriculum V1: Track lesson progress
        this.completedLessons = JSON.parse(localStorage.getItem('indak_completed_lessons')) || [];
        this.unlockedLessons = JSON.parse(localStorage.getItem('indak_unlocked_lessons')) || ['greetings-101'];

        // Initialize cloud sync
        this.syncWithCloud();
    }

    markLessonComplete(lessonId) {
        if (!this.completedLessons.includes(lessonId)) {
            this.completedLessons.push(lessonId);
            localStorage.setItem('indak_completed_lessons', JSON.stringify(this.completedLessons));
            this.syncWithCloud();
        }
    }

    unlockLesson(lessonId) {
        if (!this.unlockedLessons.includes(lessonId)) {
            this.unlockedLessons.push(lessonId);
            localStorage.setItem('indak_unlocked_lessons', JSON.stringify(this.unlockedLessons));
        }
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
            3: { name: 'Indak', maxSyllables: 10 },
            4: { name: 'Gisantes', description: 'Particles & Negation' },
            5: { name: 'Pakiana', description: 'Interrogatives' },
            6: { name: 'Kinaandan', description: 'Common Phrases' }
        };
    }

    setSpeedMode(mode) {
        this.speedMode = mode;
        this.tiers = this.getTeirsForSpeed();
        // Both Native and Complex run at full speed
        this.currentBpm = 140;
        // logic: don't reset this.currentTier here, let it persist from constructor or previous sessions
    }

    setVocabulary(vocab) {
        this.vocabulary = vocab;
    }

    getFilteredVocabulary(gameType = 'rhythm', excludeWords = [], hardMode = false, categories = []) {
        const tier = this.tiers[this.currentTier];

        // 1. Identify valid candidates based on tier logic and optionally categories
        let candidates = this.vocabulary.filter(word => {
            if (categories.length > 0) {
                if (!categories.includes(word.category)) return false;

                // When specific categories are selected, we want to allow practicing ANY word 
                // from that category that the user has unlocked, not just the active tier.
                if (word.tier) {
                    return word.tier <= this.currentTier;
                } else {
                    return this.currentTier >= 4 || word.syllables.length <= (tier.maxSyllables || 10);
                }
            }

            // Normal overall progression logic:
            // 1. Complex Mode constraint - force at least 3 syllables
            if (this.speedMode === 'complex') {
                if (word.syllables.length < 3) return false;
                // Allow any 3+ syllable word from the player's current or previous tiers
                const wordTier = word.tier || 1;
                return wordTier <= this.currentTier;
            }

            // 2. Tier 4+ uses explicit tier tagging
            if (this.currentTier >= 4) {
                return word.tier === this.currentTier;
            }

            // 3. Tiers 1-3 use syllable-based progression
            return word.syllables.length <= (tier.maxSyllables || 10);
        });

        // 1.5 Avoid repeating words if possible, but fallback if pool is too small
        let filteredCandidates = candidates.filter(word => !excludeWords.includes(word.word));
        if (filteredCandidates.length > 0) {
            candidates = filteredCandidates;
        }

        if (candidates.length === 0) return [];

        // 2. Score candidates based on the '2-Part Strategy': 
        // Part A: Mastery/Weakness (Low SR = High weight)
        // Part B: Complexity/Syllables (More syllables = High weight)
        const scoredCandidates = candidates.map(word => {
            const cleanKey = Translator.normalize(word.word);
            const stats = this.masteryData[cleanKey] || {
                rhythm: { c: 0, t: 0 },
                meaning: { c: 0, t: 0 }
            };
            const skill = stats[gameType] || { c: 0, t: 0 };
            const sr = skill.t === 0 ? 0 : skill.c / skill.t;

            // Mastery Score (0-50): Priority to failing or new words
            let masteryScore = skill.t === 0 ? 40 : Math.round(50 * (1 - sr));

            // Complexity Score (0-50): Exponentially favor longer words to prevent them being drowned out
            // Tier 3 words (4+ syllables) get significant boosts
            const syllableCount = word.syllables.length;
            const complexityScore = Math.pow(syllableCount, 1.8);

            // Freshness Score (0-10): Slightly favor words with very few attempts
            const freshnessScore = skill.t < 3 ? 10 : 0;

            const totalScore = Math.max(1, masteryScore + complexityScore + freshnessScore);

            return { word, score: totalScore };
        });

        // 3. Construct weighted pool
        let finalCandidates = scoredCandidates;

        // Hard Mode: Filter to top 30% of 'problem' words (most challenging/weakest)
        if (hardMode) {
            scoredCandidates.sort((a, b) => b.score - a.score);
            const poolSize = Math.max(12, Math.ceil(scoredCandidates.length * 0.3));
            finalCandidates = scoredCandidates.slice(0, poolSize);
        }

        const pool = [];
        finalCandidates.forEach(cand => {
            const weight = Math.round(cand.score);
            for (let i = 0; i < weight; i++) {
                pool.push(cand.word);
            }
        });

        return pool;
    }

    advanceTier() {
        if (this.currentTier < 6) {
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
        if (this.currentTier < 6) {
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
        const cleanWord = Translator.normalize(word);
        if (!this.masteryData[cleanWord]) {
            this.masteryData[cleanWord] = {
                rhythm: { c: 0, t: 0 },
                meaning: { c: 0, t: 0 }
            };
        }

        const stats = this.masteryData[cleanWord][type] || { c: 0, t: 0 };
        stats.t++;
        if (success) stats.c++;

        this.masteryData[cleanWord][type] = stats;
        localStorage.setItem('indak_mastery_v3', JSON.stringify(this.masteryData));
        this.syncWithCloud();
    }

    async syncWithCloud() {
        if (this._isSyncing) return;
        this._isSyncing = true;

        try {
            await cloudManager.ready; // Wait for initial auth attempt

            // 1. Load from cloud
            const cloudData = await cloudManager.loadProgress();
            if (cloudData) {
                let merged = false;

                // Prefer higher tier
                if (cloudData.tier > this.currentTier) {
                    console.log(`LevelManager: Upgrading Tier from ${this.currentTier} to ${cloudData.tier}`);
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
                            if (cloudStats[type].t > (this.masteryData[word][type]?.t || 0)) {
                                this.masteryData[word][type] = cloudStats[type];
                                merged = true;
                            }
                        });
                    }
                }

                if (merged) {
                    localStorage.setItem('indak_mastery_v3', JSON.stringify(this.masteryData));
                    localStorage.setItem('indak_last_sync', Date.now());
                    console.log("LevelManager: Local storage updated with cloud data.");
                }
            } else {
                console.log("LevelManager: Cloud is empty or pull failed.");
            }

            // 2. Save current state to cloud
            await cloudManager.saveProgress(this.masteryData, this.currentTier);
        } catch (e) {
            console.error("LevelManager: Sync failed", e);
        } finally {
            this._isSyncing = false;
        }
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
