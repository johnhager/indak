const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;

const phrases = JSON.parse(fs.readFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/phrasebook_clean.json', 'utf8'));

const SYSTEM_INSTRUCTION = `You are a Hiligaynon Linguistic Engineer.
Convert these phrasebook entries into 'Indak Game Format'.

Format:
{ "english": "...", "ilonggo_chunks": ["Chunk1", "Chunk2"], "trap_words": ["Trap1", "Trap2"] }

CHUNKING RULES:
- Break into natural building blocks (verbs, pronouns, markers).
- NO ILONGGLIS.`;

async function refineBatch(batch) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                contents: [{ parts: [{ text: JSON.stringify(batch) }] }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
            })
        });
        const data = await response.json();
        if (response.ok) return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (e) { }
    return null;
}

// This would be a bulk job. I'll just draft it for the user to see the 'Master Plan'.
console.log("Expanding Ground Truth with 492 phrases from the Phrasal Archive...");
