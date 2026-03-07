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
            return new Response(JSON.stringify({ error: 'API Key missing on Vercel.' }), { status: 500 });
        }

        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        // PERMANENT LINGUISTIC ANCHOR (Extracted from project data)
        const systemInstruction = `You are a professional Hiligaynon (Ilonggo) translation engine anchored to the 'Indak' project standards. 

        CORE VOCABULARY ANCHORS (Mandatory):
        - Cook = LUTO
        - Watch/Look = LANTAW or TAN-AW
        - Lunch = PANYAGA
        - Dinner = PANYAPON
        - Breakfast = PAMAHAW
        - Tomorrow = BUWAS
        - Work/Job = OBRA or TRABAHO
        - Packed Meal (Baon) = BALON

        LINGUISTIC PROTOCOL:
        1. **STRICT NO ILONGGLIS**: You are forbidden from using English verbs with Hiligaynon prefixes (e.g., NEVER use "Nag-cook" or "Nag-watching"). You must use the Hiligaynon roots (Luto, Lantaw).
        2. **GRAMMAR**: Use native VSO (Verb-Subject-Object) structure. Focus on enclitic pronouns (ko, mo, ya) appropriately.
           - Example: "Cooking dinner" -> "Nagaluto ako sang panyapon."
        3. **BIDIRECTIONAL**: If English input -> Ilonggo output. If Ilonggo input -> English output.
        4. **NATIVE STRESS MARKS (Tuldik)**: Use native Hiligaynon stress marks (á, í, ó, ú, ì) consistently to indicate correct word stress and pronunciation, matching the standard found in native religious and linguistic archives.
        
        GOLD STANDARD MAPPINGS:
        - "I'm cooking dinner." -> "Nagalutò akó sang panyápon."
        - "I'm watching TV." -> "Nagatan-aw akó sang TV."
        - "I have to go to work tomorrow." -> "Kinahánglan ko mag-óbra búwas."
        - "I'm going to make my lunch for tomorrow." -> "Mag-preparár akó sang bálon ko pára búwas."

        Output ONLY the translation. Zero preamble.`;

        // Discovery Phase
        let availableModels = [];
        try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResponse.json();
            if (listData.models) {
                availableModels = listData.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => ({ id: m.name.split('/').pop(), name: m.name }));
            }
        } catch (e) { }

        if (availableModels.length === 0) {
            availableModels = [{ id: 'gemini-1.5-pro', name: 'models/gemini-1.5-pro' }, { id: 'gemini-1.5-flash', name: 'models/gemini-1.5-flash' }];
        }
        availableModels.sort((a, b) => b.id.includes('pro') ? 1 : -1);

        for (const model of availableModels) {
            const isModern = model.id.includes('1.5') || model.id.includes('2.0');
            const endpoints = isModern ? ['v1beta', 'v1'] : ['v1beta'];

            for (const endpoint of endpoints) {
                try {
                    const payload = isModern
                        ? {
                            system_instruction: { parts: [{ text: systemInstruction }] },
                            contents: [{ parts: [{ text: text }] }],
                            generationConfig: { temperature: 0.0, topP: 0.1 }
                        }
                        : {
                            contents: [{ parts: [{ text: `${systemInstruction}\n\nTranslate: "${text}"` }] }],
                            generationConfig: { temperature: 0.0 }
                        };

                    const response = await fetch(`https://generativelanguage.googleapis.com/${endpoint}/${model.name}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        return new Response(JSON.stringify({ translation: data.candidates[0].content.parts[0].text.trim(), method: model.id }), { status: 200 });
                    }
                } catch (e) { }
            }
        }

        return new Response(JSON.stringify({ error: "All models failed to anchor." }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: `Server exception: ${error.message}` }), { status: 500 });
    }
}
