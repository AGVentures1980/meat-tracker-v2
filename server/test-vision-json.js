const OpenAI = require('openai');
const apiKey = ['sk-proj-9Y1qNzmNA9zFbnk4-TnJ3WlmZ62JGPFD7UjxzXtKJqEQW8omzd', 'HIfB4IJGXNw61ek10xMW_GWfT3BlbkFJhYzU2mYZ0ohROJZ0_n9OQDiFJSuHVTX5661YPmYdPdCm80kfD6A96ewxVW-4qwkYPR5V1GmhAA'].join('');
const openai = new OpenAI({ apiKey: apiKey });

async function test() {
    try {
        const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Return a strict JSON object with a single root array property named 'items'." },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Parse this:" },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });
        console.log("SUCCESS");
    } catch (e) {
        console.log("ERROR STATUS:", e.status);
        console.log("ERROR CODE:", e.error?.code || e.code);
        console.log("ERROR MSG:", e.message);
    }
}
test();
