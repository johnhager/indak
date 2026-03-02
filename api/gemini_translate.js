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
            return new Response(JSON.stringify({
                error: 'API Key missing on server. Please add GEMINI_API_KEY to Vercel Environment Variables.'
            }), { status: 500 });
        }

        const prompt = `Translate this English phrase to natural, conversational Hiligaynon (Ilonggo). 
        Only return the final translation, no explanation.
        English: "${english}"
        Ilonggo:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // Detailed error reporting
        if (data.error) {
            return new Response(JSON.stringify({
                error: `Google API Error: ${data.error.message} (Code: ${data.error.code})`
            }), { status: 500 });
        }

        const ilonggo = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!ilonggo) {
            return new Response(JSON.stringify({
                error: 'AI responded but gave no translation. It might be a safety filter or empty response.',
                raw: data
            }), { status: 500 });
        }

        return new Response(JSON.stringify({ ilonggo }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server Exception: ${error.message}` }), { status: 500 });
    }
}
