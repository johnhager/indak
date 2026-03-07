const fs = require('fs');

const phrases = JSON.parse(fs.readFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/phrasebook_clean.json', 'utf8'));

const sentenceFormat = phrases.map(p => {
    // Basic chunking: split by space, but keep it simple
    const chunks = p.hiligaynon.split(' ');
    return {
        english: p.english,
        ilonggo_chunks: chunks,
        trap_words: ["indi", "nagakadto"], // Generic traps for now
        tier: 5
    };
});

fs.writeFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/sentences_from_phrasebook.json', JSON.stringify(sentenceFormat, null, 4));
console.log(`Converted ${sentenceFormat.length} phrases into Game-Ready sentences!`);
