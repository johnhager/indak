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

        // Auto-clean API Key (removes potential quotes from copy-paste)
        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        const prompt = `Translate this English phrase to natural, conversational Hiligaynon (Ilonggo). Only return the final translation, no explanation. English: "${english}"`;

        // The "Kitchen Sink" approach: try standard and beta names in both v1 and v1beta
        const targets = [
            { version: 'v1', model: 'gemini-1.5-flash' },
            { version: 'v1beta', model: 'gemini-1.5-flash' },
            { version: 'v1', model: 'gemini-1.0-pro' },
            { version: 'v1beta', model: 'gemini-pro' }
        ];

        let lastFullError = null;

        for (const target of targets) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/${target.version}/models/${target.model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const ilonggo = data.candidates[0].content.parts[0].text.trim();
                    return new Response(JSON.stringify({ ilonggo, method: `gemini (${target.model})` }), { status: 200 });
                }

                lastFullError = data.error?.message || response.statusText;
            } catch (e) {
                lastFullError = e.message;
            }
        }

        return new Response(JSON.stringify({
            error: `All translation pathways failed. Last attempt (${targets[3].model}) said: ${lastFullError}`
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Critical Failure: ${error.message}` }), { status: 500 });
    }
}
