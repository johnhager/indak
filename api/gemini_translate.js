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

        // System prompt with strict native grounding and few-shot examples
        const prompt = `You are a professional native Hiligaynon (Ilonggo) translator. 
        
        MISSION:
        Translate the input text between English and Hiligaynon (Ilonggo).
        
        STRICT LINGUISTIC RULES:
        1. **NO "ILONGGLIS" (Taglish equivalent)**: Never combine Hiligaynon prefixes with English verbs (e.g., NEVER use "Nag-watching" or "Nagtwatching"). You MUST find the Hiligaynon root (Tan-aw).
        2. **Pure Vocabulary**: Use authentic Hiligaynon words. (e.g. "Obra" or "Trabaho" for work, "Tan-aw" for watch, "Kaon" for eat).
        3. **VSO Structure**: Use natural word order (Verb-Subject-Object). 
           - Good: "Nagatan-aw ako sang TV."
           - Bad: "Ako nagatan-aw TV."
        4. **Marker Usage**: Use 'ang', 'sang', and 'sa' correctly.
        5. **Conciseness**: Return ONLY the final translation. No explanation.

        FEW-SHOT EXAMPLES:
        - English: "I'm watching TV." -> Hiligaynon: "Nagatan-aw ako sang TV."
        - English: "I have to go to work tomorrow." -> Hiligaynon: "Kinahanglan ko mag-obra buwas."
        - English: "I am eating lunch." -> Hiligaynon: "Nagapanyapon ako."
        - Hiligaynon: "Diin ka makadto?" -> English: "Where are you going?"

        INPUT: "${text}"
        OUTPUT TRANSLATION:`;

        const primaryModels = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.0-pro'];
        for (const modelId of primaryModels) {
            const res = await tryTranslate(modelId, apiKey, prompt);
            if (res) return res;
        }

        // Discovery Phase if defaults fail
        try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResponse.json();
            if (listData.models) {
                const supportedModels = listData.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.split('/').pop());

                for (const modelId of supportedModels) {
                    const res = await tryTranslate(modelId, apiKey, prompt);
                    if (res) return res;
                }
            }
        } catch (e) { }

        return new Response(JSON.stringify({
            error: `Could not translate. Please verify your API Key.`
        }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), { status: 500 });
    }
}

async function tryTranslate(modelId, apiKey, prompt) {
    const versions = ['v1', 'v1beta'];
    for (const version of versions) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1, // Low temperature for consistent, formal translation
                        topP: 0.95
                    }
                })
            });
            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const translation = data.candidates[0].content.parts[0].text.trim();
                return new Response(JSON.stringify({ translation, method: `gemini (${modelId})` }), { status: 200 });
            }
        } catch (e) { continue; }
    }
    return null;
}
