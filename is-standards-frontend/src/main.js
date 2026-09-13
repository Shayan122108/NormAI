import {
  EXAMPLES,
  PROCUREMENT_EXAMPLES_BY_CATEGORY
} from './config.js';
import {
  STANDARDS_DATABASE,
  IS_CATEGORIES
} from './standardsData.js';
import { checkApiStatus, queryStandards } from './api.js';
import {
  analyzeSpecification,
  analyzeMultiItemTender,
  generateGeMClause
} from './localEngine.js';
import {
  renderMarkdown,
  truncate,
  copyToClipboard,
  downloadJson,
  printComplianceDossier
} from './utils.js';

// ── State ────────────────────────────────────────────────────────────────────
let activeTab = 'single';
let currentSingleResult = null;
let currentBOQResult = null;
let liveDebounceTimer = null;

// ── DOM References ───────────────────────────────────────────────────────────
// Header & Status
const statusBadge     = document.getElementById('status-badge');
const statusText      = document.getElementById('status-text');
const openCatalogBtn  = document.getElementById('open-catalog-btn');

// Tabs
const tabSingle       = document.getElementById('tab-single');
const tabBoq          = document.getElementById('tab-boq');
const singleSpecCard  = document.getElementById('single-spec-card');
const boqModeCard     = document.getElementById('boq-mode-card');

// Single Spec Mode
const specInput       = document.getElementById('spec-input');
const submitBtn       = document.getElementById('submit-btn');
const clearBtn        = document.getElementById('clear-btn');
const liveDetector    = document.getElementById('live-detector');
const detectorChips   = document.getElementById('detector-chips');
const categoryPills   = document.getElementById('category-pills');
const examplesEl      = document.getElementById('examples-container');

// Multi-Item BOQ Mode
const boqInput        = document.getElementById('boq-input');
const submitBoqBtn    = document.getElementById('submit-boq-btn');
const clearBoqBtn     = document.getElementById('clear-boq-btn');
const loadSampleBoq   = document.getElementById('load-sample-boq');

// Results & Loading
const loadingEl       = document.getElementById('loading');
const loadingTitle    = document.getElementById('loading-title');
const loadingSub      = document.getElementById('loading-sub');
const errorCard       = document.getElementById('error-card');

// Single Spec Result Card
const resultCard      = document.getElementById('result-card');
const resultMeta      = document.getElementById('result-meta');
const resultBody      = document.getElementById('result-body');
const resultEngine    = document.getElementById('result-engine-badge');
const standardsGrid   = document.getElementById('standards-grid');
const qcoBanner       = document.getElementById('qco-alert-banner');
const qcoBannerText   = document.getElementById('qco-banner-text');

// BOQ Result Card
const boqResultCard   = document.getElementById('boq-result-card');
const boqCoverageBadge= document.getElementById('boq-coverage-badge');
const boqTableBody    = document.getElementById('boq-table-body');
const boqSummaryMeta  = document.getElementById('boq-summary-meta');

// Actions
const btnCopyGem      = document.getElementById('btn-copy-gem');
const btnExportDossier= document.getElementById('btn-export-dossier');
const btnExportJson   = document.getElementById('btn-export-json');
const btnBoqCopyGem   = document.getElementById('btn-boq-copy-gem');
const btnBoqPrint     = document.getElementById('btn-boq-print');

// Catalog Modal
const catalogModal    = document.getElementById('catalog-modal');
const closeCatalogBtn = document.getElementById('close-catalog-btn');
const catalogSearch   = document.getElementById('catalog-search');
const catalogCategory = document.getElementById('catalog-category-select');
const catalogMandatory= document.getElementById('catalog-mandatory-only');
const catalogList     = document.getElementById('catalog-list');

// Toast
const toastEl         = document.getElementById('toast');

// ── Initialization ───────────────────────────────────────────────────────────
function init() {
  setupTabs();
  setupPresets();
  setupCatalogModal();
  setupEventListeners();
  checkStatus();
}

// ── Status Telemetry ─────────────────────────────────────────────────────────
async function checkStatus() {
  const status = await checkApiStatus();
  if (status.ok && status.hasEmbedding) {
    statusBadge.style.background = 'rgba(16, 185, 129, 0.12)';
    statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    statusBadge.style.color = '#34d399';
    statusText.textContent = 'RAG Live (Cloud/Local)';
  } else {
    // Graceful indicator: System is fully operational via embedded BIS engine
    statusBadge.style.background = 'rgba(59, 130, 246, 0.12)';
    statusBadge.style.borderColor = 'rgba(59, 130, 246, 0.35)';
    statusBadge.style.color = '#93c5fd';
    statusText.textContent = '⚡ Local BIS Engine Active';
  }
}

