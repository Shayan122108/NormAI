import { OPEN_NOTEBOOK_API, NOTEBOOK_ID, SYSTEM_PROMPT } from './config.js';

let defaultModelId = null;

/**
 * Fetch and cache the default chat model ID from Open Notebook.
 * @returns {Promise<string|null>}
 */
export async function getDefaultModelId() {
  if (defaultModelId) return defaultModelId;
  const res = await fetch(`${OPEN_NOTEBOOK_API}/api/models/defaults`);
  if (!res.ok) throw new Error('Could not reach Open Notebook API at localhost:5055. Is it running?');
  const data = await res.json();
  if (!data.default_chat_model) throw new Error('No default chat model configured in Open Notebook. Please set one in Settings → Models → Default Models.');
  defaultModelId = data.default_chat_model;
  return defaultModelId;
}

/**
 * Check if the Open Notebook API is reachable and configured.
 * @returns {Promise<{ok: boolean, hasEmbedding: boolean}>}
 */
export async function checkApiStatus() {
  try {
    const res = await fetch(`${OPEN_NOTEBOOK_API}/api/models/defaults`);
    if (!res.ok) return { ok: false, hasEmbedding: false };
    const data = await res.json();
    return {
      ok: true,
      hasEmbedding: !!data.default_embedding_model,
    };
  } catch {
    return { ok: false, hasEmbedding: false };
  }
}

/**
 * Ask the IS Standards knowledge base a question.
 * @param {string} spec - The procurement specification text
 * @returns {Promise<string>} - The AI answer
 */
export async function queryStandards(spec) {
  const modelId = await getDefaultModelId();

  const question = `Procurement Specification: "${spec}"

Which Indian Standards (IS/BIS codes) apply to this specification? List all applicable standards with their IS code, title, scope, BIS certification requirement (mandatory or not), and explain why each standard applies.`;

  const response = await fetch(`${OPEN_NOTEBOOK_API}/api/search/ask/simple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      notebook_id: NOTEBOOK_ID,
      strategy_model: modelId,
      answer_model: modelId,
      final_answer_model: modelId,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    const detail = err.detail;

    if (typeof detail === 'string' && detail.includes('embedding')) {
      throw new Error(
        'An embedding model is required. In Open Notebook (localhost:8502) → Settings → Models, add "text-embedding-004" (Gemini, Embedding type) and set it as the default embedding model.'
      );
    }
    if (Array.isArray(detail)) {
      throw new Error('API error: ' + detail.map((e) => e.msg || JSON.stringify(e)).join(', '));
    }
    throw new Error(detail || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.answer || data.response || data.content || JSON.stringify(data);
}
