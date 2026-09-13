# NormAI — AI-Powered IS Standards Recommendation Engine
### Smart India Hackathon 2026 · Bureau of Indian Standards (BIS)

---

## 🔍 Project Overview

**NormAI** is an AI-powered Indian Standards recommendation and procurement compliance engine built for Smart India Hackathon 2026 that automatically identifies applicable Indian Standards (IS/BIS codes) for any government procurement specification using a custom RAG (Retrieval-Augmented Generation) pipeline backed by a self-hosted knowledge base engine.

---

## 1. Proposed Solution

### Detailed Explanation

A user enters a free-text procurement specification (e.g., *"Supply of TMT reinforcement bars Fe 500D grade for RCC column and beam work"*). The system:
- Passes the specification to a **custom RAG pipeline** backed by a self-hosted knowledge base engine
- Queries a curated knowledge base of **41 Indian Standards** across **9 categories** and **38 reference procurement queries**
- Returns a structured AI-generated report listing all applicable IS/BIS codes, their scope, mandatory BIS certification status, and reason for applicability

The frontend (Vite SPA) connects to the RAG backend's REST API, checks API and embedding model health in real-time, and renders the AI response as formatted markdown. Users can also pick from curated example specifications (PVC cables, safety helmets, structural steel, uPVC pipes, etc.) as quick-start prompts.

### How It Addresses the Problem

| Problem | Solution |
|---|---|
| Procurement officers manually searching for applicable IS standards | Engine automates BIS code lookup with AI in seconds |
| Difficulty identifying mandatory BIS certification requirements | AI explicitly flags MANDATORY vs. optional certifications per standard |
| Non-compliant tenders due to missing IS standards | System ensures all relevant standards are surfaced before tender submission |
| Data privacy concerns with cloud-based AI tools | RAG pipeline is 100% self-hosted via Docker — data never leaves the organization |
| High barrier for non-expert staff | Natural-language interface — no knowledge of IS code numbers required |

### Innovation and Uniqueness

- **Hybrid Dual-Engine Architecture (Zero-Downtime Guarantee)**: Integrates live self-hosted RAG LLM retrieval with an instant local offline BIS knowledge engine over all 41 curated standards. Even when backend models are loading or offline, evaluations never fail.
- **Multi-Item Tender & BOQ Analyzer**: Splits multi-line RFP / tender documents into individual line items and generates a consolidated tender compliance matrix.
- **GeM (Government e-Marketplace) Clause Generator**: Generates legally enforceable tender compliance clauses with mandatory ISI-mark stipulations ready for copy-pasting into bid documents.
- **Printable Official BIS Compliance Dossier**: Instant generation of an audit-ready compliance report with verification reference ID, timestamps, QCO alerts, and signature blocks.
- **Interactive Standards Master Catalog**: Filterable drawer with all 41 standards, category pills, and mandatory QCO toggles.
- **Real-Time Candidate Detector**: Instant sub-second detection of candidate standards as users type specifications.
- **BIS Certification Flagging**: Automatically surfaces mandatory BIS certification requirements — a compliance-critical feature absent from traditional standards lookup tools.
- **Live API Telemetry**: Proactively monitors backend and embedding model health, switching seamlessly to resilient local engine when needed.

---

## 2. Technical Approach

### Technologies Used

| Layer | Technology | Purpose |
|---|---|---|
| **Knowledge Base Backend** | Custom RAG pipeline (self-hosted) | Document ingestion, semantic retrieval, AI orchestration |
| **Database** | SurrealDB | Multi-modal knowledge base storage with vector search |
| **Local Knowledge Engine** | Client-Side BM25 / Fuzzy Semantic Matcher | Zero-latency fallback and real-time candidate detection |
| **LLM** | Configurable — OpenAI, Gemini, Anthropic, Ollama, etc. | Generates structured IS standards answers |
| **Embedding Model** | Configurable (e.g., `text-embedding-004` via Gemini) | Semantic similarity search over IS standards |
| **API Layer** | FastAPI REST backend (`localhost:5055`) | Single integration point for frontend |
| **Frontend Framework** | Vite + Vanilla JavaScript ES Modules | High-performance, lightweight SPA |
| **Styling** | Vanilla CSS (dark theme, glassmorphism) | Premium GovTech UI with Indian flag ambient lighting motif |
| **Containerization** | Docker + Docker Compose | Reproducible one-command deployment |

### Knowledge Base Structure

| Source Type | Count | Content |
|---|---|---|
| IS Standards | 41 | Standard_ID, IS_Code, Standard_Title, Scope_Description, Category, BIS_Certification_Mandatory |
| Procurement Query Examples | 38 | Procurement_Specification, Relevant_IS_Codes, Num_Relevant_Standards, Category, Label |

### Frontend Architecture

```
is-standards-frontend/
├── src/
│   ├── config.js         — API endpoints, knowledge base ID, categorized example specs
│   ├── standardsData.js  — 41 curated BIS standards, categories, QCO flags, keywords
│   ├── localEngine.js    — Client-side hybrid matcher, BOQ tender parser, GeM clause generator
│   ├── api.js           — Resilient dual-engine query dispatcher with RAG and fallback
│   ├── utils.js         — Markdown renderer, clipboard copy, official printable dossier generator
│   ├── main.js          — UI controller, tab switching, real-time candidate detector, modal
│   └── style.css        — GovTech glassmorphism design system with Tricolor ambient lighting
└── index.html           — Application entry point
```

