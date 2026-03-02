const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'resources', 'Speakin_Visayan_Dictionary.html');
const outputFile = path.join(__dirname, '..', 'data', 'full_dictionary.json');

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');
    const reverseDictionary = {}; // english -> ilonggo

    lines.forEach(line => {
        const parts = line.split('~~~');
        if (parts.length >= 2) {
            let ilonggoWord = parts[0].trim();
            let definition = parts.slice(1).join('~~~').trim().toLowerCase();

            // Extract potential English keywords from the first part of the definition
            // Usually the format is: "a ~~~ Ah, Oh, Well, Why. Examples..."
            // We'll take the first sentence or the part before the first period.
            let firstPart = definition.split('.')[0];
            let englishWords = firstPart.split(/[\/,; ]+/)
                .map(w => w.replace(/[.,?!()]/g, '').trim())
                .filter(w => w.length > 1);

            englishWords.forEach(englishWord => {
                if (!reverseDictionary[englishWord]) {
                    // Store the first matching Ilonggo word as the primary translation
                    reverseDictionary[englishWord] = ilonggoWord.split(' ')[0].replace(/[~]/g, '');
                }
            });
        }
    });

    fs.writeFileSync(outputFile, JSON.stringify(reverseDictionary));
    console.log(`Success: Indexed ${Object.keys(reverseDictionary).length} English terms.`);
} catch (err) {
    console.error('Error processing dictionary:', err);
}
