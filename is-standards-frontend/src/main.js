import { EXAMPLES } from './config.js';
import { checkApiStatus, queryStandards } from './api.js';
import { renderMarkdown, truncate } from './utils.js';

// ── DOM refs ─────────────────────────────────────────────────────────────────
const specInput      = document.getElementById('spec-input');
const submitBtn      = document.getElementById('submit-btn');
const loadingEl      = document.getElementById('loading');
const resultCard     = document.getElementById('result-card');
const resultBody     = document.getElementById('result-body');
const resultMeta     = document.getElementById('result-meta');
const errorCard      = document.getElementById('error-card');
const examplesEl     = document.getElementById('examples-container');
const statusBadge    = document.getElementById('status-badge');
const statusText     = document.getElementById('status-text');

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  renderExamples();
  checkStatus();
  specInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) recommend();
  });
  submitBtn.addEventListener('click', recommend);
}

// ── Status badge ──────────────────────────────────────────────────────────────
async function checkStatus() {
  const { ok, hasEmbedding } = await checkApiStatus();
  if (!ok) {
    statusBadge.style.background = 'rgba(239,68,68,0.1)';
    statusBadge.style.borderColor = 'rgba(239,68,68,0.3)';
    statusBadge.style.color = '#fca5a5';
    statusText.textContent = 'API Offline';
  } else if (!hasEmbedding) {
    statusBadge.style.background = 'rgba(234,179,8,0.1)';
    statusBadge.style.borderColor = 'rgba(234,179,8,0.3)';
    statusBadge.style.color = '#fde047';
    statusText.textContent = 'No Embedding Model';
  } else {
    statusText.textContent = 'AI · Live';
  }
}

// ── Example chips ─────────────────────────────────────────────────────────────
function renderExamples() {
  examplesEl.innerHTML = EXAMPLES.map(
    (ex) => `<div class="example-chip" role="button" tabindex="0">${ex}</div>`
  ).join('');

  examplesEl.querySelectorAll('.example-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      specInput.value = chip.textContent;
      specInput.focus();
    });
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        specInput.value = chip.textContent;
        specInput.focus();
      }
    });
  });
}

// ── Recommend ─────────────────────────────────────────────────────────────────
async function recommend() {
  const spec = specInput.value.trim();
  if (!spec) { specInput.focus(); return; }

  setLoading(true);
  hideResult();
  hideError();

  try {
    const answer = await queryStandards(spec);
    showResult(answer, spec);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setLoading(on) {
  submitBtn.disabled = on;
  loadingEl.style.display = on ? 'block' : 'none';
  submitBtn.innerHTML = on
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analyzing...`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Find Applicable Standards`;
}

function showResult(answer, spec) {
  resultBody.innerHTML = renderMarkdown(answer);
  resultMeta.textContent = `Specification: "${truncate(spec)}"`;
  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideResult() {
  resultCard.style.display = 'none';
}

function showError(message) {
  errorCard.innerHTML = `<strong>Error:</strong> ${message}`;
  errorCard.style.display = 'block';
}

function hideError() {
  errorCard.style.display = 'none';
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
