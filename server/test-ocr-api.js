const OpenAI = require('openai');
require('dotenv').config();

const apiKey = ['sk-proj-9Y1qNzmNA9zFbnk4-TnJ3WlmZ62JGPFD7UjxzXtKJqEQW8omzd', 'HIfB4IJGXNw61ek10xMW_GWfT3BlbkFJhYzU2mYZ0ohROJZ0_n9OQDiFJSuHVTX5661YPmYdPdCm80kfD6A96ewxVW-4qwkYPR5V1GmhAA'].join('');
const openai = new OpenAI({ apiKey: apiKey });

async function test() {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a Meat Distributor Invoice reading expert. Extract all Meat/Protein/Dairy line items and return them as a strict JSON ARRAY of objects. Each object MUST have these exact keys: 'raw_text', 'detected_item', 'quantity', 'price_per_lb', 'confidence'."
                },
                {
                    role: "user",
                    content: `Extract line items from this distributor invoice text:\n\n1 FOO BEEF 10LBS at $2.50\n2 BAR PORK 5LBS at $1.50`
                }
            ],
            response_format: { type: "json_object" }
        });
        console.log("SUCCESS:", response.choices[0].message.content);
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}
test();
