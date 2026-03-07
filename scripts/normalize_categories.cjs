const fs = require('fs');
const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';

// Standardized Category Map
const CATEGORY_MAP = {
    'Noun': 'Nouns',
    'Verb': 'Verbs',
    'Adjective': 'Adjectives',
    'Expressions': 'Greetings & Phrases',
    'Numbers & Time': 'Numbers & Time',
    'Greetings & Phrases': 'Greetings & Phrases',
    'Grammar & Particles': 'Grammar & Particles',
    'Pronouns': 'Pronouns',
    'Places & Nature': 'Nouns'
};

// Linguistic Correction Map (Word -> Specific Category)
const LINGUISTIC_FIXES = {
    // Greetings & Phrases
    'Salámat': 'Greetings & Phrases',
    'Kumustá': 'Greetings & Phrases',
    'Maayong aga': 'Greetings & Phrases',
    'Maayong udto': 'Greetings & Phrases',
    'Maayong hapon': 'Greetings & Phrases',
    'Maayong gab-í': 'Greetings & Phrases',
    'Abi-abi': 'Greetings & Phrases',
    'Agi anay': 'Greetings & Phrases',
    'Babay': 'Greetings & Phrases',

    // Numbers & Time
    'ága': 'Numbers & Time',
    'údto': 'Numbers & Time',
    'Bulan': 'Numbers & Time',
    'Bwas': 'Numbers & Time',
    'Karon': 'Numbers & Time',
    'Kahapon': 'Numbers & Time',
    'San-o': 'Numbers & Time',

    // Nouns (Miscategorized as Adjectives or Verbs)
    'Puno': 'Nouns',
    'Bulak': 'Nouns',
    'Suga': 'Nouns',
    'Panganod': 'Nouns',
    'Kilat': 'Nouns',
    'Palamahaw': 'Nouns',
    'Mangunguma': 'Nouns',
    'Tinapay': 'Nouns',
    'Karne': 'Nouns',
    'Bintana': 'Nouns',
    'Pirtahan': 'Nouns',
    'Maestro': 'Nouns',
    'Maestra': 'Nouns',
    'Manugbaligya': 'Nouns',
    'Nanay': 'Nouns',
    'Tatay': 'Nouns',
    'Atáy': 'Nouns',

    // Grammar & Particles
    'Ti': 'Grammar & Particles',
    'Indi': 'Grammar & Particles',
    'Huo': 'Grammar & Particles',
    'Wala': 'Grammar & Particles',
    'Na': 'Grammar & Particles',

    // Adjectives (Miscategorized as Nouns or Verbs)
    'Hubog': 'Adjectives',
    'Gwapo': 'Adjectives',

    // Pronouns
    'Ikaw': 'Pronouns'
};

function normalize() {
    console.log("--- DICTIONARY CATEGORY AUDIT & NORMALIZATION ---");
    const data = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));

    let changes = 0;
    const normalizedData = data.map(entry => {
        const originalCat = entry.category;

        // 1. Basic Mapping (Singular to Plural / Renaming)
        let newCat = CATEGORY_MAP[originalCat] || originalCat;

        // 2. Linguistic Specific Fixes
        if (LINGUISTIC_FIXES[entry.word]) {
            newCat = LINGUISTIC_FIXES[entry.word];
        }

        // 3. Fallback: If it's still not in the "Approved" list, flag it
        const approved = ['Nouns', 'Verbs', 'Adjectives', 'Pronouns', 'Grammar & Particles', 'Numbers & Time', 'Greetings & Phrases'];
        if (!approved.includes(newCat)) {
            // Keep it but log it
            console.log(`[WARN] Non-standard category: ${newCat} for word ${entry.word}`);
        }

        if (originalCat !== newCat) {
            changes++;
            return { ...entry, category: newCat };
        }
        return entry;
    });

    fs.writeFileSync(VOCAB_PATH, JSON.stringify(normalizedData, null, 4));
    console.log(`COMPLETED: ${changes} category updates applied.`);

    // Final Tally
    const counts = {};
    normalizedData.forEach(v => { counts[v.category] = (counts[v.category] || 0) + 1; });
    console.log("FINAL DISTRIBUTION:", JSON.stringify(counts, null, 2));
}

normalize();
