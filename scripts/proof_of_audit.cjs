const fs = require('fs');

const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';
const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `You are a professional Hiligaynon Linguistic Architect.
Audit the following dictionary entries. 

RULES:
1. NATIVE STRESS: Add Hiligaynon stress marks (á, í, ó, ú, ì) to word and syllables.
2. CATEGORIES: Use ONLY these exact plural categories: [Nouns, Verbs, Adjectives, Pronouns, Grammar & Particles].
3. SPELLING: Use standard Hiligaynon alphabet (No phonetic symbols like 'ŋ', use 'ng').
4. MEANING: Ensure concise, natural English.

Return ONLY a JSON array of objects.`;

async function fetchWithRetry(url, payload, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.status === 429) {
            console.log(`Quota hit. Waiting 30s before retry ${i + 1}/${retries}...`);
            await new Promise(r => setTimeout(r, 30000));
            continue;
        }

        return response;
    }
}

async function proofOfConceptAudit() {
    const data = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
    const startIndex = 10;
    const batchSize = 5;
    const subset = data.slice(startIndex, startIndex + batchSize);

    console.log("--- BEFORE AUDIT ---");
    console.log(JSON.stringify(subset, null, 2));

    const model = 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const payload = {
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: JSON.stringify(subset) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    const response = await fetchWithRetry(url, payload);
    const result = await response.json();

    if (response.ok && result.candidates) {
        const cleaned = JSON.parse(result.candidates[0].content.parts[0].text);
        console.log("\n--- AFTER AUDIT (SUCCESS) ---");
        console.log(JSON.stringify(cleaned, null, 2));

        for (let i = 0; i < cleaned.length; i++) {
            data[startIndex + i] = cleaned[i];
        }

        fs.writeFileSync(VOCAB_PATH, JSON.stringify(data, null, 4));
        console.log("\nSUCCESS: vocabulary.json has been updated.");
    } else {
        console.error("\nFAILED: API call failed.", JSON.stringify(result));
    }
}

proofOfConceptAudit();
