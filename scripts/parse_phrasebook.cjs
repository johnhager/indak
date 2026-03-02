const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'resources', 'Giant_Ilonggo_Phrasebook.txt');
const outputFile = path.join(__dirname, '..', 'data', 'full_phrasebook.json');

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');
    const phrasebook = {};

    const englishMarkers = new Set(['the', 'this', 'that', 'is', 'a', 'an', 'with', 'intonation', 'body', 'language', 'note', 'page', 'edition', 'http', 'https', 'docs', 'google', 'com', 'of', 'and', 'for', 'you', 'i', 'was', 'were', 'it', 'raising', 'eyebrows', 'nod', 'head', 'hand', 'palm', 'facing', 'gesture', 'mean']);
    const dialogMarkers = new Set(['a', 'b', 's1', 's2', 'p1', 'p2', 'm', 'f']);

    lines.forEach(line => {
        line = line.trim();
        if (!line || line.length < 5) return;

        // Skip garbage
        if (line.includes('docs.google.com') || line.includes('Page') || line.includes('Edition')) return;

        let ilonggo = '';
        let englishPart = '';
        let isBulleted = false;

        // Bullet detection
        let cleanLine = line.replace(/^[â€¢\u2022\*\-\.]+\s*/, () => {
            isBulleted = true;
            return '';
        });

        let separatorMatch = cleanLine.match(/^([^:–—\-\u2013\u2014]+?)\s*[:–—\-\u2013\u2014]\s*(.*)$/);

        if (separatorMatch) {
            ilonggo = separatorMatch[1].trim();
            englishPart = separatorMatch[2].trim();

            const lowerIl = ilonggo.toLowerCase();

            // Filter character dialogue markers (A: Hello)
            if (dialogMarkers.has(lowerIl)) return;

            // Heuristics for headers/notes
            if (!isBulleted && (ilonggo.length < 2 || ilonggo.length > 50)) return;
            if (ilonggo.match(/^\d+$/)) return;

            // English content detection on Ilonggo side
            const ilWords = lowerIl.split(/\W+/).filter(w => w.length > 0);
            const englishCount = ilWords.filter(w => englishMarkers.has(w)).length;

            // If it's not bulleted and mostly English, it's a note or label
            if (!isBulleted && (englishCount > 0 || ilWords.length > 4)) return;
            // Even if bulleted, many English words indicates it's likely a note
            if (isBulleted && englishCount > 2) return;

            // Extract English meanings
            const cleanEnglishPart = englishPart.replace(/\(.*?\)/g, '').replace(/[!\?\.]+$/, '');
            const englishMeanings = cleanEnglishPart.split(/[\/;,\.]/).map(m => m.trim());

            englishMeanings.forEach(english => {
                const cleanEnglish = english.toLowerCase().replace(/[^\w\s']/g, '').trim();

                // Final sanity check for short English keys
                if (englishMarkers.has(cleanEnglish) && !isBulleted) return;

                if (cleanEnglish && cleanEnglish.length > 1 && cleanEnglish.split(' ').length <= 12) {
                    if (!phrasebook[cleanEnglish]) {
                        phrasebook[cleanEnglish] = ilonggo;
                    }
                }
            });
        }
    });

    // Patterns for English: / Ilonggo: charts
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
