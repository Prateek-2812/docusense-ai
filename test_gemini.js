const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
  try {
    const res = await ai.models.embedContent({ model: 'text-embedding-004', contents: 'test' });
    console.log('004 ok');
  } catch(e) { console.error('004 err:', e.message); }
  try {
    const res = await ai.models.embedContent({ model: 'embedding-001', contents: 'test' });
    console.log('001 ok');
  } catch(e) { console.error('001 err:', e.message); }
})();
