/**
 * @file translator.js
 * @description Provides basic English-to-Ilonggo translation by matching against
 * existing phrasebook sentences and fallback dictionary lookups.
 */

export class Translator {
    constructor(vocabulary, sentences, fullDictionary, fullPhrasebook) {
        this.vocabulary = vocabulary || [];
        this.sentences = sentences || [];
        this.fullDictionary = fullDictionary || {};
        this.fullPhrasebook = fullPhrasebook || {};
    }

    setFullDictionary(dict) {
        this.fullDictionary = dict;
    }

    setFullPhrasebook(pb) {
        this.fullPhrasebook = pb;
    }

    /**
     * Translates a string from English to Ilonggo.
     * @param {string} text - The English text to translate.
     * @returns {Object} { translatedText: string, method: string }
     */
    translate(text) {
        if (!text || text.trim() === "") {
            return { translatedText: "", method: "none" };
        }

        const input = text.trim().toLowerCase().replace(/[.,?!]/g, "");

        // 1. Phrasebook Match (Exact or Fuzzy)
        const phraseMatch = this.findPhraseMatch(input);
        if (phraseMatch) {
            return { translatedText: phraseMatch, method: "phrasebook" };
        }

        // 2. Word-for-Word Fallback
        const wordMatch = this.translateWordByWord(input);
        if (wordMatch) {
            return { translatedText: wordMatch, method: "dictionary" };
        }

        return { translatedText: "Patawad (Sorry), N/A", method: "none" };
    }

    /**
     * Searches for a matching sentence in the phrasebook.
     */
    findPhraseMatch(input) {
        if (!input) return null;
        const searchPhrase = input.toLowerCase().replace(/[^\w\s']/g, '').trim();

        // 1. Precise Curated Phrase Match (sentences.json)
        const curatedMatch = this.sentences.find(s =>
            s.english.toLowerCase().replace(/[^\w\s']/g, '') === searchPhrase
        );
        if (curatedMatch) return Array.isArray(curatedMatch.ilonggo_chunks) ? curatedMatch.ilonggo_chunks.join(" ") : curatedMatch.ilonggo;

        // 2. Large Phrasebook Match (full_phrasebook.json)
        if (this.fullPhrasebook[searchPhrase]) {
            return this.fullPhrasebook[searchPhrase];
        }

        // 3. Simple fuzzy/partial search in full phrasebook
        // If input is contained in a phrasebook key (like "doing?" in "how are you doing?")
        const pbKeys = Object.keys(this.fullPhrasebook);
        const partialKey = pbKeys.find(k => k.includes(searchPhrase) || searchPhrase.includes(k));
        if (partialKey && (partialKey.length > 5 || searchPhrase.length > 5)) {
            return this.fullPhrasebook[partialKey];
        }

        // 4. Substring match in curated phrases
        const partial = this.sentences.find(s => s.english.toLowerCase().includes(searchPhrase));
        if (partial && partial.english.length > 3) return Array.isArray(partial.ilonggo_chunks) ? partial.ilonggo_chunks.join(" ") : (partial.ilonggo || "");

        return null;
    }

    /**
     * Attempts to translate each word individually.
     */
    translateWordByWord(input) {
        // Tokenize words but try to identify common markers/particles
        const words = input.toLowerCase().match(/\w+|[^\w\s]/g) || [];
        const translated = [];
        let anyFound = false;

        for (const word of words) {
            // Handle punctuation
            if (/^[^\w\s]$/.test(word)) {
                translated.push(word);
                continue;
            }

            // 1. Search in curated vocabulary (most reliable meanings)
            let foundEntry = this.vocabulary.find(v => {
                if (!v.meaning) return false;
                const defs = v.meaning.toLowerCase().split(/[\/,\s]+/).map(d => d.replace(/[.,?!]/g, ""));
                return defs.includes(word);
            });

            if (foundEntry) {
                translated.push(foundEntry.word);
                anyFound = true;
                continue;
            }

            // 2. Fallback to large English->Ilonggo reverse dictionary
            if (this.fullDictionary[word]) {
                const results = this.fullDictionary[word];
                // Select first translation if multiple (assuming it's a list)
                translated.push(Array.isArray(results) ? results[0] : results);
                anyFound = true;
                continue;
            }

            // 3. Keep original word in brackets as hint
            translated.push(`[${word}?]`);
        }

        // Rejoin and clean up spacing around punctuation
        return anyFound ? translated.join(" ").replace(/\s+([.,?!])/g, '$1') : null;
    }
}
