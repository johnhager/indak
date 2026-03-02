/**
 * @file translator.js
 * @description Provides English-to-Ilonggo translation with basic grammar handling,
 * lemmatization, and resource-heavy fallback mapping.
 */

export class Translator {
    constructor(vocabulary, sentences, fullDictionary, fullPhrasebook) {
        this.vocabulary = vocabulary || [];
        this.sentences = sentences || [];
        this.fullDictionary = fullDictionary || {};
        this.fullPhrasebook = fullPhrasebook || {};

        // Words to ignore in English during word-for-word translation
        this.englishStopWords = new Set([
            'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'a', 'an', 'the', 'do', 'does', 'did', 'done',
            'has', 'have', 'had', 'getting', 'become'
        ]);

        // Priority manual mappings for the translator
        this.overrides = {
            'i': 'ako',
            'me': 'akon',
            'my': 'akon',
            'you': 'ikaw',
            'your': 'imo',
            'we': 'kita',
            'they': 'sila',
            'he': 'siya',
            'she': 'siya',
            'hello': 'kamusta',
            'hi': 'kamusta',
            'ilonggo': 'Ilonggo',
            'hiligaynon': 'Hiligaynon'
        };
    }

    setFullDictionary(dict) { this.fullDictionary = dict; }
    setFullPhrasebook(pb) { this.fullPhrasebook = pb; }

    /**
     * Translates a string from English to Ilonggo.
     * @param {string} text - The English text to translate.
     * @returns {Object} { translatedText: string, method: string }
     */
    translate(text) {
        if (!text || text.trim() === "") return { translatedText: "", method: "none" };

        const input = text.trim().toLowerCase();
        const cleanInput = input.replace(/[.,?!]/g, "");

        // 1. Precise Phrasebook Match (sentences.json or full_phrasebook.json)
        const phraseMatch = this.findPhraseMatch(cleanInput);
        if (phraseMatch) {
            return { translatedText: phraseMatch, method: "phrasebook" };
        }

        // 2. Word-for-Word Logic with Grammar & Lemmatization
        const wordMatch = this.translateAdvanced(input);
        if (wordMatch) {
            return { translatedText: wordMatch, method: "dictionary" };
        }

        return { translatedText: "Patawad (Sorry), N/A", method: "none" };
    }

    findPhraseMatch(input) {
        if (!input) return null;
        const searchPhrase = input.toLowerCase().replace(/[^\w\s']/g, '').trim();

        // High Quality Curated Match
        const curatedMatch = this.sentences.find(s =>
            s.english.toLowerCase().replace(/[^\w\s']/g, '') === searchPhrase
        );
        if (curatedMatch) return Array.isArray(curatedMatch.ilonggo_chunks) ? curatedMatch.ilonggo_chunks.join(" ") : (curatedMatch.ilonggo || "");

        // Large Dictionary Match
        if (this.fullPhrasebook[searchPhrase]) return this.fullPhrasebook[searchPhrase];

        // Fuzzy Match (Longer sentences only)
        if (searchPhrase.length > 5) {
            const pbKeys = Object.keys(this.fullPhrasebook);
            const partialKey = pbKeys.find(k =>
                k.includes(` ${searchPhrase} `) ||
                k.startsWith(`${searchPhrase} `) ||
                k.endsWith(` ${searchPhrase}`)
            );
            if (partialKey && partialKey.length > 8) return this.fullPhrasebook[partialKey];
        }

        return null;
    }

    /**
     * Advanced word-by-word translation with stemming and morphology
     */
    translateAdvanced(input) {
        const words = input.toLowerCase().match(/\w+|[^\w\s]/g) || [];
        const translated = [];
        let anyFound = false;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];

            // Punctuation
            if (/^[^\w\s]$/.test(word)) {
                translated.push(word);
                continue;
            }

            // Skip common English service words (am, is, the)
            if (this.englishStopWords.has(word)) continue;

            // Priority 1: Overrides
            if (this.overrides[word]) {
                translated.push(this.overrides[word]);
                anyFound = true;
                continue;
            }

            // Priority 2: Try Exact Dictionary/Vocab Match
            let result = this.lookupWord(word);
            if (result) {
                translated.push(result);
                anyFound = true;
                continue;
            }

            // Priority 3: Stemming (Handle -ing, -s, -ed)
            let stem = null;
            let morphology = null;

            if (word.endsWith('ing')) {
                stem = word.slice(0, -3);
                morphology = 'naga'; // present progressive
            } else if (word.endsWith('ed') && word.length > 4) {
                stem = word.slice(0, -2);
                morphology = 'nag'; // past
            } else if (word.endsWith('s') && word.length > 3) {
                stem = word.slice(0, -1);
            }

            if (stem) {
                let stemResult = this.lookupWord(stem);
                if (stemResult) {
                    // Apply morphology if it looks like we need it
                    if (morphology && !stemResult.startsWith('nag')) {
                        // Very basic prefixing
                        translated.push(morphology + stemResult.toLowerCase());
                    } else {
                        translated.push(stemResult);
                    }
                    anyFound = true;
                    continue;
                }
            }

            // Not found
            translated.push(`[${word}?]`);
        }

        // Formatting: capitalize first letter, fix spacing
        let result = translated.join(" ").replace(/\s+([.,?!])/g, '$1');
        if (result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }

        return anyFound ? result : null;
    }

    lookupWord(word) {
        // A. Curated Vocabulary (Exact meaning)
        let vMatch = this.vocabulary.find(v => v.meaning && v.meaning.toLowerCase() === word);
        if (vMatch) return vMatch.word;

        // B. Curated Vocabulary (Keyword in definition)
        vMatch = this.vocabulary.find(v => {
            if (!v.meaning) return false;
            const defs = v.meaning.toLowerCase().split(/[\/,\s]+/).map(d => d.replace(/[.,?!]/g, ""));
            return defs.includes(word);
        });
        if (vMatch) return vMatch.word;

        // C. Full Dictionary
        if (this.fullDictionary[word]) {
            const res = this.fullDictionary[word];
            return Array.isArray(res) ? res[0] : res;
        }

        return null;
    }
}
