import { STANDARDS_DATABASE } from './standardsData.js';

/**
 * Intelligent client-side BIS Standards Matching Engine.
 * Provides instant real-time lookup, fuzzy keyword scoring,
 * mandatory QCO detection, and multi-item BOQ tender analysis.
 */

// Common stop-words to ignore in procurement specs
const STOP_WORDS = new Set([
  'the', 'of', 'and', 'for', 'in', 'to', 'with', 'a', 'an', 'at', 'on', 'by',
  'as', 'from', 'all', 'any', 'or', 'per', 'specification', 'supply', 'procurement',
  'work', 'works', 'installation', 'required', 'providing', 'including', 'item'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Match a single procurement specification against the 41 IS standards database.
 * @param {string} spec
 * @returns {Object} { standards, mandatoryCount, topMatch, confidence, analysisText }
 */
export function analyzeSpecification(spec) {
  if (!spec || !spec.trim()) {
    return {
      standards: [],
      mandatoryCount: 0,
      confidence: 0,
      analysisText: 'No specification provided.'
    };
  }

  const cleanText = spec.toLowerCase();
  const tokens = tokenize(spec);

  const scored = STANDARDS_DATABASE.map((std) => {
    let score = 0;
    const reasons = [];

    // 1. Direct standard code hit (e.g. user typed "IS 1786" or "1786")
    const codeNum = std.cleanCode.replace(/[^0-9]/g, '');
    if (codeNum && cleanText.includes(codeNum)) {
      score += 60;
      reasons.push(`Direct BIS standard code match (${std.cleanCode})`);
    }

    // 2. Keyword exact & phrase matching
    std.keywords.forEach((kw) => {
      const kwLower = kw.toLowerCase();
      if (cleanText.includes(kwLower)) {
        score += 25;
        reasons.push(`Direct specification phrase match: "${kw}"`);
      } else {
        // partial token match
        const kwParts = kwLower.split(' ');
        const matchingParts = kwParts.filter((p) => tokens.includes(p));
        if (matchingParts.length === kwParts.length && kwParts.length > 1) {
          score += 15;
          reasons.push(`Compound keyword match: "${kw}"`);
        }
      }
    });

    // 3. Title token overlap
    const titleTokens = tokenize(std.title);
    const titleMatches = tokens.filter((t) => titleTokens.includes(t));
    if (titleMatches.length > 0) {
      score += titleMatches.length * 4;
    }

    // 4. Scope token overlap
    const scopeTokens = tokenize(std.scope);
    const scopeMatches = tokens.filter((t) => scopeTokens.includes(t));
    if (scopeMatches.length > 0) {
      score += scopeMatches.length * 2;
    }

    // 5. Category boost if category words are mentioned
    const catTokens = tokenize(std.category);
    if (catTokens.some((t) => tokens.includes(t))) {
      score += 5;
    }

    // Deduplicate reasons
    const uniqueReasons = [...new Set(reasons)];

    return {
      ...std,
      score,
      reasons: uniqueReasons,
      matchConfidence: Math.min(100, Math.round(score * 1.5))
    };
  });

  // Filter standards with significant relevance score
  const matches = scored
    .filter((s) => s.score >= 12)
    .sort((a, b) => b.score - a.score);

  const mandatoryCount = matches.filter((m) => m.mandatory).length;
  const topMatch = matches[0] || null;
  const confidence = topMatch ? Math.min(98, Math.max(45, topMatch.matchConfidence)) : 0;

  // Generate structured narrative
  let analysisText = '';
  if (matches.length === 0) {
    analysisText = `No directly applicable Indian Standards found in the 41-standard curated database for this specification. Please check your keywords or verify in the full BIS standards catalog.`;
  } else {
    analysisText = `Identified **${matches.length} applicable Indian Standard(s)** (${mandatoryCount} mandatory BIS certified under government Quality Control Orders).`;
  }

  return {
    spec,
    standards: matches,
    mandatoryCount,
    confidence,
    topMatch,
    analysisText
  };
}

/**
 * Split a multi-line BOQ or RFP text into discrete procurement line items.
 * @param {string} rawText
 * @returns {Array<{ index: number, rawLine: string, cleaned: string }>}
 */
export function parseTenderBOQ(rawText) {
  if (!rawText) return [];

  // Split by newlines or numbered patterns (e.g., "1.", "Item 1:", etc.)
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 4);

  const items = [];
  let currentItem = '';

  for (const line of lines) {
    // Check if line looks like the start of a new item
    const isNewItemPattern =
      /^(\d+[\.\)]|item\s*\d+[:\.]|line\s*\d+[:\.]|[-*•])\s+/i.test(line) ||
      (currentItem.length > 60 && /^[A-Z]/.test(line));

    if (isNewItemPattern && currentItem) {
      items.push(currentItem);
      currentItem = line;
    } else {
      currentItem = currentItem ? `${currentItem} ${line}` : line;
    }
  }

  if (currentItem) items.push(currentItem);

  return items.map((raw, idx) => ({
    index: idx + 1,
    rawLine: raw,
    cleaned: raw.replace(/^(\d+[\.\)]|item\s*\d+[:\.]|[-*•])\s+/i, '').trim()
  }));
}