// ── Tabs Setup ───────────────────────────────────────────────────────────────
function setupTabs() {
  tabSingle.addEventListener('click', () => switchTab('single'));
  tabBoq.addEventListener('click', () => switchTab('boq'));
}

function switchTab(tab) {
  activeTab = tab;
  if (tab === 'single') {
    tabSingle.classList.add('active');
    tabSingle.setAttribute('aria-selected', 'true');
    tabBoq.classList.remove('active');
    tabBoq.setAttribute('aria-selected', 'false');
    singleSpecCard.style.display = 'block';
    boqModeCard.style.display = 'none';
  } else {
    tabBoq.classList.add('active');
    tabBoq.setAttribute('aria-selected', 'true');
    tabSingle.classList.remove('active');
    tabSingle.setAttribute('aria-selected', 'false');
    boqModeCard.style.display = 'block';
    singleSpecCard.style.display = 'none';
  }
  hideError();
}

// ── Presets & Category Filter ────────────────────────────────────────────────
function setupPresets() {
  const categories = Object.keys(PROCUREMENT_EXAMPLES_BY_CATEGORY);
  let activeCat = categories[0];

  categoryPills.innerHTML = categories.map((cat, i) => `
    <button class="cat-pill ${i === 0 ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('');

  categoryPills.querySelectorAll('.cat-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      categoryPills.querySelectorAll('.cat-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeCat = pill.getAttribute('data-cat');
      renderExamplesList(PROCUREMENT_EXAMPLES_BY_CATEGORY[activeCat]);
    });
  });

  renderExamplesList(PROCUREMENT_EXAMPLES_BY_CATEGORY[activeCat]);
}

function renderExamplesList(list) {
  examplesEl.innerHTML = list.map(
    (ex) => `<div class="example-chip" role="button" tabindex="0">${ex}</div>`
  ).join('');

  examplesEl.querySelectorAll('.example-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      specInput.value = chip.textContent.trim();
      specInput.focus();
      triggerLiveDetection(specInput.value);
    });
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        specInput.value = chip.textContent.trim();
        specInput.focus();
        triggerLiveDetection(specInput.value);
      }
    });
  });
}

// ── Live Candidate Matcher ───────────────────────────────────────────────────
function triggerLiveDetection(text) {
  clearTimeout(liveDebounceTimer);
  liveDebounceTimer = setTimeout(() => {
    if (!text || text.trim().length < 4) {
      liveDetector.style.display = 'none';
      return;
    }
    const analysis = analyzeSpecification(text);
    if (analysis.standards.length > 0) {
      detectorChips.innerHTML = analysis.standards.slice(0, 3).map((s) => `
        <span class="detector-chip ${s.mandatory ? 'mandatory' : ''}">
          ${s.cleanCode} ${s.mandatory ? '(Mandatory QCO)' : ''}
        </span>
      `).join('');
      liveDetector.style.display = 'flex';
    } else {
      liveDetector.style.display = 'none';
    }
  }, 180);
}

// ── Event Listeners ──────────────────────────────────────────────────────────
function setupEventListeners() {
  // Live input monitoring
  specInput.addEventListener('input', (e) => triggerLiveDetection(e.target.value));

  // Keyboard shortcut Ctrl + Enter
  specInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) recommendSingle();
  });
  boqInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) auditTenderBOQ();
  });

  // Submit and clear buttons
  submitBtn.addEventListener('click', recommendSingle);
  clearBtn.addEventListener('click', () => {
    specInput.value = '';
    liveDetector.style.display = 'none';
    hideResult();
    specInput.focus();
  });

  submitBoqBtn.addEventListener('click', auditTenderBOQ);
  clearBoqBtn.addEventListener('click', () => {
    boqInput.value = '';
    boqResultCard.style.display = 'none';
    boqInput.focus();
  });

  // Load sample BOQ
  loadSampleBoq.addEventListener('click', () => {
    boqInput.value = `Item 1: Supply of 43 Grade Ordinary Portland Cement for RCC construction work
Item 2: Thermo-Mechanically Treated (TMT) steel reinforcement bars Fe 500D grade
Item 3: Unplasticized PVC (uPVC) pressure pipes 110mm diameter for drinking water supply
Item 4: Industrial safety helmets with ratchet harness and leather safety footwear with steel toe`;
    boqInput.focus();
  });

  // Action button clicks
  btnCopyGem.addEventListener('click', () => {
    if (!currentSingleResult || !currentSingleResult.standards) return;
    const clause = generateGeMClause(currentSingleResult.standards, currentSingleResult.spec);
    copyToClipboard(clause).then((ok) => {
      showToast(ok ? '✅ GeM Technical Clause copied to clipboard!' : 'Failed to copy');
    });
  });

  btnExportDossier.addEventListener('click', () => {
    if (!currentSingleResult) return;
    printComplianceDossier({
      spec: currentSingleResult.spec,
      standards: currentSingleResult.standards,
      engine: currentSingleResult.engine
    });
  });

  btnExportJson.addEventListener('click', () => {
    if (!currentSingleResult) return;
    downloadJson(currentSingleResult, `BIS_Audit_${Date.now()}.json`);
    showToast('💾 Audit report exported as JSON');
  });

  btnBoqCopyGem.addEventListener('click', () => {
    if (!currentBOQResult || !currentBOQResult.uniqueStandards) return;
    const clause = generateGeMClause(currentBOQResult.uniqueStandards, 'Consolidated Tender Procurement');
    copyToClipboard(clause).then((ok) => {
      showToast(ok ? '✅ Consolidated GeM Tender Clause copied!' : 'Failed to copy');
    });
  });

  btnBoqPrint.addEventListener('click', () => {
    window.print();
  });
}

// ── Single Spec Analysis ─────────────────────────────────────────────────────
async function recommendSingle() {
  const spec = specInput.value.trim();
  if (!spec) { specInput.focus(); return; }

  setLoading(true, 'Evaluating Procurement Specification...', 'Cross-referencing 41 BIS standards & checking Quality Control Orders');
  hideResult();
  hideError();

  try {
    const res = await queryStandards(spec);
    currentSingleResult = {
      spec,
      ...res
    };
    renderSingleResult(currentSingleResult);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function renderSingleResult(result) {
  // Engine badge
  resultEngine.textContent = result.engine === 'rag'
    ? '⚡ Self-Hosted RAG Pipeline (Live)'
    : '⚡ Resilient Local BIS Engine';
  resultEngine.style.background = result.engine === 'rag'
    ? 'rgba(16, 185, 129, 0.15)'
    : 'rgba(59, 130, 246, 0.15)';
  resultEngine.style.color = result.engine === 'rag' ? '#34d399' : '#93c5fd';

  resultMeta.textContent = `Specification: "${truncate(result.spec, 90)}"`;

  // Mandatory QCO Banner
  if (result.mandatoryCount > 0) {
    qcoBannerText.textContent = `${result.mandatoryCount} standard(s) identified under mandatory Government of India Quality Control Orders. Bidders must hold active BIS ISI Mark / CRS License.`;
    qcoBanner.style.display = 'flex';
  } else {
    qcoBanner.style.display = 'none';
  }

  // Structured standards cards
  if (result.standards && result.standards.length > 0) {
    standardsGrid.innerHTML = result.standards.map((std) => `
      <div class="std-card">
        <div class="std-card-header">
          <div class="std-code-title">
            <span class="std-code-chip">${std.code}</span>
            <span class="std-title">${std.title}</span>
          </div>
          <span class="std-status-pill ${std.mandatory ? 'mandatory' : 'voluntary'}">
            ${std.mandatory ? '🚨 Mandatory QCO' : 'Voluntary Code'}
          </span>
        </div>
        <p class="std-scope">${std.scope}</p>
        <div class="std-meta-row">
          <span>Category: <strong>${std.category}</strong></span>
          <div class="std-actions">
            <a href="https://www.bis.gov.in/" target="_blank" rel="noopener" class="std-link-btn" title="Look up on official BIS portal">
              BIS Portal ↗
            </a>
          </div>
        </div>
      </div>
    `).join('');
    standardsGrid.style.display = 'grid';
  } else {
    standardsGrid.style.display = 'none';
  }

  // Render markdown narrative
  resultBody.innerHTML = renderMarkdown(result.answer);

  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Multi-Item BOQ Tender Analysis ───────────────────────────────────────────
function auditTenderBOQ() {
  const tenderText = boqInput.value.trim();
  if (!tenderText) { boqInput.focus(); return; }

  setLoading(true, 'Auditing Tender Bill of Quantities...', 'Parsing multi-line specifications and compiling compliance matrix');
  boqResultCard.style.display = 'none';
  hideError();

  setTimeout(() => {
    try {
      const audit = analyzeMultiItemTender(tenderText);
      currentBOQResult = audit;
      renderBOQResult(audit);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, 400);
}

function renderBOQResult(audit) {
  boqCoverageBadge.textContent = `Coverage: ${audit.coveragePercent}% (${audit.coveredItems}/${audit.totalItems} Items)`;
  boqSummaryMeta.textContent = `Evaluated ${audit.totalItems} tender line item(s) · ${audit.uniqueStandards.length} unique BIS standard(s) identified · ${audit.totalMandatory} mandatory QCO certification(s).`;

  boqTableBody.innerHTML = audit.items.map((item) => {
    const stds = item.analysis.standards;
    const hasMandatory = stds.some((s) => s.mandatory);

    const stdBadges = stds.length > 0
      ? stds.map((s) => `<span class="detector-chip ${s.mandatory ? 'mandatory' : ''}">${s.cleanCode}</span>`).join(' ')
      : '<span style="color: #94a3b8; font-style: italic;">No direct standard</span>';

    const certStatus = stds.length === 0
      ? '<span class="std-status-pill voluntary">Unclassified</span>'
      : hasMandatory
        ? '<span class="std-status-pill mandatory">MANDATORY QCO</span>'
        : '<span class="std-status-pill voluntary">Standard Spec</span>';

    return `
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${item.index}</td>
        <td><strong>${item.cleaned}</strong></td>
        <td>${stdBadges}</td>
        <td style="text-align: center;">${certStatus}</td>
        <td>
          <button class="tool-btn" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.testSingleBOQItem('${escapeHtml(item.cleaned)}')">
            Inspect ↗
          </button>
        </td>
      </tr>
    `;
  }).join('');

  boqResultCard.style.display = 'block';
  boqResultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.testSingleBOQItem = function(specText) {
  switchTab('single');
  specInput.value = specText;
  recommendSingle();
};

function escapeHtml(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── Standards Catalog Modal ──────────────────────────────────────────────────
function setupCatalogModal() {
  openCatalogBtn.addEventListener('click', () => {
    catalogModal.style.display = 'flex';
    renderCatalogItems();
  });

  closeCatalogBtn.addEventListener('click', () => {
    catalogModal.style.display = 'none';
  });

  catalogModal.addEventListener('click', (e) => {
    if (e.target === catalogModal) catalogModal.style.display = 'none';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && catalogModal.style.display === 'flex') {
      catalogModal.style.display = 'none';
    }
  });

  // Populate category dropdown
  catalogCategory.innerHTML = IS_CATEGORIES.map(
    (c) => `<option value="${c}">${c}</option>`
  ).join('');

  // Filters
  catalogSearch.addEventListener('input', renderCatalogItems);
  catalogCategory.addEventListener('change', renderCatalogItems);
  catalogMandatory.addEventListener('change', renderCatalogItems);
}

function renderCatalogItems() {
  const query = catalogSearch.value.trim().toLowerCase();
  const selectedCat = catalogCategory.value;
  const mandatoryOnly = catalogMandatory.checked;

  const filtered = STANDARDS_DATABASE.filter((std) => {
    if (mandatoryOnly && !std.mandatory) return false;
    if (selectedCat !== 'All Categories' && std.category !== selectedCat) return false;
    if (query) {
      const matchCode = std.code.toLowerCase().includes(query);
      const matchTitle = std.title.toLowerCase().includes(query);
      const matchScope = std.scope.toLowerCase().includes(query);
      const matchKw = std.keywords.some((k) => k.toLowerCase().includes(query));
      if (!matchCode && !matchTitle && !matchScope && !matchKw) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    catalogList.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">No standards found matching your criteria.</div>`;
    return;
  }

  catalogList.innerHTML = filtered.map((std) => `
    <div class="catalog-item">
      <div class="std-card-header">
        <div class="std-code-title">
          <span class="std-code-chip">${std.code}</span>
          <span class="std-title">${std.title}</span>
        </div>
        <span class="std-status-pill ${std.mandatory ? 'mandatory' : 'voluntary'}">
          ${std.mandatory ? 'Mandatory QCO' : 'Voluntary'}
        </span>
      </div>
      <p class="std-scope">${std.scope}</p>
      <div class="std-meta-row">
        <span>Category: <strong>${std.category}</strong></span>
        <button class="tool-btn" style="padding: 4px 8px; font-size: 0.72rem;" onclick="window.useCatalogStandard('${escapeHtml(std.scope)}')">
          Query with this Standard ↵
        </button>
      </div>
    </div>
  `).join('');
}

window.useCatalogStandard = function(specSnippet) {
  catalogModal.style.display = 'none';
  switchTab('single');
  specInput.value = specSnippet;
  recommendSingle();
};

// ── UI Helpers ───────────────────────────────────────────────────────────────
function setLoading(on, title = 'Evaluating...', sub = 'Please wait') {
  submitBtn.disabled = on;
  submitBoqBtn.disabled = on;
  loadingTitle.textContent = title;
  loadingSub.textContent = sub;
  loadingEl.style.display = on ? 'block' : 'none';

  if (on) {
    submitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analyzing...`;
  } else {
    submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Analyze Applicable Standards`;
  }
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

function showToast(message) {
  toastEl.textContent = message;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3200);
}

// ── Start ────────────────────────────────────────────────────────────────────
init();
