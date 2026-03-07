const fs = require('fs');
const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';

function capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function standardize() {
    console.log("--- STANDARDIZING WORD CAPITALIZATION ---");
    const data = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));

    let updates = 0;
    const standardizedData = data.map(entry => {
        let changed = false;

        // Capitalize word
        const newWord = capitalize(entry.word);
        if (newWord !== entry.word) {
            entry.word = newWord;
            changed = true;
        }

        // Capitalize first syllable if it exists
        if (entry.syllables && entry.syllables.length > 0) {
            const newFirstSyllable = capitalize(entry.syllables[0]);
            if (newFirstSyllable !== entry.syllables[0]) {
                entry.syllables[0] = newFirstSyllable;
                changed = true;
            }
        }

        if (changed) updates++;
        return entry;
    });

    if (updates > 0) {
        fs.writeFileSync(VOCAB_PATH, JSON.stringify(standardizedData, null, 4));
        console.log(`SUCCESS: Capitalized ${updates} words for consistency.`);
    } else {
        console.log("No capitalization updates needed.");
    }
}

standardize();
