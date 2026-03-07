const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/full_phrasebook.json', 'utf8'));

const clean = [];
const seen = new Set();

for (const [key, value] of Object.entries(raw)) {
    // Basic filter: if value has Hiligaynon accents or is clearly a translation
    // and key is natural English
    if (value.includes('á') || value.includes('é') || value.includes('í') || value.includes('ó') || value.includes('ú') || value.includes('‑')) {
        // We keep the accented version for the primary display
        const native = value.replace('‑', '-').split(' - ')[0].trim();
        // And create a 'clean' version for background matching logic
        const logical = native.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const english = key.charAt(0).toUpperCase() + key.slice(1);

        if (!seen.has(logical.toLowerCase())) {
            clean.push({
                english: english,
                hiligaynon: native,
                hiligaynon_clean: logical,
                original: value
            });
            seen.add(logical.toLowerCase());
        }
    }
}

fs.writeFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/phrasebook_clean.json', JSON.stringify(clean, null, 4));
console.log(`Extracted ${clean.length} clean phrases from the messy phrasebook!`);
