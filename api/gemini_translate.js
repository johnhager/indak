export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { text } = await req.json();
        let apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key missing on Vercel.' }), { status: 500 });
        }

        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        // RE-INJECTING THE STRICT LINGUISTIC TEXTBOOK
        const systemInstruction = `You are a professional native Hiligaynon (Ilonggo) translation engine. 
        
        STRICT RULES:
        1. NO 'ILONGGLIS': Do not mix English verbs with Hiligaynon prefixes. (ROOTS: Luto, Tan-aw, Obra).
        2. NATURAL VSO: Use Verb-Subject-Object order. (e.g., "Nagaluto ako..." instead of "Ako nagaluto...").
        3. VOCABULARY CORRECTIONS:
           - Cook = LUTO
           - Dinner = PANYAPON
           - Lunch = PANYAGA
           - Prepare/Pack Baon = PREPARAR or BALON
        4. BIDIRECTIONAL: English <-> Hiligaynon.
        
        FEW-SHOT EXAMPLES:
        English: "I'm cooking dinner." -> Hiligaynon: "Nagaluto ako sang panyapon."
        English: "I'm watching TV." -> Hiligaynon: "Nagatan-aw ako sang TV."
        English: "I'm going to make my lunch for tomorrow." -> Hiligaynon: "Mag-preparar ako sang balon ko para buwas."
        
        Output ONLY the final translation result.`;

        // PHASE 1: DISCOVERY
        let availableModels = [];
        try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResponse.json();
            if (listData.models) {
                availableModels = listData.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => ({
                        id: m.name.split('/').pop(),
                        name: m.name
                    }));
            }
        } catch (e) {
            console.error("Discovery failed", e);
        }

        if (availableModels.length === 0) {
            availableModels = [
                { id: 'gemini-1.5-pro', name: 'models/gemini-1.5-pro' },
                { id: 'gemini-1.5-flash', name: 'models/gemini-1.5-flash' },
                { id: 'gemini-pro', name: 'models/gemini-pro' }
            ];
        }

        availableModels.sort((a, b) => b.id.includes('pro') ? 1 : -1);

        let lastError = "No models responded successfully.";

        // PHASE 2: ATTEMPT TRANSLATION
        for (const model of availableModels) {
            const isModern = model.id.includes('1.5') || model.id.includes('2.0');
            const endpoints = isModern ? ['v1beta', 'v1'] : ['v1beta'];

            for (const endpoint of endpoints) {
                try {
                    const payload = isModern
                        ? {
                            system_instruction: { parts: [{ text: systemInstruction }] },
                            contents: [{ parts: [{ text: text }] }],
                            generationConfig: { temperature: 0.0, topP: 0.1 }
                        }
                        : {
                            contents: [{ parts: [{ text: `${systemInstruction}\n\nTranslate: "${text}"` }] }],
                            generationConfig: { temperature: 0.0 }
                        };

                    const response = await fetch(`https://generativelanguage.googleapis.com/${endpoint}/${model.name}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();

                    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const translation = data.candidates[0].content.parts[0].text.trim();
                        return new Response(JSON.stringify({ translation, method: model.id }), { status: 200 });
                    }
                    if (data.error) lastError = `[${model.id}/${endpoint}]: ${data.error.message}`;
                } catch (e) {
                    lastError = `Fetch error: ${e.message}`;
                }
            }
        }

        return new Response(JSON.stringify({ error: lastError }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server exception: ${error.message}` }), { status: 500 });
    }
}
