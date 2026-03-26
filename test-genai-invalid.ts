import { GoogleGenAI } from '@google/genai';
async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: "invalid_key" });
    await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "hello"
    });
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}
run();
