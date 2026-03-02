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

        // System prompt with corrected vocabulary and more grounding examples
        const prompt = `You are a professional native-speaker Hiligaynon (Ilonggo) translator with expertise in Panay/Negros terminology. 
        
        MISSION:
        Translate between English and Hiligaynon (Ilonggo). Avoid literal or machine-like translations.

        VOCABULARY RULES (Crucial):
        - Lunch = Panyaga (NEVER Panyapon)
        - Dinner = Panyapon
        - Breakfast = Pamahaw
        - Making/Preparing food = Preparar or Luto
        - Packed meal (to-go lunch/baon) = Balon

        STRICT LINGUISTIC RULES:
        1. **NO "ILONGGLIS"**: Never prefix English verbs (e.g., No "Nag-watching"). 
        2. **Word Order**: Use natural Hiligaynon syntax (VSO).
        3. **Tone**: Natural, conversational, and culturally accurate.
        4. **Conciseness**: Provide ONLY the translation.

        GOLD STANDARD EXAMPLES:
        - English: "I'm going to make my lunch for tomorrow." 
          Hiligaynon: "Mag-preparar ako sang balon ko para buwas."

        - English: "I'm watching TV." 
          Hiligaynon: "Nagatan-aw ako sang TV."

        - English: "I have to go to work tomorrow." 
          Hiligaynon: "Kinahanglan ko mag-obra buwas."

        - English: "I am eating lunch." 
          Hiligaynon: "Nagapanyaga ako."

        INPUT: "${text}"
        OUTPUT:`;

        // We try to use the most intelligent models first
        const primaryModels = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
        for (const modelId of primaryModels) {
            const res = await tryTranslate(modelId, apiKey, prompt);
            if (res) return res;
        }

        // Discovery Phase
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
            error: `All models failed to translate. Key: ${apiKey.substring(0, 5)}...`
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
                        temperature: 0.1, // Locked at 0.1 for high fidelity
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
