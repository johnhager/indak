const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `You are a Hiligaynon Linguistic Auditor.
Review the following sentence mapping for a language learning app.

Check:
1. Are the chunks ('ilonggo_chunks') the most natural way to build the sentence?
2. Is the Hiligaynon translation correct and native-sounding?

Return the exact same JSON format with corrections.`;

async function tryModels(entries) {
    const models = ['gemini-1.5-flash-latest', 'gemini-2.0-flash'];
    for (const modelId of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                    contents: [{ parts: [{ text: JSON.stringify(entries) }] }],
                    generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
                })
            });
            const data = await response.json();
            if (response.ok) return JSON.parse(data.candidates[0].content.parts[0].text);
        } catch (e) { }
    }
    return null;
}

async function run() {
    const data = JSON.parse(fs.readFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/sentences.json', 'utf8'));
    const BATCH_SIZE = 10; // Smaller batches for sentences
    console.log(`Auditing ${data.length} sentences...`);
    const refined = [];

    for (let i = 0; i < Math.ceil(data.length / BATCH_SIZE); i++) {
        const batch = data.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        console.log(`[${i + 1}] Processing...`);
        let result = await tryModels(batch);
        if (!result) {
            console.log("Wait 60s...");
            await new Promise(r => setTimeout(r, 60000));
            result = await tryModels(batch);
        }
        refined.push(...(Array.isArray(result) ? result : batch));
        await new Promise(r => setTimeout(r, 2000));
    }

    fs.writeFileSync('c:/Users/johnh/OneDrive/Documents/indak/data/sentences.json', JSON.stringify(refined, null, 4));
    console.log("Sentences Audited.");
}

// run(); // Not running yet to avoid quota clash
