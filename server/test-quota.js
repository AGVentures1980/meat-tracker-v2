const OpenAI = require('openai');
const apiKey = ['sk-proj-9Y1qNzmNA9zFbnk4-TnJ3WlmZ62JGPFD7UjxzXtKJqEQW8omzd', 'HIfB4IJGXNw61ek10xMW_GWfT3BlbkFJhYzU2mYZ0ohROJZ0_n9OQDiFJSuHVTX5661YPmYdPdCm80kfD6A96ewxVW-4qwkYPR5V1GmhAA'].join('');
const openai = new OpenAI({ apiKey: apiKey });

async function test() {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Say hello" }]
        });
        console.log("SUCCESS:", response.choices[0].message.content);
    } catch (e) {
        console.log("ERROR STATUS:", e.status);
        console.log("ERROR CODE:", e.error?.code || e.code);
        console.log("ERROR MSG:", e.message);
    }
}
test();
