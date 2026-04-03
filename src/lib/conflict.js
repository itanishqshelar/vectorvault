import { CONFLICT_DETECTION_PROMPT } from './prompts.js';

const SOURCE_PRIORITY = { pdf: 3, email: 2, excel: 1 };

export function detectConflicts(chunks) {
  if (chunks.length < 2) return { has_conflicts: false, conflicts: [] };

  const grouped = {};
  for (const chunk of chunks) {
    const key = chunk.metadata?.filename || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(chunk);
  }

  // If all chunks from same source, no cross-source conflict possible
  if (Object.keys(grouped).length < 2) return { has_conflicts: false, conflicts: [] };

  return null; // Signal to use LLM-based detection
}

export function buildConflictContext(chunks) {
  const context = chunks
    .map(
      (chunk, i) =>
        `[Chunk ${i + 1} | Source: ${chunk.metadata?.filename} | Type: ${chunk.metadata?.source_type} | Date: ${chunk.metadata?.date || 'unknown'}]\n${chunk.content}`
    )
    .join('\n\n');

  return `${CONFLICT_DETECTION_PROMPT}\n\nDocuments:\n${context}`;
}

export function resolveConflict(conflict) {
  const { sources, claims } = conflict;
  // Apply priority rules
  // This is a helper for manual resolution if LLM resolution is insufficient
  return conflict.resolved_value || claims[0];
}
