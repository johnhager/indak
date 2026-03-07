const fs = require('fs');
const VOCAB_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/vocabulary.json';
const DICT_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/full_dictionary.json';
const PHRASE_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/phrasebook_clean.json';
const PROGRESS_PATH = 'c:/Users/johnh/OneDrive/Documents/indak/data/audit_progress.json';
const API_KEY = process.env.GEMINI_API_KEY;

const MODEL = 'gemini-flash-latest';

async function auditBatch(queue) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const payload = {
        system_instruction: { parts: [{ text: "Native Hiligaynon teacher. Audit for Tuldik, syllables, and plural categories. Return JSON array." }] },
        contents: [{ parts: [{ text: JSON.stringify(queue) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    try {
        const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) { console.error(`ERR ${response.status}: ${JSON.stringify(result)}`); return null; }
        if (!result.candidates) { console.error("No candidates:", JSON.stringify(result)); return null; }
        return JSON.parse(result.candidates[0].content.parts[0].text);
    } catch (e) { console.error("Audit error:", e.message); return null; }
}

function normalize(text) {
    return (text || "").toString().toLowerCase().replace(/[áàâíìîóòôúùûéèê]/g, 'a').replace(/[.,?!()]/g, '').trim();
}

async function start() {
    console.log("--- AUDITOR START ---");
    const auth = {};
    if (fs.existsSync(PHRASE_PATH)) {
        JSON.parse(fs.readFileSync(PHRASE_PATH, 'utf8')).forEach(p => {
            p.hiligaynon.split(/\s+/).forEach(w => {
                const c = w.replace(/[.,?!()]/g, '');
                if (/[áíóúì]/.test(c)) auth[normalize(c)] = { word: c, meaning: p.english };
            });
        });
    }
    const data = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
    let p = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    while (p.last_index < data.length) {
        const batch = data.slice(p.last_index, p.last_index + 2);
        const queue = batch.map(e => {
            const a = auth[normalize(e.word)];
            return { ...e, gt_word: a ? a.word : null, gt_meaning: a ? a.meaning : null };
        });
        console.log(`Auditing ${p.last_index}...`);
        const cleaned = await auditBatch(queue);
        if (cleaned) {
            cleaned.forEach((c, i) => {
                const q = queue[i];
                if (q.gt_word) { c.word = q.gt_word; c.meaning = q.gt_meaning; }
                data[p.last_index + i] = c;
                console.log(`  ${p.last_index + i}: ${c.word}`);
            });
            fs.writeFileSync(VOCAB_PATH, JSON.stringify(data, null, 4));
            p.last_index += batch.length;
            fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p));
            await new Promise(r => setTimeout(r, 2000));
        } else {
            console.log("Waiting 30s...");
            await new Promise(r => setTimeout(r, 30000));
        }
    }
}
start();
