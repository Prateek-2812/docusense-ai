const documentService = require('../services/documentService');
const embeddingService = require('../services/embeddingService');
const llmService = require('../services/llmService');

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
       return res.status(400).json({ error: 'Only PDF files are supported.' });
    }

    // 1. Extract text from PDF
    const text = await documentService.extractTextFromPdf(req.file.buffer);

    // 2. Split text into chunks (300-500 words, respecting paragraphs)
    const chunks = documentService.splitTextIntoChunks(text);

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Could not extract functional text from the PDF document.' });
    }

    // 3. Generate embeddings and store in memory
    await embeddingService.processAndStoreChunks(chunks);

    res.status(200).json({
      message: 'Document successfully processed and indexed.',
      chunksProcessed: chunks.length
    });
  } catch (error) {
    next(error);
  }
};

const askQuestion = async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    // 1. Convert question to embedding
    const questionEmbedding = await embeddingService.getEmbedding(question);

    // 2. Retrieve top 3 relevant chunks
    const topChunks = embeddingService.retrieveTopChunks(questionEmbedding, 3);

    if (topChunks.length === 0) {
      return res.status(404).json({ error: 'No relevant context found. Have you uploaded a document?' });
    }

    // Prepare context payload from top chunks
    const contextText = topChunks.map((doc, index) => `[Chunk ${index + 1}]\n${doc.text}`).join('\n\n');

    // 3. Send to Gemini for grounded answer
    const answer = await llmService.generateGroundedAnswer(question, contextText);

    res.status(200).json({
      answer: answer,
      sources: topChunks.map(c => c.text)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  askQuestion
};
