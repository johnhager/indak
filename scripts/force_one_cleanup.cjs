const fs = require('fs');

const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';
const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `You are a native Hiligaynon Linguistic Teacher.
Audit exactly these 5 words. 
1. Use native Hiligaynon stress marks (á, í, ó, ú, ì).
2. Ensure standard Hiligaynon categories (Nouns, Verbs, Adjectives, Pronouns, Particles).
3. Ensure natural meanings.

Return ONLY the JSON. No preamble, no explanation.`;

async function forceClean() {
    const data = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
    const subset = data.slice(0, 5);

    console.log("OLD DATA:", JSON.stringify(subset, null, 2));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nDATA:\n${JSON.stringify(subset)}` }] }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.candidates) {
            let text = result.candidates[0].content.parts[0].text;
            // Extract JSON if it has markdown blocks
            text = text.replace(/```json|```/g, '').trim();
            const cleaned = JSON.parse(text);
            console.log("\nNEW CLEANED DATA:", JSON.stringify(cleaned, null, 2));

            for (let i = 0; i < cleaned.length; i++) {
                data[i] = cleaned[i];
            }
            fs.writeFileSync(VOCAB_PATH, JSON.stringify(data, null, 4));
            console.log("\nSUCCESS: vocabulary.json has been updated.");
        } else {
            console.error("FAILED:", JSON.stringify(result));
        }
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}

forceClean();
