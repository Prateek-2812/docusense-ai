const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateGroundedAnswer = async (question, contextText) => {
  const systemInstruction = `You are a helpful, expert Q&A assistant. You must answer the user's question STRICTLY based only on the provided context retrieved from the document. Do not use outside knowledge or hallucinate.
When providing information from the context, you MUST explicitly cite which chunk each part of your answer comes from (e.g., [Chunk 1]). 
If the provided context is insufficient to answer the question, you MUST reply exactly with: "I don't have enough information in this document" and nothing else.`;

  const promptText = `Context:\n${contextText}\n\nQuestion:\n${question}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: promptText,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.2 // Lower temperature for more grounded, factual answers
    }
  });

  // Depending on the exact GenAI SDK response structure wrapper
  if (typeof response.text === 'function') {
      return response.text();
  }
  
  return response.text;
};

module.exports = {
  generateGroundedAnswer
};
