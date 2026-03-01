/**
 * @file translator.js
 * @description Provides basic English-to-Ilonggo translation by matching against
 * existing phrasebook sentences and fallback dictionary lookups.
 */

export class Translator {
    constructor(vocabulary, sentences) {
        this.vocabulary = vocabulary || [];
        this.sentences = sentences || [];
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
        // Try exact match first
        const exact = this.sentences.find(s => s.english.toLowerCase().replace(/[.,?!]/g, "") === input);
        if (exact) return exact.ilonggo_chunks.join(" ");

        // Try partial match (if input is contained in a larger phrase)
        const partial = this.sentences.find(s => s.english.toLowerCase().includes(input));
        if (partial) return partial.ilonggo_chunks.join(" ");

        return null;
    }

    /**
     * Attempts to translate each word individually.
     */
    translateWordByWord(input) {
        const words = input.split(/\s+/);
        const translated = [];
        let anyFound = false;

        for (const word of words) {
            // Find in vocabulary meanings (which are English)
            const entry = this.vocabulary.find(v => {
                if (!v.meaning) return false;
                // Split definitions by /, or space and clean them up
                const defs = v.meaning.toLowerCase().split(/[\/,\s]+/).map(d => d.replace(/[.,?!]/g, ""));
                return defs.includes(word);
            });

            if (entry) {
                translated.push(entry.word);
                anyFound = true;
            } else {
                // Keep the original word in brackets if not found
                translated.push(`[${word}]`);
            }
        }

        return anyFound ? translated.join(" ") : null;
    }
}