/**
 * Analyze an entire multi-item Bill of Quantities (BOQ).
 * @param {string} tenderText
 * @returns {Object} Comprehensive tender audit report
 */
export function analyzeMultiItemTender(tenderText) {
  const items = parseTenderBOQ(tenderText);
  if (items.length === 0) {
    return {
      items: [],
      totalItems: 0,
      totalStandards: 0,
      totalMandatory: 0,
      overallCompliance: 100
    };
  }

  const analyzedItems = items.map((item) => {
    const analysis = analyzeSpecification(item.cleaned);
    return {
      index: item.index,
      rawLine: item.rawLine,
      cleaned: item.cleaned,
      analysis
    };
  });

  const allMatchedStandards = new Map();
  let totalMandatory = 0;

  analyzedItems.forEach((it) => {
    it.analysis.standards.forEach((std) => {
      if (!allMatchedStandards.has(std.code)) {
        allMatchedStandards.set(std.code, std);
        if (std.mandatory) totalMandatory++;
      }
    });
  });

  const coveredCount = analyzedItems.filter((i) => i.analysis.standards.length > 0).length;
  const coveragePercent = Math.round((coveredCount / items.length) * 100);

  return {
    items: analyzedItems,
    totalItems: items.length,
    coveredItems: coveredCount,
    coveragePercent,
    uniqueStandards: Array.from(allMatchedStandards.values()),
    totalMandatory
  };
}

/**
 * Generate an official Government e-Marketplace (GeM) tender compliance clause.
 * @param {Array} standards
 * @param {string} specTitle
 * @returns {string} Ready-to-copy legal tender clause
 */
export function generateGeMClause(standards, specTitle = 'Supplied Materials') {
  if (!standards || standards.length === 0) return '';

  const mandatoryStds = standards.filter((s) => s.mandatory);
  const voluntaryStds = standards.filter((s) => !s.mandatory);

  let clause = `================================================================================
GOVERNMENT e-MARKETPLACE (GeM) / CENTRAL PUBLIC PROCUREMENT PORTAL (CPPP)
MANDATORY TECHNICAL COMPLIANCE CLAUSE FOR TENDER / BID DOCUMENT
================================================================================

1. COMPLIANCE WITH BUREAU OF INDIAN STANDARDS (BIS):
   The Bidder / OEM shall ensure that all materials supplied under this contract
   strictly conform to the latest revisions of the following Indian Standards:

`;

  standards.forEach((std, i) => {
    clause += `   ${i + 1}. ${std.code} — ${std.title}\n`;
    clause += `      - Classification: ${std.mandatory ? 'MANDATORY BIS CERTIFICATION (ISI / CRS)' : 'National Standard Specification'}\n`;
    clause += `      - QCO Authority: ${std.qcoStatus}\n`;
    if (std.testingStandards && std.testingStandards.length > 0) {
      clause += `      - Applicable Test Standard(s): ${std.testingStandards.join(', ')}\n`;
    }
    clause += `\n`;
  });

  clause += `2. MANDATORY LICENSING & QUALITY CONTROL ORDER (QCO) STIPULATION:\n`;
  if (mandatoryStds.length > 0) {
    clause += `   As per Gazette Notifications issued by the Government of India, the following\n`;
    clause += `   products fall under MANDATORY BIS Quality Control Orders (QCO) / Compulsory\n`;
    clause += `   Registration Scheme (CRS):\n`;
    mandatoryStds.forEach((m) => {
      clause += `   • ${m.code} (${m.title})\n`;
    });
    clause += `\n   Bidders MUST furnish an active BIS License (CM/L Number or CRS Registration Number)\n`;
    clause += `   issued in favor of the manufacturer. Any bid submitted without a valid BIS\n`;
    clause += `   Certificate for the aforementioned items shall be summarily REJECTED at the\n`;
    clause += `   technical evaluation stage.\n`;
  } else {
    clause += `   Supplies shall strictly conform to the aforementioned BIS codes of practice.\n`;
  }

  clause += `\n3. THIRD-PARTY INSPECTION & TEST CERTIFICATES:\n`;
  clause += `   The supplier shall furnish original Manufacturer Test Certificates (MTC) and\n`;
  clause += `   National Accreditation Board for Testing and Calibration Laboratories (NABL)\n`;
  clause += `   accredited test reports for every batch/consignment prior to dispatch.\n`;
  clause += `================================================================================`;

  return clause;
}
