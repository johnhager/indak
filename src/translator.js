/**
 * @file translator.js
 * @description Provides English-to-Ilonggo translation with grammatical intelligence,
 * clitic reordering (VSO structure), and morphology (mag- prefixes).
 */

export class Translator {
    constructor(vocabulary, sentences, fullDictionary, fullPhrasebook) {
        this.vocabulary = vocabulary || [];
        this.sentences = sentences || [];
        this.fullDictionary = fullDictionary || {};
        this.fullPhrasebook = fullPhrasebook || {};

        // Words to ignore as independent words (they usually serve grammatical roles)
        this.englishStopWords = new Set([
            'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'a', 'an', 'the', 'do', 'does', 'did', 'done',
            'has', 'have', 'had', 'getting', 'become',
            'of', 'at', 'with', 'by', 'as'
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

        // 1. Phrasebook Match (Exact or Fuzzy)
        const phraseMatch = this.findPhraseMatch(cleanInput);
        if (phraseMatch) return { translatedText: phraseMatch, method: "phrasebook" };

        // 2. Advanced Grammatical Translation
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
        // Keep 'to' for infinitive detection
        const tokens = originalTokens.filter(t => !this.englishStopWords.has(t));

        let translated = [];
        let anyFound = false;

        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i];

            if (/^[^\w\s]$/.test(token)) {
                translated.push(token);
                i++;
                continue;
            }

            // A. Check for Subject + Auxiliary pattern (Subject Reordering)
            // e.g., "I want"
            if (this.pronouns[token] && tokens[i + 1] && this.overrides[tokens[i + 1]]) {
                const subject = this.pronouns[token];
                const aux = this.overrides[tokens[i + 1]];
                translated.push(aux);
                translated.push(subject.enclitic);
                anyFound = true;
                i += 2;
                continue;
            }

            // B. Handle infinitive marker "to [Verb]"
            if (token === 'to' && tokens[i + 1]) {
                const verbToken = tokens[i + 1];
                let verbResult = this.lookupWord(verbToken);
                if (!verbResult) verbResult = this.tryStem(verbToken, false);

                if (verbResult) {
                    // Remove existing naga/nag if STEMMING produced it, as we want MAG
                    const cleanRoot = verbResult.replace(/^(naga|nag)/, '');
                    translated.push("mag" + cleanRoot.toLowerCase());
                    anyFound = true;
                    i += 2;
                } else {
                    i++; // Skip 'to' if verb not found
                }
                continue;
            }

            // C. Pronoun handling (independent form)
            if (this.pronouns[token]) {
                translated.push(this.pronouns[token].indep);
                anyFound = true;
                i++;
                continue;
            }

            // D. Verb/Override handling
            if (this.overrides[token]) {
                translated.push(this.overrides[token]);
                anyFound = true;
            } else {
                let result = this.lookupWord(token);
                if (result) {
                    translated.push(result);
                    anyFound = true;
                } else {
                    let stemmed = this.tryStem(token, true);
                    if (stemmed) {
                        translated.push(stemmed);
                        anyFound = true;
                    } else {
                        translated.push(`[${token}?]`);
                    }
                }
            }
            i++;
        }

        let result = translated.join(" ").replace(/\s+([.,?!])/g, '$1');
        if (result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }
        return anyFound ? result : null;
    }

    tryStem(word, applyPrefix = true) {
        if (word.endsWith('ing')) {
            const stem = word.slice(0, -3);
            const res = this.lookupWord(stem);
            if (res) return applyPrefix ? 'naga' + res.toLowerCase() : res;
        }
        if (word.endsWith('ed') && word.length > 4) {
            const stem = word.slice(0, -2);
            const res = this.lookupWord(stem);
            if (res) return applyPrefix ? 'nag' + res.toLowerCase() : res;
        }
        return null;
    }

    lookupWord(word) {
        if (word.length <= 2) return null;

        let match = this.vocabulary.find(v => v.meaning && v.meaning.toLowerCase() === word);
        if (match) return match.word;

        match = this.vocabulary.find(v => {
            if (!v.meaning) return false;
            const defs = v.meaning.toLowerCase().split(/[\/,\s]+/).map(d => d.replace(/[.,?!]/g, ""));
            return defs.includes(word);
        });
        if (match) return match.word;

        if (this.fullDictionary[word]) return this.fullDictionary[word];

        return null;
    }
}
