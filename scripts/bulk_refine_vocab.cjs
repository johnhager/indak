const fs = require('fs');
const path = require('path');

// Configuration
const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error('Missing GEMINI_API_KEY environment variable.');
    process.exit(1);
}

// Linguistic rules grounded in project data
const SYSTEM_INSTRUCTION = `You are a professional Hiligaynon (Ilonggo) Linguistic Architect.
Your task is to audit and improve a Hiligaynon dictionary.

STRICT CATEGORY RULES:
- Nouns: Objects, places, people (e.g., Balay, Maestro, Bintana).
- Verbs: Actions (e.g., Kaon, Luto, Lakat).
- Adjectives: Descriptors (e.g., Namit, Maayo).
- Grammar & Particles: Connecting words, markers (e.g., Sang, Ang, Bala).
- Pronouns: I, you, he/she, they (e.g., Ako, Ikaw, Sia).
- Numbers & Time: (e.g., Isang, Buwas, Karon).

TASK:
Review the following list of dictionary entries. For each entry:
1. Verify the Category. If it is wrong (e.g., "Bintana" is marked as "Verbs"), correct it to "Nouns".
2. Verify the Meaning. Ensure it is accurate, concise, and natural.
3. Return the result in the EXACT same JSON format as the input.

Output ONLY the raw JSON array. No preamble or explanations.`;

async function callGemini(entries) {
    const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    const versions = ['v1beta', 'v1'];

    for (const model of models) {
        for (const version of versions) {
            const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${API_KEY}`;

            const payload = {
                system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                contents: [{ parts: [{ text: JSON.stringify(entries) }] }],
                generationConfig: {
                    temperature: 0.0,
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
                if (response.ok && data.candidates && data.candidates[0].content.parts[0].text) {
                    return JSON.parse(data.candidates[0].content.parts[0].text);
                } else {
                    console.error(`Error with ${model}/${version}:`, response.status, JSON.stringify(data.error || data));
                }
            } catch (error) {
                console.error(`Fetch error with ${model}/${version}:`, error.message);
            }
        }
    }
    return null;
}

async function run() {
    const rawData = fs.readFileSync(VOCAB_PATH, 'utf8');
    const vocab = JSON.parse(rawData).slice(0, 40);
    const BATCH_SIZE = 40;
    const totalBatches = Math.ceil(vocab.length / BATCH_SIZE);

    console.log(`Starting bulk refinement of ${vocab.length} items (${totalBatches} batches)...`);

    const refinedVocab = [];

    for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const batch = vocab.slice(start, start + BATCH_SIZE);

        console.log(`Processing batch ${i + 1}/${totalBatches}...`);

        const refinedBatch = await callGemini(batch);
        if (refinedBatch && Array.isArray(refinedBatch)) {
            refinedVocab.push(...refinedBatch);
        } else {
            console.log(`Batch ${i + 1} failed, keeping original data for this segment.`);
            refinedVocab.push(...batch);
        }

        // Brief pause to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    fs.writeFileSync(VOCAB_PATH, JSON.stringify(refinedVocab, null, 4));
    console.log('Bulk refinement complete! vocabulary.json updated.');
}

run();
