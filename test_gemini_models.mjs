import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelsToTest = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite-001', 'gemini-pro-latest', 'gemini-flash-latest'];

for (const model of modelsToTest) {
  try {
    await ai.models.generateContent({ model, contents: 'hello' });
    console.log(`[SUCCESS] ${model}`);
    process.exit(0);
  } catch(e) {
    console.log(`[FAIL] ${model}: ${e.message}`);
  }
}
