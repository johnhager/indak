export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { english } = await req.json();
        let apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key missing on server.' }), { status: 500 });
        }

        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        const prompt = `Translate this English phrase to natural, conversational Hiligaynon (Ilonggo). Only return the final translation, no explanation. English: "${english}"`;

        // 1. Try the most likely modern models first
        const primaryModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
        for (const modelId of primaryModels) {
            const res = await tryTranslate(modelId, apiKey, prompt);
            if (res) return res;
        }

        // 2. Discovery Phase: If primary models fail, ask Google what models are actually available
        try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResponse.json();

            if (listData.models && listData.models.length > 0) {
                // Filter for models that support "generateContent"
                const supportedModels = listData.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.split('/').pop()); // Extract the ID portion

                for (const modelId of supportedModels) {
                    const res = await tryTranslate(modelId, apiKey, prompt);
                    if (res) return res;
                }
            }
        } catch (e) {
            console.error("Discovery failed:", e.message);
        }

        return new Response(JSON.stringify({
            error: `All models (and discovery) failed. This usually means the API Key does not have the 'Generative Language API' enabled in Google Cloud Console.`
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Critical Exception: ${error.message}` }), { status: 500 });
    }
}

async function tryTranslate(modelId, apiKey, prompt) {
    const versions = ['v1', 'v1beta'];
    for (const version of versions) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const ilonggo = data.candidates[0].content.parts[0].text.trim();
                return new Response(JSON.stringify({ ilonggo, method: `gemini (${modelId})` }), { status: 200 });
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}
