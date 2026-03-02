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
            return new Response(JSON.stringify({ error: 'API Key missing.' }), { status: 500 });
        }

        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        const systemInstruction = `You are a high-precision Hiligaynon (Ilonggo) translation engine. 
        RULES:
        1. NO 'ILONGGLIS': No English verbs with Hiligaynon prefixes. Use roots (Luto, Tan-aw, Obra).
        2. Grammar: Use native VSO (Verb-Subject-Object).
        3. Bidirectional: English <-> Hiligaynon.
        4. Output ONLY the translation.`;

        // 1. High-Performance Pathway (1.5 models with System Instructions)
        const modernModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
        for (const modelId of modernModels) {
            const result = await tryTranslateModern(modelId, apiKey, systemInstruction, text);
            if (result.success) {
                return new Response(JSON.stringify({ translation: result.translation, method: modelId }), { status: 200 });
            }
        }

        // 2. Legacy/Compatibility Pathway (Prepend instructions to prompt)
        const fallbackModels = ['gemini-pro', 'gemini-1.0-pro'];
        const legacyPrompt = `${systemInstruction}\n\nInput: "${text}"\nOutput:`;

        for (const modelId of fallbackModels) {
            const result = await tryTranslateLegacy(modelId, apiKey, legacyPrompt);
            if (result.success) {
                return new Response(JSON.stringify({ translation: result.translation, method: modelId }), { status: 200 });
            }
        }

        return new Response(JSON.stringify({
            error: "All translation pathways failed. Please check your API usage limits in Google AI Studio."
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server Exception: ${error.message}` }), { status: 500 });
    }
}

async function tryTranslateModern(modelId, apiKey, systemInstruction, userText) {
    const versions = ['v1beta', 'v1'];
    for (const version of versions) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ parts: [{ text: userText }] }],
                    generationConfig: { temperature: 0.0 }
                })
            });

            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return { success: true, translation: data.candidates[0].content.parts[0].text.trim() };
            }
        } catch (e) { continue; }
    }
    return { success: false };
}

async function tryTranslateLegacy(modelId, apiKey, fullPrompt) {
    const versions = ['v1', 'v1beta'];
    for (const version of versions) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: { temperature: 0.0 }
                })
            });

            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return { success: true, translation: data.candidates[0].content.parts[0].text.trim() };
            }
        } catch (e) { continue; }
    }
    return { success: false };
}
