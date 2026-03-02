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

        const systemInstruction = `You are a high-precision Hiligaynon (Ilonggo) translation engine. 
        RULES:
        1. NO 'ILONGGLIS': Use root words like 'Luto' instead of 'Nag-cook'.
        2. Grammar: Use native VSO structure.
        3. Output ONLY the translation.`;

        // PHASE 1: DISCOVERY
        // We ask Google exactly what models this key has access to.
        let availableModels = [];
        try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResponse.json();
            if (listData.models) {
                availableModels = listData.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => ({
                        id: m.name.split('/').pop(),
                        name: m.name // full path like models/gemini-1.5-pro
                    }));
            }
        } catch (e) {
            console.error("Discovery failed", e);
        }

        // Add standard defaults if discovery failed or was empty
        if (availableModels.length === 0) {
            availableModels = [
                { id: 'gemini-1.5-pro', name: 'models/gemini-1.5-pro' },
                { id: 'gemini-1.5-flash', name: 'models/gemini-1.5-flash' },
                { id: 'gemini-pro', name: 'models/gemini-pro' }
            ];
        }

        // Sort to prioritize Pro models
        availableModels.sort((a, b) => b.id.includes('pro') ? 1 : -1);

        let lastError = "No models responded successfully.";

        // PHASE 2: ATTEMPT TRANSLATION
        for (const model of availableModels) {
            // Determine if the model is modern (1.5+) or legacy (1.0)
            const isModern = model.id.includes('1.5') || model.id.includes('2.0');
            const endpoints = isModern ? ['v1beta', 'v1'] : ['v1beta']; // Modern models love v1beta for System Instructions

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

                    if (data.error) {
                        lastError = `[${model.id}/${endpoint}]: ${data.error.message}`;
                    }
                } catch (e) {
                    lastError = `Fetch error: ${e.message}`;
                }
            }
        }

        return new Response(JSON.stringify({
            error: `Discovery failed to find a working model. Last attempt said: ${lastError}`
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server exception: ${error.message}` }), { status: 500 });
    }
}
