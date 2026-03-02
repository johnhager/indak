export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { english } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key missing on server.' }), { status: 500 });
        }

        const prompt = `Translate this English phrase to natural, conversational Hiligaynon (Ilonggo). 
        Only return the final translation, no explanation.
        English: "${english}"
        Ilonggo:`;

        // Priority list of models to try in order of quality/availability
        const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro'];
        let lastError = null;

        for (const modelId of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const ilonggo = data.candidates[0].content.parts[0].text.trim();
                    return new Response(JSON.stringify({ ilonggo, model: modelId }), { status: 200 });
                }

                lastError = data.error?.message || 'Unknown model error';
            } catch (e) {
                lastError = e.message;
            }
        }

        return new Response(JSON.stringify({
            error: `All models failed. Last error: ${lastError}`
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server Exception: ${error.message}` }), { status: 500 });
    }
}
