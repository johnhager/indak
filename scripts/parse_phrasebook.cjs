const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'resources', 'Giant_Ilonggo_Phrasebook.txt');
const outputFile = path.join(__dirname, '..', 'data', 'full_phrasebook.json');

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');
    const phrasebook = {};

    lines.forEach(line => {
        line = line.trim();
        if (!line || line.length < 5) return;

        let ilonggo = '';
        let englishPart = '';

        // More lenient matching: Look for anything that looks like a phrase separator
        // We look for : or - or – or — and handle common encoding artifacts
        let separatorMatch = line.match(/^([^:–—\-\u2013\u2014]+?)\s*[:–—\-\u2013\u2014]\s*(.*)$/);

        // If it starts with a bullet, remove it first
        let cleanLine = line.replace(/^[â€¢\u2022\*\-\.󿿿]+\s*/, '');
        if (cleanLine !== line) {
            separatorMatch = cleanLine.match(/^([^:–—\-\u2013\u2014]+?)\s*[:–—\-\u2013\u2014]\s*(.*)$/);
        }

        if (separatorMatch) {
            ilonggo = separatorMatch[1].trim();
            englishPart = separatorMatch[2].trim();

            // Skip if it looks like a page number or header
            if (ilonggo.match(/^\d+$/) || ilonggo.includes('Page') || ilonggo.includes('Edition')) {
                return;
            }

            // Extract English parts
            // Remove parenthetical notes and common trailing punctuation
            const cleanEnglishPart = englishPart.replace(/\(.*?\)/g, '').replace(/[!\?\.]+$/, '');

            // Split by common separators in English side: /, ;, or .
            const englishMeanings = cleanEnglishPart.split(/[\/;,\.]/).map(m => m.trim());

            englishMeanings.forEach(english => {
                // Normalize for index: lower, remove specific non-word chars
                const cleanEnglish = english.toLowerCase().replace(/[^\w\s']/g, '').trim();
                if (cleanEnglish && cleanEnglish.length > 2 && cleanEnglish.split(' ').length <= 12) {
                    if (!phrasebook[cleanEnglish]) {
                        phrasebook[cleanEnglish] = ilonggo;
                    }
                }
            });
        }
    });

    // Special case for the English: / Ilonggo: pattern
    let currentEnglish = null;
    lines.forEach(line => {
        const eMatch = line.match(/^English:\s*(.*)/i);
        if (eMatch) {
            currentEnglish = eMatch[1].trim();
        } else if (currentEnglish) {
            const iMatch = line.match(/^Ilonggo:\s*(.*)/i);
            if (iMatch) {
                const ilonggo = iMatch[1].trim();
                const cleanEnglish = currentEnglish.toLowerCase().replace(/[^\w\s']/g, '').trim();
                if (cleanEnglish && !phrasebook[cleanEnglish]) {
                    phrasebook[cleanEnglish] = ilonggo;
                }
                currentEnglish = null;
            }
        }
    });

    fs.writeFileSync(outputFile, JSON.stringify(phrasebook));
    console.log(`Success: Indexed ${Object.keys(phrasebook).length} phrases.`);
} catch (err) {
    console.error('Error processing phrasebook:', err);
}
