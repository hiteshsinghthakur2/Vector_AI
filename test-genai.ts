import { GoogleGenAI } from '@google/genai';
try {
  const ai = new GoogleGenAI({ apiKey: undefined });
  console.log("Success");
} catch (e: any) {
  console.log("Error:", e.message);
}
