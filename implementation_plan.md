# AI-Powered IS Standards Recommendation Engine — Innovation & Refinement Plan

## Project Background & Problem Context
The **IS Standards Recommendation Engine** (developed for Smart India Hackathon 2026 under the Bureau of Indian Standards theme) enables government procurement officers to input raw procurement specifications and automatically receive relevant Indian Standards (IS/BIS codes), mandatory certification requirements, and compliance rationale.

While the existing prototype establishes the core concept with a custom RAG backend, it has several limitations:
1. **Single-point dependency on local RAG server**: If the Docker backend (`localhost:5055`) is starting, unconfigured, or offline, the application halts with an "API Offline" error.
2. **Single-item only**: Real-world tenders and Bills of Quantities (BOQs) contain multiple material requirements (e.g., TMT bars, cement, pipes, and electrical cables in one RFP).
3. **Raw markdown dump**: The output is rendered as an unformatted stream of markdown without structured badges, compliance ratios, or interactive cards.
4. **Missing procurement workflows**: Procurement officers need actionable outputs: ready-to-use **GeM (Government e-Marketplace) tender clauses**, downloadable **Official BIS Compliance Dossiers**, and instant standard verification links.
5. **No Standards Explorer**: Users cannot browse, filter, or audit the 41 BIS standards by category or mandatory QCO status.

---

## User Review Required

> [!IMPORTANT]
> **Proposed Innovation Highlights for Review:**
> 1. **Hybrid Intelligence Architecture (Dual Engine)**: Full RAG query when backend is active + Instant Local BIS Knowledge Engine fallback using the complete 41-standard dataset. Ensures zero demo crashes and instant sub-10ms preview while waiting for deep LLM generation.
> 2. **Multi-Item BOQ Tender Analyzer**: Dual tab interface — "Single Spec Query" and "Multi-Item Tender / BOQ Analyzer" that breaks down multi-line tender requirements into an aggregated compliance matrix.
> 3. **GeM Tender Clause Generator**: Automatically creates copy-pasteable legal boilerplate tender clauses referencing exact IS codes and mandatory ISI-mark requirements.
> 4. **Print-Ready BIS Compliance Dossier**: One-click generation of an official compliance report with date/time, specification digest, mandatory BIS checklist, and printable/PDF layout.
> 5. **Interactive Standards Catalog Modal**: Filterable drawer with all 41 IS standards, 9 categories, QCO mandatory flags, and instant "Analyze with this" button.
> 6. **Elevated Futuristic GovTech UI**: Indian Tricolor ambient glassmorphism, stats counters, keyboard shortcuts (`Ctrl+Enter`), and smooth micro-interactions.

---

## Open Questions

> [!NOTE]
> 1. **Default Mode on Launch**: Would you prefer the application to open on the standard Single Specification prompt or have quick-toggle tabs between "Single Specification" and "Multi-Item BOQ Analyzer"? *(Recommended: Dual-tab interface with Single Spec active by default)*.
> 2. **Dataset Expansion**: The 41 curated standards currently in `is_standards_master.md` cover Cement, Concrete, Masonry, Paving, Electrical, Furniture, IT, Metals, Safety/PPE, Steel, and Water. Should we also include standard BIS testing methods (e.g., IS 1608 for tensile testing of steel, IS 516 for concrete testing) as secondary cross-references? *(Recommended: Yes, automatically link testing standards in the GeM clauses)*.

---

## Proposed Changes

### 1. Data Layer & Local Knowledge Engine
#### [NEW] [standardsData.js](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/src/standardsData.js)
- Embed structured metadata for all 41 BIS master standards:
  - `id`, `isCode`, `year`, `title`, `category`, `scope`, `mandatory`, `qcoStatus`, `applicableKeywords`, `testStandards`, `sampleClause`.
- Embed 38 procurement reference patterns for hybrid scoring.
- Implement high-speed client-side semantic/token match scoring algorithm.

#### [NEW] [localEngine.js](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/src/localEngine.js)
- Hybrid matcher: Analyzes specification keywords, extracts material attributes (grades like Fe 500D, 43 Grade, IP codes, voltages, pipe sizes), calculates relevance confidence score, and formats standard recommendations with mandatory flags.
- Works as:
  1. Instant real-time candidate detection while user types.
  2. Complete offline fallback if RAG backend is offline or unconfigured.

