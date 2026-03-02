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
            return new Response(JSON.stringify({ error: 'API Key missing on server.' }), { status: 500 });
        }

        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        // This is the "God-Mode" instruction set that Gemini 1.5 Pro prioritizes.
        const systemInstruction = `You are a high-precision Hiligaynon (Ilonggo) translation engine. 
        
        STRICT OPERATING RULES:
        1. **NO 'ILONGGLIS'**: You are FORBIDDEN from mixing English verbs with Hiligaynon prefixes. (e.g. NEVER say "Nang-cook" or "Nag-watching"). You MUST find the Hiligaynon root (Luto, Tan-aw, Obra).
        2. **GRAMMAR**: Use native VSO (Verb-Subject-Object) structure. Focus on enclitic pronouns (ko, mo, ya) in their proper places.
        3. **VOCABULARY**: Use pure, deep Hiligaynon words over English or Tagalog borrowings where possible.
        4. **BIDIRECTIONAL**: If input is English, output is Hiligaynon. If input is Hiligaynon, output is English.
        5. **CONCISENESS**: Output ONLY the translation. No preamble. No explanations.
        
        VOCAB REFERENCE:
        - Cook = Luto
        - Lunch = Panyaga
        - Dinner = Panyapon
        - Work = Obra or Trabaho`;

        const primaryModels = ['gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-1.0-pro'];

        let lastErr = "No response";

        for (const modelId of primaryModels) {
            const result = await tryTranslate(modelId, apiKey, systemInstruction, text);
            if (result.success) {
                return new Response(JSON.stringify({ translation: result.translation, method: modelId }), { status: 200 });
            }
            lastErr = result.error;
        }

        return new Response(JSON.stringify({ error: `AI Failed: ${lastErr}` }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Critical Exception: ${error.message}` }), { status: 500 });
    }
}

async function tryTranslate(modelId, apiKey, systemInstruction, userText) {
    const versions = ['v1', 'v1beta'];
    let lastErr = "Unknown failure";

    for (const version of versions) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // System instructions are passed separately to ensure strict adherence
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [{
                        parts: [{ text: userText }]
                    }],
                    generationConfig: {
                        temperature: 0.0, // Set to 0.0 for absolute zero creativity/slang
                        topP: 1.0,
                        maxOutputTokens: 256
                    }
                })
            });

            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return { success: true, translation: data.candidates[0].content.parts[0].text.trim() };
            }
            lastErr = data.error?.message || response.statusText;
        } catch (e) {
            lastErr = e.message;
            continue;
        }
    }
    return { success: false, error: lastErr };
}
