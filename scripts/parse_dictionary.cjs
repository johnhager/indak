const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', 'resources', 'Speakin_Visayan_Dictionary.html');
const outputFile = path.join(__dirname, '..', 'data', 'full_dictionary.json');

// Extensive English stopword list for dictionary indexing
const ENGLISH_STOPWORDS = new Set([
    'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'done',
    'i', 'me', 'my', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'we', 'us', 'our', 'they', 'them', 'their',
    'this', 'that', 'these', 'those', 'which', 'who', 'whom', 'whose', 'what', 'where', 'when', 'how', 'why',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'for', 'at', 'by', 'from', 'in', 'into', 'of', 'off', 'on', 'onto', 'out', 'over', 'to', 'up', 'with', 'as', 'if',
    'not', 'no', 'yes', 'can', 'will', 'shall', 'should', 'would', 'could', 'may', 'might', 'must',
    'about', 'above', 'after', 'again', 'against', 'all', 'any', 'anybody', 'anyone', 'anything', 'around',
    'both', 'each', 'either', 'enough', 'every', 'everybody', 'everyone', 'everything', 'few', 'less', 'little',
    'many', 'more', 'most', 'much', 'neither', 'none', 'nothing', 'one', 'other', 'others', 'several',
    'some', 'somebody', 'someone', 'something', 'such', 'than', 'too', 'very', 'while'
]);

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split('\n');
    const reverseDictionary = Object.create(null);

    lines.forEach(line => {
        const parts = line.split('~~~');
        if (parts.length >= 2) {
            let ilonggoWord = parts[0].trim().split(' ')[0].replace(/[~]/g, '');
            let definition = parts.slice(1).join('~~~').trim().toLowerCase().replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

            let meaningPart = definition.split('.')[0];
            let englishWords = meaningPart.split(/[\/,; ]+/)
                .map(w => w.replace(/[.,?!()]/g, '').trim())
                .filter(w => w.length > 2 && !ENGLISH_STOPWORDS.has(w));

            englishWords.forEach((englishWord, index) => {
                if (!reverseDictionary[englishWord]) {
                    reverseDictionary[englishWord] = [];
                }

                if (!reverseDictionary[englishWord].includes(ilonggoWord)) {
                    // Just push. First alphabetical headword that uses this meaning wins.
                    reverseDictionary[englishWord].push(ilonggoWord);
                }
            });
        }
    });

    const finalDict = {};
    Object.keys(reverseDictionary).forEach(en => {
        finalDict[en] = reverseDictionary[en][0];
    });

    // Manual overrides for common errors or special terms
    finalDict['ilonggo'] = 'Ilonggo';
    finalDict['hiligaynon'] = 'Hiligaynon';
    finalDict['hello'] = 'Kamusta';
    finalDict['learn'] = 'toón';
    finalDict['learning'] = 'nagatoón';
    finalDict['study'] = 'toón';
    finalDict['studying'] = 'nagatoón';

    fs.writeFileSync(outputFile, JSON.stringify(finalDict));
    console.log(`Success: Indexed ${Object.keys(finalDict).length} quality English terms.`);
} catch (err) {
    console.error('Error processing dictionary:', err);
}
