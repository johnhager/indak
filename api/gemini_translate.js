export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    let lastErrorMessage = "No specific error captured.";

    try {
        const { text } = await req.json();
        let apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key missing on server.' }), { status: 500 });
        }

        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        const prompt = `You are a professional native-speaker Hiligaynon (Ilonggo) translator. 

        MISSION:
        Translate between English and Hiligaynon (Ilonggo). 

        STRICT VOCABULARY DIFFERENTIATION:
        - Cook = Luto
        - Prepare = Preparar
        - Lunch = Panyaga
        - Dinner = Panyapon
        - Breakfast = Pamahaw

        STRICT LINGUISTIC RULES:
        1. **NO "ILONGGLIS"**: Never use English verbs with Hiligaynon prefixes.
        2. **Word Order**: Use natural VSO (Verb-Subject-Object).

        INPUT: "${text}"
        OUTPUT:`;

        // 1. Try a wide range of models in order of quality
        const primaryModels = [
            'gemini-1.5-pro',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.0-pro'
        ];

        for (const modelId of primaryModels) {
            const result = await tryTranslate(modelId, apiKey, prompt);
            if (result.success) {
                return new Response(JSON.stringify({ translation: result.translation, method: modelId }), { status: 200 });
            }
            lastErrorMessage = result.error;
        }

        // 2. Emergency Discovery Phase
        try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResponse.json();
            if (listData.models) {
                const supportedModels = listData.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.split('/').pop());

                for (const modelId of supportedModels) {
                    if (primaryModels.includes(modelId)) continue; // Skip what we already tried
                    const result = await tryTranslate(modelId, apiKey, prompt);
                    if (result.success) {
                        return new Response(JSON.stringify({ translation: result.translation, method: modelId }), { status: 200 });
                    }
                    lastErrorMessage = result.error;
                }
            }
        } catch (e) {
            console.error("Discovery error:", e.message);
        }

        return new Response(JSON.stringify({
            error: `All models failed. Last API response: ${lastErrorMessage}`
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server exception: ${error.message}` }), { status: 500 });
    }
}

async function tryTranslate(modelId, apiKey, prompt) {
    // Try both v1 and v1beta as some keys are region-locked to one
    const versions = ['v1', 'v1beta'];
    let lastErr = "Model not found";

    for (const version of versions) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        topP: 0.95
                    }
                })
            });

            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return { success: true, translation: data.candidates[0].content.parts[0].text.trim() };
            }

            lastErr = data.error?.message || response.statusText || "Unknown API Error";
        } catch (e) {
            lastErr = e.message;
            continue;
        }
    }
    return { success: false, error: lastErr };
}
