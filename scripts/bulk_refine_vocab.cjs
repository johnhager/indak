const fs = require('fs');

const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';
const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `You are a professional Hiligaynon Linguistic Architect.
Audit the following dictionary segments. 
- Correct Categories (Nouns, Verbs, Adjectives, Pronouns, Grammar & Particles).
- Verify Meanings (Natural English).
- Native Stress Marks (Tuldik): Preserve or ADD native Hiligaynon stress marks (á, í, ó, ú, ì) to indicate correct word stress.
- Return ONLY the JSON array.`;

async function callGemini(entries) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    try {
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
        if (response.status === 429) return { quota: true };
        console.error("API Error:", response.status, JSON.stringify(data));
    } catch (e) { console.error("Fetch Error:", e.message); }
    return null;
}

async function run() {
    let vocab = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
    const BATCH_SIZE = 15; // Even smaller for stability
    const total = Math.ceil(vocab.length / BATCH_SIZE);

    console.log(`Auditing ${vocab.length} items (Incremental Backup Mode)...`);

    for (let i = 0; i < total; i++) {
        const start = i * BATCH_SIZE;
        const batch = vocab.slice(start, start + BATCH_SIZE);
        console.log(`[${i + 1}/${total}] Processing...`);

        let result = await callGemini(batch);
        if (result && result.quota) {
            console.log("Wait 60s...");
            await new Promise(r => setTimeout(r, 60000));
            result = await callGemini(batch);
        }

        if (Array.isArray(result)) {
            // Update the main vocab array in memory
            for (let j = 0; j < result.length; j++) {
                vocab[start + j] = result[j];
            }
            // Save after every batch
            fs.writeFileSync(VOCAB_PATH, JSON.stringify(vocab, null, 4));
            console.log("Batch Saved.");
        } else {
            console.log("Batch Skipped.");
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    console.log("Cleanup Finalized.");
}

run();
