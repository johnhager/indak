/**
 * @file translator.js
 * @description Advanced English-to-Ilonggo translation with VSO reordering,
 * marker placement (ang/sang/sa), and syntactic linkers (nga).
 */

export class Translator {
    /**
     * Normalizes Hiligaynon text by removing accents for logic/comparison.
     * @param {string} text 
     * @returns {string}
     */
    static normalize(text) {
        if (!text) return "";
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,!?]/g, "").toLowerCase().trim();
    }

    constructor(vocabulary, sentences, fullDictionary, fullPhrasebook) {
        this.vocabulary = vocabulary || [];
        this.sentences = sentences || [];
        this.fullDictionary = fullDictionary || {};
        this.fullPhrasebook = fullPhrasebook || {};

        // Words to ignore as independent words, but use as markers
        this.englishStopWords = new Set([
            'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'a', 'an', 'the', 'do', 'does', 'did', 'done',
            'has', 'have', 'had', 'getting', 'become',
            'of', 'with', 'by', 'as'
        ]);

        // Pronoun mappings with enclitic variants
        this.pronouns = {
            'i': { indep: 'ako', enclitic: 'ko' },
            'you': { indep: 'ikaw', enclitic: 'mo' },
            'we': { indep: 'kita', enclitic: 'naton' },
            'they': { indep: 'sila', enclitic: 'nila' },
            'he': { indep: 'siya', enclitic: 'niya' },
            'she': { indep: 'siya', enclitic: 'niya' },
            'it': { indep: 'ini', enclitic: 'sini' }
        };

        // High priority verb/auxiliary mapping
        this.overrides = {
            'want': 'gusto',
            'like': 'luyag',
            'need': 'kinahanglan',
            'can': 'sarang',
            'go': 'kadto',
            'eat': 'kaon',
            'drink': 'inum',
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
    /**
     * Translates a string bidirectionally between English and Hiligaynon using AI.
     * @param {string} text - The input text.
     * @returns {Object} { translatedText: string, method: string }
     */
    async translateAsync(text) {
        if (!text || text.trim() === "") return { translatedText: "", method: "none" };

        try {
            const response = await fetch('/api/gemini_translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() })
            });

            const data = await response.json();
            if (data.translation) {
                return { translatedText: data.translation, method: data.method || "gemini" };
            }
            if (data.error) {
                return { translatedText: `AI Error: ${data.error}`, method: "none" };
            }
        } catch (err) {
            console.error("Gemini API Connection failed:", err);
            return { translatedText: `Connection failed: ${err.message}`, method: "none" };
        }

        return { translatedText: "N/A (AI failed to respond)", method: "none" };
    }
}
