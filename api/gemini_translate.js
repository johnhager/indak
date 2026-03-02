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
            return new Response(JSON.stringify({ error: 'API Key not configured on server' }), { status: 500 });
        }

        const prompt = `Translate this English phrase to natural, conversational Hiligaynon (Ilonggo). 
        Only return the final translation, no explanation.
        If it is greeting, keep it warm. If it involves actions, use proper Ilonggo syntax.
        
        English: "${english}"
        Ilonggo:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();
        const ilonggo = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "N/A (AI failed)";

        return new Response(JSON.stringify({ ilonggo }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