---

### 2. API & Integration Layer
#### [MODIFY] [api.js](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/src/api.js)
- Support health-checking with resilient timeout handling (fail-fast to avoid freezing UI).
- Add dual-mode query runner:
  - If backend is online and configured: Executes RAG query via `/api/search/ask/simple`.
  - If backend is offline or errors: Seamlessly falls back to `localEngine.js` with notification banner so user experience never breaks.
- Structured response parser to extract individual standard cards, mandatory status, and recommendations.

#### [MODIFY] [config.js](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/src/config.js)
- Categorized example presets (Civil & Structural, Electrical & Power, Water Supply, IT & Electronics, Safety & PPE).
- Template definitions for GeM tender clauses.

---

### 3. UI & Feature Enhancements
#### [MODIFY] [index.html](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/index.html)
- Add mode switcher tabs: **Single Specification** | **Multi-Item Tender (BOQ)** | **Standards Explorer**.
- Add Live Telemetry Bar: System Status, Active Engine (Cloud/Local RAG), Total Standards Indexed (41), Mandatory QCOs (14).
- Add action buttons: **Copy GeM Clause**, **Export Official Dossier (PDF/Print)**, **Export JSON**.
- Add interactive **Standards Catalog Drawer/Modal** with search and category filtering.
- Add structured Result Card layout with compliance summary pill, mandatory alerts, and individual standard cards.

#### [MODIFY] [style.css](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/src/style.css)
- Implement premium GovTech design system:
  - Tricolor luminous accents (Saffron `#FF9933`, Crisp White `#FFFFFF`, India Green `#138808`).
  - Dark glassmorphic container panels with radial glow.
  - Interactive badges: Mandatory (red/amber glow), Voluntary (blue glow), QCO Enforced.
  - High-contrast typography and clean print stylesheet for PDF/Dossier generation (`@media print`).
  - Micro-animations for loading, badge pulsing, and tab switching.

#### [MODIFY] [main.js](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/src/main.js)
- Handle single-item vs multi-item BOQ parsing and state management.
- Render structured results cards with interactive buttons:
  - Direct BIS lookup link.
  - Instant copy of specific tender clause.
  - Mandatory QCO warning banner.
- Implement Standards Explorer modal controller with instant search and filter chips.
- Implement Dossier export (opens print dialog with formatted official BIS compliance document).

#### [MODIFY] [utils.js](file:///c:/Users/shaya/shayan/SIH2/is-standards-frontend/src/utils.js)
- Enhance markdown renderer with custom card wrappers and code syntax highlighting.
- Format GeM boilerplate tender clauses.
- Generate print-friendly compliance dossier HTML.

---

## Verification Plan

### Automated / Build Tests
- Validate Vite bundle build:
  ```powershell
  cd c:\Users\shaya\shayan\SIH2\is-standards-frontend
  npm run build
  ```
- Check for zero syntax errors and clean module resolution.

### Manual Verification
1. **Offline / Fallback Test**:
   - Run the frontend with Vite without the backend running.
   - Enter query (e.g. *"TMT rebar Fe 500D for RCC beam"*).
   - Verify that the local engine instantly identifies `IS 1786:2008` and `IS 456:2000`, flags `IS 1786` as Mandatory BIS Certification, and displays full scope and GeM clause.
2. **Multi-Item BOQ Analyzer Test**:
   - Paste a multi-item specification (e.g., Line 1: Cement 43 Grade; Line 2: PVC cables 1100V; Line 3: Industrial safety helmets).
   - Verify that all items are extracted, classified, and displayed in the consolidated compliance matrix.
3. **GeM Clause Generation**:
   - Click "Copy GeM Clause" and check clipboard output format for compliance with Government e-Marketplace standards.
4. **Standards Explorer Modal**:
   - Open catalog drawer, filter by "Safety & PPE" and toggle "Mandatory Only". Verify accurate list and test "Analyze" button.
5. **Export Dossier**:
   - Click "Export Dossier", verify printable layout with header, verification timestamp, and compliance summary table.
