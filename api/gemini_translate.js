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

        // System prompt with high-precision vocabulary
        const prompt = `You are a professional native-speaker Hiligaynon (Ilonggo) translator. 

        MISSION:
        Translate between English and Hiligaynon (Ilonggo). 

        STRICT VOCABULARY DIFFERENTIATION:
        - Cook = Luto (Specifically for creating heat-based dishes)
        - Prepare = Preparar (For general preparation or assembly)
        - Cook Rice = Tig-on
        - Lunch = Panyaga
        - Dinner = Panyapon
        - Breakfast = Pamahaw
        - Packed meal/Baon = Balon

        STRICT LINGUISTIC RULES:
        1. **NO "ILONGGLIS"**: Never use English verbs with Hiligaynon prefixes.
        2. **Word Order**: Use natural VSO (Verb-Subject-Object).
        3. **Tone**: Native, natural, mature Hiligaynon.

        GOLD STANDARD EXAMPLES:
        - English: "I'm cooking dinner." 
          Hiligaynon: "Nagaluto ako sang panyapon."

        - English: "I'm going to make my lunch for tomorrow." 
          Hiligaynon: "Mag-preparar ako sang balon ko para buwas."

        - English: "I'm watching TV." 
          Hiligaynon: "Nagatan-aw ako sang TV."

        INPUT: "${text}"
        OUTPUT:`;

        const primaryModels = ['gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-1.0-pro'];

        for (const modelId of primaryModels) {
            const res = await tryTranslate(modelId, apiKey, prompt);
            if (res) return res;
        }

        return new Response(JSON.stringify({ error: `Could not reach AI.` }), { status: 500 });

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
                        temperature: 0.1,
                        topP: 0.95
                    }
                })
            });
            const data = await response.json();
            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const translation = data.candidates[0].content.parts[0].text.trim();
                return new Response(JSON.stringify({ translation, method: modelId }), { status: 200 });
            }
        } catch (e) { continue; }
    }
    return null;
}