---

## 3. Feasibility and Viability

### Analysis of Feasibility

| Dimension | Assessment |
|---|---|
| **Technical** | All components are proven open-source. Docker Compose enables one-command deployment on any server. |
| **Data** | IS Standards database is static and curated (41 standards, 9 categories) — straightforward to expand via the knowledge base management UI. |
| **Hardware** | The RAG pipeline requires no GPU. With a cloud LLM (Gemini/OpenAI), any laptop or server suffices. For fully offline: Ollama + a mid-range GPU. |
| **Integration** | Single REST API endpoint (`/api/search/ask/simple`) — minimal frontend coupling, easy to embed in GeM or other portals. |
| **Scalability** | SurrealDB scales horizontally. Knowledge base can grow to thousands of IS standards with no architecture change. |
| **Maintainability** | New IS standards can be added via the knowledge base management interface — no code changes required. |

### Potential Challenges and Risks

| Challenge | Risk Level | Mitigation Strategy |
|---|---|---|
| LLM hallucinating non-existent IS codes | 🔴 High | RAG strictly grounds responses in the verified knowledge base; system prompt mandates accuracy over completeness |
| Procurement data sensitivity / classification | 🔴 High | Fully self-hosted via Docker + Ollama — zero data leaves the network |
| IS Standards database becoming stale | 🟡 Medium | Knowledge base management UI allows non-technical staff to add new standards without re-coding |
| Ambiguous or vague procurement specifications | 🟡 Medium | System prompt instructs relevance ranking and explicit "no applicable standard" response when uncertain |
| Embedding model not configured | 🟢 Low | Frontend live-checks embedding model status and shows actionable error message to guide setup |

### Strategies for Overcoming Challenges

1. **Anti-Hallucination via RAG**: LLM only sees retrieved IS standards as context — fabricating codes not in the knowledge base is structurally prevented.
2. **Air-Gapped Deployment**: The RAG pipeline + Ollama run 100% offline — no API keys or internet access required for sensitive government environments.
3. **BIS Compliance as Hard Metadata**: `BIS_Certification_Mandatory` is a stored field in the knowledge base, not LLM-inferred — eliminating compliance ambiguity.
4. **Progressive Setup Guidance**: The live status badge in the UI tells users exactly what is missing (offline API, no embedding model) before they attempt a query.

---

## 4. Impact and Benefits

### Potential Impact on Target Audience

**Primary Users**: Government procurement officers, BIS compliance teams, GeM (Government e-Marketplace) administrators, public sector engineers

- **Procurement Officers** save hours of manual IS code lookup per tender
- **Compliance Teams** get instant, AI-verified BIS certification requirement checks
- **Tender Committees** reduce risk of non-compliant procurement by catching missing standards early
- **GeM Administrators** can integrate the API to auto-validate supplier specifications at submission time

**Secondary Users**: Private sector vendors responding to government tenders, BIS-approved testing labs, MSME suppliers

### Benefits

#### 🏛️ Social Benefits
- **Public Safety**: Ensures government-procured materials conform to Indian quality and safety standards
- **Transparency**: AI-generated reasoning trail showing which standards apply and why
- **Inclusivity**: Natural-language interface removes the need to memorize IS code numbers
- **Capacity Building**: Reduces dependence on IS standards consultants in smaller government offices

#### 💰 Economic Benefits
- **Reduced Tender Rejections**: Catches non-compliant specifications before submission — saving re-tendering costs
- **Time Efficiency**: Seconds vs. hours for IS code lookup
- **Vendor Clarity**: AI-generated specs reduce ambiguity and procurement disputes
- **National Scale Potential**: GeM integration could prevent crores in non-compliant procurement annually

#### 🌱 Environmental Benefits
- **Paperless Compliance**: Replaces physical IS standards documents and manual catalogues
- **No Cloud Compute**: Local deployment eliminates cloud carbon footprint
- **Efficient Procurement**: Accurate specs reduce over-procurement and material waste

---

## 5. Research and References

### IS Standards Knowledge Base
- **Bureau of Indian Standards (BIS)**: https://www.bis.gov.in/
- **IS Standards Catalogue**: https://www.bis.gov.in/index.php/standards/bis-catalogue/
- **BIS Compulsory Registration Scheme (CRS)**: https://www.bis.gov.in/index.php/product-certification/crs/

### Core Libraries and Frameworks
- **SurrealDB** (Knowledge base store): https://surrealdb.com/
- **FastAPI** (RAG backend REST API): https://fastapi.tiangolo.com/
- **LangChain** (RAG orchestration): https://www.langchain.com/
- **Vite** (Frontend build tool): https://vitejs.dev/

### Research Papers & Technical References
- **RAG (Retrieval-Augmented Generation)**: Lewis et al., 2020 — "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" — https://arxiv.org/abs/2005.11401
- **Sentence Embeddings for Semantic Search**: Reimers & Gurevych, 2019 — "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks" — https://arxiv.org/abs/1908.10084

### Government & Policy References
- **Government e-Marketplace (GeM)**: https://gem.gov.in/
- **Public Procurement Policy for MSEs**: https://msme.gov.in/
- **National Public Procurement Policy**: Ministry of Finance, Government of India
- **Make in India — Standards**: https://www.makeinindia.com/

---

*Project developed for Smart India Hackathon 2026 | Theme: Bureau of Indian Standards · AI-Powered Procurement Intelligence*
