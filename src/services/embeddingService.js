const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory array to store chunk text and its corresponding vector
const vectorStore = [];

const getEmbedding = async (text) => {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
  });
  
  // Depending on the version of the SDK, embeddings could be structured slightly differently.
  // Standard GenAI returns response.embeddings[0].values. 
  // We'll add a fallback just in case the SDK wraps it in response.embedding.values
  if (response.embeddings && response.embeddings.length > 0) {
    return response.embeddings[0].values;
  } else if (response.embedding) {
    return response.embedding.values;
  }
  
  throw new Error('Failed to retrieve embedding values from response.');
};

const processAndStoreChunks = async (chunks) => {
  // Clear out old vector store if we want to overwrite on each new upload
  // If we want to append, we just omit the following line:
  // vectorStore.length = 0; 
  
  for (const chunk of chunks) {
    try {
      const embedding = await getEmbedding(chunk);
      vectorStore.push({
        text: chunk,
        embedding: embedding
      });
    } catch (error) {
      console.error('Error embedding chunk:', error.message);
    }
  }
};

const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += Math.pow(vecA[i], 2);
    normB += Math.pow(vecB[i], 2);
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const retrieveTopChunks = (queryEmbedding, topK = 3) => {
  // Map over all stored elements and calculate similarity
  const ranked = vectorStore.map(item => {
    const similarity = cosineSimilarity(queryEmbedding, item.embedding);
    return { ...item, similarity };
  });

  // Sort by similarity descending
  ranked.sort((a, b) => b.similarity - a.similarity);

  // Return the top K items
  return ranked.slice(0, topK);
};

module.exports = {
  getEmbedding,
  processAndStoreChunks,
  retrieveTopChunks,
  cosineSimilarity
};
