import { RAG_BACKEND_API, KNOWLEDGE_BASE_ID, SYSTEM_PROMPT } from './config.js';
import { analyzeSpecification } from './localEngine.js';

let defaultModelId = null;

/**
 * Fetch with timeout helper to avoid hanging on offline ports.
 */
async function fetchWithTimeout(resource, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Fetch and cache the default chat model ID from the RAG backend.
 * @returns {Promise<string|null>}
 */
export async function getDefaultModelId() {
  if (defaultModelId) return defaultModelId;
  const res = await fetchWithTimeout(`${RAG_BACKEND_API}/api/models/defaults`, {}, 2500);
  if (!res.ok) throw new Error('Could not reach RAG Backend API at localhost:5055.');
  const data = await res.json();
  if (!data.default_chat_model) {
    throw new Error('No default chat model configured in backend.');
  }
  defaultModelId = data.default_chat_model;
  return defaultModelId;
}

/**
 * Check if the RAG Backend API is reachable and configured.
 * Returns fast (within 2s max) to ensure snappy UI startup.
 * @returns {Promise<{ok: boolean, hasEmbedding: boolean, message?: string}>}
 */
export async function checkApiStatus() {
  try {
    const res = await fetchWithTimeout(`${RAG_BACKEND_API}/api/models/defaults`, {}, 2000);
    if (!res.ok) return { ok: false, hasEmbedding: false, message: 'API responded with error' };
    const data = await res.json();
    return {
      ok: true,
      hasEmbedding: !!data.default_embedding_model,
      chatModel: data.default_chat_model || null,
      embeddingModel: data.default_embedding_model || null
    };
  } catch (err) {
    return {
      ok: false,
      hasEmbedding: false,
      message: err.name === 'AbortError' ? 'API timeout' : 'API offline'
    };
  }
}

/**
 * Query the IS Standards engine with intelligent hybrid fallback.
 * Tries the deep RAG backend; if offline or misconfigured, seamlessly
 * falls back to the client-side local BIS engine.
 *
 * @param {string} spec - Procurement specification text
 * @returns {Promise<{
 *   answer: string,
 *   engine: 'rag' | 'local',
 *   standards: Array,
 *   mandatoryCount: number,
 *   confidence: number
 * }>}
 */
export async function queryStandards(spec) {
  // Run local engine analysis concurrently for fast metadata extraction
  const localAnalysis = analyzeSpecification(spec);

  try {
    const status = await checkApiStatus();
    if (!status.ok || !status.hasEmbedding) {
      throw new Error(status.ok ? 'Embedding model not configured' : 'RAG backend offline');
    }

    const modelId = await getDefaultModelId();

    const question = `Procurement Specification: "${spec}"

Which Indian Standards (IS/BIS codes) apply to this specification? List all applicable standards with their IS code, title, scope, BIS certification requirement (mandatory or not), and explain why each standard applies.`;

    const response = await fetchWithTimeout(
      `${RAG_BACKEND_API}/api/search/ask/simple`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          notebook_id: KNOWLEDGE_BASE_ID,
          strategy_model: modelId,
          answer_model: modelId,
          final_answer_model: modelId,
        }),
      },
      25000 // allow up to 25s for LLM RAG reasoning
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Backend responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    const answer = data.answer || data.response || data.content || JSON.stringify(data);

    return {
      answer,
      engine: 'rag',
      standards: localAnalysis.standards,
      mandatoryCount: localAnalysis.mandatoryCount,
      confidence: Math.max(88, localAnalysis.confidence),
      fallbackReason: null
    };
  } catch (err) {
    // Graceful hybrid fallback to Local BIS Knowledge Engine
    console.warn('Falling back to local BIS engine:', err.message);

    // Format synthesized answer from the local master dataset
    const answer = formatLocalAnswer(spec, localAnalysis);

    return {
      answer,
      engine: 'local',
      standards: localAnalysis.standards,
      mandatoryCount: localAnalysis.mandatoryCount,
      confidence: localAnalysis.confidence,
      fallbackReason: err.message
    };
  }
}

/**
 * Format a comprehensive, structured response when in Local BIS Engine mode.
 */
function formatLocalAnswer(spec, analysis) {
  if (!analysis.standards || analysis.standards.length === 0) {
    return `### No Direct Indian Standards Found

We evaluated the specification:
> "${spec}"

**Finding**: No direct matches were identified in the primary 41-standard curated database.

**Recommendations:**
1. Check for standard terminology (e.g. use "TMT reinforcement bars", "OPC 43 Grade", "uPVC pipes", or "industrial safety helmet").
2. Refer to the [Bureau of Indian Standards Standards Catalogue](https://www.bis.gov.in/) for specialized products.`;
  }

  let text = `### Verified Applicable Indian Standards (BIS Master Database)\n\n`;
  text += `Analysis evaluated against the **41 Bureau of Indian Standards Master Knowledge Base**. Found **${analysis.standards.length} applicable standard(s)**:\n\n`;

  analysis.standards.forEach((std, idx) => {
    const certBadge = std.mandatory
      ? `🚨 **MANDATORY BIS CERTIFICATION** (${std.qcoStatus})`
      : `ℹ️ **Voluntary / National Code of Practice** (${std.qcoStatus})`;

    text += `### ${idx + 1}. ${std.code} — ${std.title}\n`;
    text += `- **Standard ID**: \`${std.id}\` | **Category**: ${std.category}\n`;
    text += `- **BIS Certification Status**: ${certBadge}\n`;
    text += `- **Scope**: ${std.scope}\n`;
    text += `- **Relevance Justification**: Matches specification requirements for ${std.keywords.slice(0, 4).join(', ')}.\n`;
    if (std.testingStandards && std.testingStandards.length > 0) {
      text += `- **Referenced Test Methods**: \`${std.testingStandards.join('`, `')}\`\n`;
    }
    text += `\n---\n\n`;
  });

  if (analysis.mandatoryCount > 0) {
    text += `> ⚠️ **Procurement Compliance Note**: **${analysis.mandatoryCount}** of the identified standard(s) are legally enforced under Government of India Quality Control Orders (QCO). Tenders must mandate active BIS license (ISI Mark/CRS registration) in the technical eligibility criteria.`;
  }

  return text;
}
