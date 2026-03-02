/**
 * @file translator.js
 * @description Advanced English-to-Ilonggo translation with VSO reordering,
 * marker placement (ang/sang/sa), and syntactic linkers (nga).
 */

export class Translator {
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

    translate(text) {
        if (!text || text.trim() === "") return { translatedText: "", method: "none" };

        const input = text.trim().toLowerCase();
        const cleanInput = input.replace(/[.,?!]/g, "");

        // 1. Precise Phrasebook Match
        const phraseMatch = this.findPhraseMatch(cleanInput);
        if (phraseMatch) return { translatedText: phraseMatch, method: "phrasebook" };

        // 2. Syntactic Translation
        const wordMatch = this.translateAdvanced(input);
        if (wordMatch) return { translatedText: wordMatch, method: "dictionary" };

        return { translatedText: "Patawad (Sorry), N/A", method: "none" };
    }

    findPhraseMatch(input) {
        if (!input) return null;
        const searchPhrase = input.toLowerCase().replace(/[^\w\s']/g, '').trim();
        const curatedMatch = this.sentences.find(s =>
            s.english.toLowerCase().replace(/[^\w\s']/g, '') === searchPhrase
        );
        if (curatedMatch) return Array.isArray(curatedMatch.ilonggo_chunks) ? curatedMatch.ilonggo_chunks.join(" ") : (curatedMatch.ilonggo || "");
        if (this.fullPhrasebook[searchPhrase]) return this.fullPhrasebook[searchPhrase];
        return null;
    }

    translateAdvanced(input) {
        const originalTokens = input.toLowerCase().match(/\w+|[^\w\s]/g) || [];

        let translated = [];
        let anyFound = false;

        let i = 0;
        while (i < originalTokens.length) {
            const token = originalTokens[i];

            // Punctuation
            if (/^[^\w\s]$/.test(token)) {
                translated.push(token);
                i++;
                continue;
            }

            // Skip common English stopwords unless they serve as logic triggers
            if (this.englishStopWords.has(token)) {
                // Heuristic: "The [Noun]" -> "Ang [Noun]"
                if (token === 'the' || token === 'a' || token === 'an') {
                    translated.push("ang");
                }
                i++;
                continue;
            }

            // Pattern: "to [Verb]" -> "mag-[Verb]"
            if (token === 'to' && originalTokens[i + 1]) {
                const next = originalTokens[i + 1];
                let res = this.lookupWord(next) || this.tryStem(next, false);
                if (res) {
                    translated.push("mag" + res.toLowerCase());
                    anyFound = true;
                    i += 2;
                    continue;
                }
            }

            // Pattern: "at/in/to [Noun]" -> "sa [Noun]"
            if ((token === 'at' || token === 'in' || token === 'to') && originalTokens[i + 1]) {
                translated.push("sa");
                i++;
                continue;
            }

            // Pattern: Subject + Want/Like -> Gusto/Luyag + Enclitic
            if (this.pronouns[token] && originalTokens[i + 1] && this.overrides[originalTokens[i + 1]]) {
                const subject = this.pronouns[token];
                const aux = this.overrides[originalTokens[i + 1]];
                translated.push(aux);
                translated.push(subject.enclitic);
                anyFound = true;
                i += 2;
                continue;
            }

            // Pattern: Adjective + Noun -> Adj + nga + Noun
            // (Simple detection: if token is an adj and next is a noun)
            // We use a heuristic: if we have two words in a row and first is an override/lookup
            let current = this.lookupWord(token) || this.overrides[token];
            if (current && originalTokens[i + 1]) {
                let nextToken = originalTokens[i + 1];
                if (!this.englishStopWords.has(nextToken) && !/^[^\w\s]$/.test(nextToken)) {
                    let nextMatch = this.lookupWord(nextToken);
                    if (nextMatch) {
                        translated.push(current);
                        translated.push("nga");
                        translated.push(nextMatch);
                        anyFound = true;
                        i += 2;
                        continue;
                    }
                }
            }

            // Fallback: Pronouns
            if (this.pronouns[token]) {
                translated.push(this.pronouns[token].indep);
                anyFound = true;
                i++;
                continue;
            }

            // Fallback: Dictionary
            let res = this.overrides[token] || this.lookupWord(token) || this.tryStem(token, true);
            if (res) {
                translated.push(res);
                anyFound = true;
            } else {
                translated.push(`[${token}?]`);
            }
            i++;
        }

        let result = translated.join(" ").replace(/\s+([.,?!])/g, '$1');
        if (result.length > 0) result = result.charAt(0).toUpperCase() + result.slice(1);
        return anyFound ? result : null;
    }

    tryStem(word, pf) {
        if (word.endsWith('ing')) {
            const res = this.lookupWord(word.slice(0, -3));
            if (res) return pf ? 'naga' + res.toLowerCase() : res;
        }
        if (word.endsWith('ed') && word.length > 4) {
            const res = this.lookupWord(word.slice(0, -2));
            if (res) return pf ? 'nag' + res.toLowerCase() : res;
        }
        return null;
    }

    lookupWord(word) {
        if (!word || word.length <= 2) return null;
        let m = this.vocabulary.find(v => v.meaning && v.meaning.toLowerCase() === word);
        if (m) return m.word;
        m = this.vocabulary.find(v => v.meaning && v.meaning.toLowerCase().split(/[\/,\s]+/).includes(word));
        if (m) return m.word;
        if (this.fullDictionary[word]) return this.fullDictionary[word];
        return null;
    }
}
