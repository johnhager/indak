const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/full_phrasebook.json', 'utf8'));

const clean = [];
const seen = new Set();

for (const [key, value] of Object.entries(raw)) {
    // Basic filter: if value has Hiligaynon accents or is clearly a translation
    // and key is natural English
    if (value.includes('á') || value.includes('é') || value.includes('í') || value.includes('ó') || value.includes('ú') || value.includes('‑')) {
        // Strip accents for the 'app' version but keep them for 'display' if needed
        const unaccented = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('‑', '-').split(' - ')[0].trim();
        const english = key.charAt(0).toUpperCase() + key.slice(1);

        if (!seen.has(unaccented)) {
            clean.push({
                english: english,
                hiligaynon: unaccented,
                original: value
            });
            seen.add(unaccented);
        }
    }
}

fs.writeFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/phrasebook_clean.json', JSON.stringify(clean, null, 4));
console.log(`Extracted ${clean.length} clean phrases from the messy phrasebook!`);
