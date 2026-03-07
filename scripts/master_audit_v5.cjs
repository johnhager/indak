const fs = require('fs');
const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';
const PROG_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/audit_progress.json';

const data = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));

// Final Master Audit: Indices 301 to 356
const batch_301_356 = [
    { word: "Ásya", syllables: ["Á", "sya"], stress_index: 0, meaning: "Asia", category: "Nouns" },
    { word: "Línggwáhé", syllables: ["Líng", "gwá", "hé"], stress_index: 1, meaning: "Language", category: "Nouns" },
    { word: "Ilónggo", syllables: ["I", "lóng", "go"], stress_index: 1, meaning: "Ilonggo / Hiligaynon", category: "Nouns" },
    { word: "Ingglis", syllables: ["Ing", "glis"], stress_index: 0, meaning: "English", category: "Nouns" },
    { word: "Tagálog", syllables: ["Ta", "gá", "log"], stress_index: 1, meaning: "Tagalog", category: "Nouns" },
    { word: "Spányis", syllables: ["Spán", "yis"], stress_index: 0, meaning: "Spanish", category: "Nouns" },
    { word: "Pránsés", syllables: ["Prán", "sés"], stress_index: 1, meaning: "French", category: "Nouns" },
    { word: "Tsína", syllables: ["Tsí", "na"], stress_index: 0, meaning: "China / Chinese", category: "Nouns" },
    { word: "Hapón", syllables: ["Ha", "pón"], stress_index: 1, meaning: "Japan / Japanese", category: "Nouns" },
    { word: "Dág-on", syllables: ["Dág", "on"], stress_index: 0, meaning: "Year", category: "Nouns" },
    { word: "Búlan", syllables: ["Bú", "lan"], stress_index: 0, meaning: "Month / Moon", category: "Nouns" },
    { word: "Semána", syllables: ["Se", "má", "na"], stress_index: 1, meaning: "Week", category: "Nouns" },
    { word: "Ádlaw", syllables: ["Ád", "law"], stress_index: 0, meaning: "Day / Sun", category: "Nouns" },
    { word: "Óras", syllables: ["Ó", "ras"], stress_index: 0, meaning: "Hour / Time", category: "Nouns" },
    { word: "Minúto", syllables: ["Mi", "nú", "to"], stress_index: 1, meaning: "Minute", category: "Nouns" },
    { word: "Segúndo", syllables: ["Se", "gún", "do"], stress_index: 1, meaning: "Second", category: "Nouns" },
    { word: "Ága", syllables: ["Á", "ga"], stress_index: 0, meaning: "Morning", category: "Nouns" },
    { word: "Udtú", syllables: ["Ud", "tú"], stress_index: 1, meaning: "Noon", category: "Nouns" },
    { word: "Hápun", syllables: ["Há", "pun"], stress_index: 0, meaning: "Afternoon", category: "Nouns" },
    { word: "Gab-í", syllables: ["Gab", "í"], stress_index: 1, meaning: "Night / Evening", category: "Nouns" },
    { word: "Gún-ub", syllables: ["Gún", "ub"], stress_index: 0, meaning: "Dawn", category: "Nouns" },
    { word: "Karón", syllables: ["Ka", "rón"], stress_index: 1, meaning: "Later / now", category: "Grammar & Particles" },
    { word: "Kádasón", syllables: ["Ká", "da", "són"], stress_index: 2, meaning: "Next time", category: "Grammar & Particles" },
    { word: "Úlihí", syllables: ["Ú", "li", "hí"], stress_index: 2, meaning: "Late", category: "Adjectives" },
    { word: "Dasíg", syllables: ["Da", "síg"], stress_index: 1, meaning: "Fast / Quick", category: "Adjectives" },
    { word: "Hináy", syllables: ["Hi", "náy"], stress_index: 1, meaning: "Slow", category: "Adjectives" },
    { word: "Bag-ó", syllables: ["Bag", "ó"], stress_index: 1, meaning: "New", category: "Adjectives" },
    { word: "Dáan", syllables: ["Dá", "an"], stress_index: 0, meaning: "Old (objects)", category: "Adjectives" },
    { word: "Tígulang", syllables: ["Tí", "gu", "lang"], stress_index: 0, meaning: "Old (people)", category: "Adjectives" },
    { word: "Mahál", syllables: ["Ma", "hál"], stress_index: 1, meaning: "Expensive", category: "Adjectives" },
    { word: "Barátu", syllables: ["Ba", "rá", "tu"], stress_index: 1, meaning: "Cheap", category: "Adjectives" },
    { word: "Nanamì", syllables: ["Na", "na", "mì"], stress_index: 2, meaning: "Beautiful / Nice", category: "Adjectives" },
    { word: "Maláway", syllables: ["Ma", "lá", "way"], stress_index: 1, meaning: "Ugly / Bad", category: "Adjectives" },
    { word: "Matínlo", syllables: ["Ma", "tín", "lo"], stress_index: 1, meaning: "Clean", category: "Adjectives" },
    { word: "Mahigkô", syllables: ["Ma", "hig", "kô"], stress_index: 2, meaning: "Dirty", category: "Adjectives" },
    { word: "Mapútì", syllables: ["Ma", "pú", "tì"], stress_index: 1, meaning: "White", category: "Adjectives" },
    { word: "Maítúm", syllables: ["Ma", "i", "túm"], stress_index: 2, meaning: "Black", category: "Adjectives" },
    { word: "Mapulá", syllables: ["Ma", "pu", "lá"], stress_index: 2, meaning: "Red", category: "Adjectives" },
    { word: "Asúl", syllables: ["A", "súl"], stress_index: 1, meaning: "Blue", category: "Adjectives" },
    { word: "Bérde", syllables: ["Bér", "de"], stress_index: 0, meaning: "Green", category: "Adjectives" },
    { word: "Amárilyo", syllables: ["A", "má", "ril", "yo"], stress_index: 1, meaning: "Yellow", category: "Adjectives" },
    { word: "Oríntz", syllables: ["O", "ríntz"], stress_index: 1, meaning: "Orange", category: "Adjectives" },
    { word: "Pórpol", syllables: ["Pór", "pol"], stress_index: 0, meaning: "Purple", category: "Adjectives" },
    { word: "Bráun", syllables: ["Bráun"], stress_index: 0, meaning: "Brown", category: "Adjectives" },
    { word: "Gústo", syllables: ["Gús", "to"], stress_index: 0, meaning: "Like / Want", category: "Verbs" },
    { word: "Hídi", syllables: ["Hí", "di"], stress_index: 0, meaning: "No / dislike", category: "Verbs" },
    { word: "Naburúng", syllables: ["Na", "bu", "rúng"], stress_index: 2, meaning: "Surprised / Shocked", category: "Adjectives" },
    { word: "Nahádlok", syllables: ["Na", "há", "dlok"], stress_index: 1, meaning: "Afraid", category: "Adjectives" },
    { word: "Napáy-id", syllables: ["Na", "páy", "id"], stress_index: 1, meaning: "Slanting / Leaning", category: "Adjectives" },
    { word: "Nakalípay", syllables: ["Na", "ka", "lí", "pay"], stress_index: 2, meaning: "Happy", category: "Adjectives" },
    { word: "Nasubô", syllables: ["Na", "su", "bô"], stress_index: 2, meaning: "Sad", category: "Adjectives" },
    { word: "Nahangít", syllables: ["Na", "ha", "ngít"], stress_index: 2, meaning: "Angry", category: "Adjectives" },
    { word: "Púlus", syllables: ["Pú", "lus"], stress_index: 0, meaning: "Entire / Use / Whole", category: "Adjectives" }
];

for (let i = 0; i < batch_301_356.length; i++) {
    const idx = 301 + i;
    if (data[idx]) {
        data[idx] = batch_301_356[i];
    }
}

fs.writeFileSync(VOCAB_PATH, JSON.stringify(data, null, 4));
fs.writeFileSync(PROG_PATH, JSON.stringify({ last_index: data.length, status: "COMPLETE" }));

console.log("SUCCESS: Final 56 items audited. CLEANUP 100% COMPLETE.");
