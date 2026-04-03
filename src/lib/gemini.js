import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

export async function generateEmbedding(text) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  });
  return response.embeddings[0].values;
}

export async function generateEmbeddings(texts) {
  const results = [];
  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < texts.length; i += 10) {
    const batch = texts.slice(i, i + 10);
    const embeddings = await Promise.all(batch.map((t) => generateEmbedding(t)));
    results.push(...embeddings);
  }
  return results;
}

export async function askWithContext(query, contextChunks, systemPrompt) {
  const contextText = contextChunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.metadata?.filename || 'Unknown'} | Type: ${chunk.metadata?.source_type || 'unknown'} | Date: ${chunk.metadata?.date || 'unknown'}]\n${chunk.content}`
    )
    .join('\n\n---\n\n');

  const userMessage = `Context Documents:\n${contextText}\n\n---\n\nUser Question: ${query}`;

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
    },
  });

  return response;
}
