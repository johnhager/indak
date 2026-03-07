const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error('Missing GEMINI_API_KEY');
    process.exit(1);
}

const SYSTEM_INSTRUCTION = `You are a native Hiligaynon curriculum developer for the 'Indak' app.
Your task is to generate a new lesson module using the 'Indak Linguistic Standards'.

STANDARDS:
1. NO ILONGGLIS.
2. NATURAL VSO GRAMMAR.
3. CONTEXT-AWARE VOCAB (e.g., Luto for cooking, Panyaga for lunch).

INPUT: A topic (e.g., "Commuting & Transport")

OUTPUT FORMAT (JSON):
{
  "vocabulary": [
    { "word": "...", "syllables": ["...", "..."], "stress_index": 0, "meaning": "...", "category": "..." }
  ],
  "sentences": [
    { "english": "...", "chunks": "Chunk1 | Chunk2", "distractors": "Trap1 | Trap2" }
  ],
  "drills": [
    { "pattern": "Hiligaynon ___ pattern.", "correct": "marker", "distractors": "m1 | m2", "meaning": "...", "category": "..." }
  ]
}

Ensure the output is strictly valid JSON.`;

async function generateLesson(topic) {
    console.log(`Generating comprehensive lesson for: ${topic}...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const payload = {
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: `Generate a lesson for the topic: ${topic}. Include at least 15 vocabulary words, 10 sentences for the Sentence Builder, and 10 Grammar Drills.` }] }],
        generationConfig: {
            temperature: 0.7, // Slightly higher for content generation
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
        if (response.ok && data.candidates) {
            const content = JSON.parse(data.candidates[0].content.parts[0].text);
            const fileName = topic.toLowerCase().replace(/ /g, '_') + '.json';
            fs.writeFileSync(`c:/Users/johnh/OneDrive/Documents/indak/data/lessons/${fileName}`, JSON.stringify(content, null, 4));
            console.log(`Lesson generated and saved to data/lessons/${fileName}`);
        } else {
            console.error('Generation failed:', JSON.stringify(data.error || data));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

const topic = process.argv[2] || 'Daily Life';
generateLesson(topic);
