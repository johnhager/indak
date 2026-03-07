const fs = require('fs');

const phrases = JSON.parse(fs.readFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/phrasebook_clean.json', 'utf8'));

// Filter for transport-related phrases from our already extracted 'Ground Truth'
const transportPhrases = phrases.filter(p =>
    p.english.toLowerCase().includes('go') ||
    p.english.toLowerCase().includes('come') ||
    p.english.toLowerCase().includes('where') ||
    p.english.toLowerCase().includes('arrive') ||
    p.hiligaynon.toLowerCase().includes('sa')
).slice(0, 15);

const lessonData = {
    vocabulary: [
        { word: "Sakay", syllables: ["Sa", "kay"], stress_index: 1, meaning: "Ride / Get on", category: "Verbs" },
        { word: "Manaog", syllables: ["Ma", "na", "og"], stress_index: 2, meaning: "Get off", category: "Verbs" },
        { word: "Plete", syllables: ["Ple", "te"], stress_index: 1, meaning: "Fare", category: "Nouns" },
        { word: "Jeep", syllables: ["Jeep"], stress_index: 0, meaning: "Jeepney", category: "Nouns" },
        { word: "Tricycle", syllables: ["Tri", "cy", "cle"], stress_index: 0, meaning: "Tricycle", category: "Nouns" },
        { word: "Diin", syllables: ["Di", "in"], stress_index: 1, meaning: "Where", category: "Grammar & Particles" }
    ],
    sentences: transportPhrases.map(p => ({
        english: p.english,
        chunks: p.hiligaynon.split(' ').join(' | '),
        distractors: "nagakadto | indi | sia"
    })),
    drills: [
        { pattern: "Mapulì na ___.", correct: "ko", distractors: "akon | sang", meaning: "I am going home now.", category: "Pronouns" },
        { pattern: "Diín ‘ta ___?", correct: "magkíta-ay", distractors: "makadto | lakat", meaning: "Where will we meet?", category: "Verbs" }
    ]
};

fs.writeFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/lessons/commuting_starter.json', JSON.stringify(lessonData, null, 4));
console.log("Commuting Starter Lesson built from 100% Native Phrasebook Data!");
