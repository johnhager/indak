const fs = require('fs');

const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';
const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `You are a professional Hiligaynon Linguistic Architect.
Audit the following dictionary segments. 
- Correct Categories (Nouns, Verbs, Adjectives, Pronouns, Grammar & Particles).
- Verify Meanings (Natural English).
- Native Stress Marks: Add Hiligaynon stress marks (á, í, ó, ú, ì) to signify stress.
- Return ONLY the JSON array.`;

async function quickAudit(words) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const payload = {
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: JSON.stringify(words) }] }],
        generationConfig: { responseMimeType: "application/json" }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.candidates) {
        return JSON.parse(data.candidates[0].content.parts[0].text);
    }
    return null;
}

async function run() {
    const data = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
    const subset = data.slice(0, 10);
    console.log("Auditing first 10 items...");

    const cleaned = await quickAudit(subset);
    if (cleaned) {
        for (let i = 0; i < cleaned.length; i++) {
            data[i] = cleaned[i];
        }
        fs.writeFileSync(VOCAB_PATH, JSON.stringify(data, null, 4));
        console.log("Successfully cleaned and saved the first 10 items!");
        console.log("Sample:", data.slice(0, 3));
    } else {
        console.error("Audit failed. Check API limits.");
    }
}

run();
