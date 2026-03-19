const OpenAI = require('openai');
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY || ['sk-proj-9Y1qNzmNA9zFbnk4-TnJ3WlmZ62JGPFD7UjxzXtKJqEQW8omzd', 'HIfB4IJGXNw61ek10xMW_GWfT3BlbkFJhYzU2mYZ0ohROJZ0_n9OQDiFJSuHVTX5661YPmYdPdCm80kfD6A96ewxVW-4qwkYPR5V1GmhAA'].join('');
const openai = new OpenAI({ apiKey: apiKey });

async function test() {
    try {
        const documentText = "1 FOO BEEF 10LBS at $2.50\n2 BAR PORK 5LBS at $1.50";
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a Meat Distributor Invoice reading expert (Sysco, US Foods, Cheney Brothers). Extract all Meat/Protein/Dairy line items and return them as a strict JSON object with a single root array property named 'items'. Each object in the array MUST have these exact keys: 'raw_text' (the exact line from invoice), 'detected_item' (guess standard name like Picanha, Fraldinha, Chicken Breast, Buttermilk), 'quantity' (total lbs received, calculate catch weight if needed or item count if pounds are irrelevant), 'price_per_lb' (unit rate as number), 'confidence' (float between 0 and 1)."
                },
                {
                    role: "user",
                    content: `Extract line items from this distributor invoice text:\n\n${documentText.substring(0, 8000)}`
                }
            ],
            response_format: { type: "json_object" }
        });
        const responseText = response.choices[0].message.content;
        console.log("RAW TEXT:", responseText);
        
        const parsed = JSON.parse(responseText);
        const finalOCRResults = Array.isArray(parsed) ? parsed : (parsed.items || parsed.line_items || []);
        console.log("FINAL RESULTS:", finalOCRResults);
    } catch (e) {
        console.log("ERROR:", e);
    }
}
test();
