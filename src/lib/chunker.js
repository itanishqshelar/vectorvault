const CHUNK_SIZE = 500; // ~500 tokens
const CHUNK_OVERLAP = 50; // ~50 token overlap

export function chunkText(text, metadata = {}) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= CHUNK_SIZE) {
    return [{ content: words.join(' '), metadata: { ...metadata, chunk_index: 0 } }];
  }

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    const chunkWords = words.slice(start, end);

    chunks.push({
      content: chunkWords.join(' '),
      metadata: { ...metadata, chunk_index: chunks.length },
    });

    start = end - CHUNK_OVERLAP;
    if (end === words.length) break;
  }

  return chunks;
}
