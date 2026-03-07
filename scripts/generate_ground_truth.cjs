const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `You are a native Hiligaynon Linguistic Teacher.
Generate 50 diverse, natural Hiligaynon sentences for a language learning app.

RULES:
- NO ILONGGLIS.
- Use core vocabulary (Luto, Panyaga, Lantaw, etc).
- Variety: Questions, Commands, Negatives, Future, Past.
- Structure: Natural VSO.

OUTPUT FORMAT (JSON ARRAY):
[
  { "english": "...", "ilonggo_chunks": ["Word1", "Word2"], "trap_words": ["Trap1", "Trap2"], "tier": 4 }
]`;

async function generate() {
    console.log("Generating 50 Master Sentences...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const payload = {
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: "Generate 50 sentences for levels 4, 5, and 6." }] }],
        generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok) {
            const sentences = JSON.parse(data.candidates[0].content.parts[0].text);
            fs.writeFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/sentences_expanded.json', JSON.stringify(sentences, null, 4));
            console.log("50 Master Sentences Expanded!");
        } else {
            console.error(JSON.stringify(data.error || data));
        }
    } catch (e) {
        console.error(e.message);
    }
}

generate();
