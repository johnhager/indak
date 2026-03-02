export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    let lastRawError = "Uncertain failure.";

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

        // Comprehensive list of model IDs to try
        const models = [
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest',
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash-8b',
            'gemini-pro'
        ];

        for (const modelId of models) {
            const isLegacy = modelId === 'gemini-pro' || modelId === 'gemini-1.0-pro';
            const versions = ['v1beta', 'v1'];

            for (const version of versions) {
                try {
                    const body = isLegacy
                        ? { contents: [{ parts: [{ text: `${systemInstruction}\n\nInput: "${text}"\nOutput:` }] }], generationConfig: { temperature: 0.0 } }
                        : { system_instruction: { parts: [{ text: systemInstruction }] }, contents: [{ parts: [{ text: text }] }], generationConfig: { temperature: 0.0 } };

                    const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    const data = await response.json();

                    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const translation = data.candidates[0].content.parts[0].text.trim();
                        return new Response(JSON.stringify({ translation, method: modelId }), { status: 200 });
                    }

                    if (data.error) {
                        lastRawError = `[${modelId}/${version}]: ${data.error.message}`;
                        // If it's a 429 quota error, we keep trying other models
                        if (data.error.code !== 429) {
                            // If it's not a quota error or a "not found" error, it might be a bad key
                            console.warn(`Model ${modelId} failed: ${data.error.message}`);
                        }
                    }
                } catch (e) {
                    lastRawError = `Fetch error: ${e.message}`;
                }
            }
        }

        return new Response(JSON.stringify({
            error: `All models failed. Last Google Error: ${lastRawError}`
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Critical Exception: ${error.message}` }), { status: 500 });
    }
}
