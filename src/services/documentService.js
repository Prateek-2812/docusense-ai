const pdf = require('pdf-parse');

const extractTextFromPdf = async (pdfBuffer) => {
  const data = await pdf(pdfBuffer);
  return data.text;
};

const splitTextIntoChunks = (text) => {
  // Split text into paragraphs (paragraphs separated by blank lines)
  const paragraphs = text.split(/\n\s*\n/);
  
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    const words = trimmed.split(/\s+/);
    const wordCount = words.length;

    // If adding this paragraph exceeds our soft limit of 500 words
    if (currentWordCount + wordCount > 500) {
       // If the current chunk is already within the 300-500 range, we can close it safely.
       if (currentWordCount >= 300) {
           chunks.push(currentChunk.join('\n\n'));
           currentChunk = [trimmed];
           currentWordCount = wordCount;
       } else {
           // We are under 300 words, but adding this next paragraph throws us way over. 
           // To respect paragraph boundaries, we'll keep them together in one chunk and close it immediately.
           currentChunk.push(trimmed);
           chunks.push(currentChunk.join('\n\n'));
           currentChunk = [];
           currentWordCount = 0;
       }
    } else {
       // Append to the current chunk
       currentChunk.push(trimmed);
       currentWordCount += wordCount;
    }
  }

  // Push the final chunk if it contains text
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks;
};

module.exports = {
  extractTextFromPdf,
  splitTextIntoChunks
};
