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

        // System prompt enhanced with professional native-speaker instruction
        const prompt = `You are an expert native Hiligaynon (Ilonggo) translator. 
        
        MISSION:
        Translate the input text between English and Hiligaynon.
        - If Input is English -> Output is natural, conversational Hiligaynon.
        - If Input is Hiligaynon/Ilonggo -> Output is clear, natural English.

        CRITICAL LINGUISTIC RULES:
        1. Priority: Use idiomatic Hiligaynon as spoken in Panay/Negros. 
        2. Grammar: Use VSO structure where appropriate (e.g. "Kinahanglan ko..." instead of "Ako kinahanglan...").
        3. No "Spanglish/Ilongglis": Avoid mixing English words unless they are standard loan words in Ilonggo (like "computer").
        4. Conciseness: Provide ONLY the translation. No conversational filler or explanations.

        EXAMPLES:
        English: I have to go to work tomorrow.
        Hiligaynon: Kinahanglan ko mag-obra buwas.

        English: How are you?
        Hiligaynon: Kamusta ka?

        Hiligaynon: Diin ka makadto?
        English: Where are you going?

        INPUT: "${text}"
        TRANSLATION:`;

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
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
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
