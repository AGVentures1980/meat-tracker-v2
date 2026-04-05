import OpenAI from "openai";
async function run() {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: "Respond ONLY with JSON: {\"success\": true}" }],
        model: 'gpt-4o',
        temperature: 0.1,
        response_format: { type: "json_object" }
    });
    console.log(completion.choices[0].message.content);
  } catch(e) {
    console.error(e);
  }
}
run();
