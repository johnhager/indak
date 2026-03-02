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
        if (curatedMatch) {
            return Array.isArray(curatedMatch.ilonggo_chunks) ? curatedMatch.ilonggo_chunks.join(" ") : (curatedMatch.ilonggo || "");
        }

        // 2. Large Phrasebook Match (full_phrasebook.json)
        if (this.fullPhrasebook[searchPhrase]) {
            return this.fullPhrasebook[searchPhrase];
        }

        // 3. Selective fuzzy/partial search in full phrasebook
        if (searchPhrase.length > 3) {
            const pbKeys = Object.keys(this.fullPhrasebook);
            // Must match as a full word or phrase block
            const partialKey = pbKeys.find(k =>
                k === searchPhrase ||
                k.includes(` ${searchPhrase} `) ||
                k.startsWith(`${searchPhrase} `) ||
                k.endsWith(` ${searchPhrase}`)
            );
            if (partialKey && (partialKey.length > 5 || searchPhrase.length > 8)) {
                return this.fullPhrasebook[partialKey];
            }
        }

        // 4. Substring match in curated phrases
        if (searchPhrase.length > 3) {
            const partial = this.sentences.find(s => s.english.toLowerCase().includes(searchPhrase));
            if (partial && partial.english.length > 3) {
                return Array.isArray(partial.ilonggo_chunks) ? partial.ilonggo_chunks.join(" ") : (partial.ilonggo || "");
            }
        }

        return null;
    }

    /**
     * Attempts to translate each word individually.
     */
    translateWordByWord(input) {
        // Simple tokenization
        const words = input.toLowerCase().match(/\w+|[^\w\s]/g) || [];
        const translated = [];
        let anyFound = false;

        for (const word of words) {
            // Handle punctuation
            if (/^[^\w\s]$/.test(word)) {
                translated.push(word);
                continue;
            }

            // A. Precise Curated Vocabulary Match (Full meaning match priority)
            let match = this.vocabulary.find(v => v.meaning && v.meaning.toLowerCase() === word);

            // B. If no exact meaning match, search as a keyword in definitions
            if (!match) {
                match = this.vocabulary.find(v => {
                    if (!v.meaning) return false;
                    const defs = v.meaning.toLowerCase().split(/[\/,\s]+/).map(d => d.replace(/[.,?!]/g, ""));
                    return defs.includes(word);
                });
            }

            if (match) {
                translated.push(match.word);
                anyFound = true;
                continue;
            }

            // C. Fallback to large English->Ilonggo reverse dictionary
            if (this.fullDictionary[word]) {
                const results = this.fullDictionary[word];
                // Assume first translation if multiple results are mapped
                translated.push(Array.isArray(results) ? results[0] : results);
                anyFound = true;
                continue;
            }

            // D. Keep the original word in brackets as a fallback hint
            translated.push(`[${word}?]`);
        }

        // Clean up join results (no space before punctuation)
        return anyFound ? translated.join(" ").replace(/\s+([.,?!])/g, '$1') : null;
    }
}
