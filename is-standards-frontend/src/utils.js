/**
 * Utility functions for rendering, clipboard copying,
 * and official BIS compliance dossier export.
 */

/**
 * Convert markdown text to safe HTML for display.
 * Uses marked.js if loaded, with robust regex fallback.
 */
export function renderMarkdown(text) {
  if (!text) return '';
  if (typeof window !== 'undefined' && window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(text);
  }

  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> ⚠️ (.+)$/gm, '<blockquote class="alert-warning"><span class="alert-icon">⚠️</span><div>$1</div></blockquote>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '<br/><br/>');
}

/**
 * Truncate a string and add ellipsis.
 */
export function truncate(str, max = 80) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

/**
 * Copy string to clipboard with feedback promise.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback for non-https or older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    textArea.remove();
    return true;
  } catch (err) {
    textArea.remove();
    return false;
  }
}

/**
 * Export arbitrary data as downloadable JSON file.
 */
export function downloadJson(data, filename = 'is_standards_audit.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generate print-ready Official BIS Compliance Dossier in a clean window.
 */
export function printComplianceDossier({ spec, standards, engine, timestamp = new Date() }) {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow pop-ups to view and print the Official Compliance Dossier.');
    return;
  }

  const mandatoryCount = standards.filter((s) => s.mandatory).length;
  const dateStr = timestamp.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const rows = standards.map((std, i) => `
    <tr>
      <td style="font-family: monospace; font-weight: bold;">${i + 1}</td>
      <td><strong>${std.code}</strong></td>
      <td>${std.title}</td>
      <td>${std.category}</td>
      <td style="text-align: center;">
        <span class="${std.mandatory ? 'badge-mandatory' : 'badge-voluntary'}">
          ${std.mandatory ? 'MANDATORY (QCO)' : 'Voluntary'}
        </span>
      </td>
      <td>${std.qcoStatus || 'Standard Specification'}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official BIS Standards Compliance Dossier</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 40px;
      color: #1a202c;
      line-height: 1.5;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #003366;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .gov-title {
      font-size: 20px;
      font-weight: 800;
      color: #003366;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 13px;
      color: #4a5568;
      margin-top: 4px;
    }
    .meta-box {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      font-size: 13px;
    }
    .meta-label {
      font-weight: 600;
      color: #718096;
      text-transform: uppercase;
      font-size: 11px;
    }
    .meta-value {
      color: #2d3748;
      font-weight: 600;
      margin-top: 2px;
    }
    .spec-quote {
      margin-top: 12px;
      padding: 10px 14px;
      background: #edf2f7;
      border-left: 4px solid #3182ce;
      font-size: 13px;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 12px;
    }
    th {
      background: #003366;
      color: white;
      text-align: left;
      padding: 10px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) td {
      background: #fcfdfe;
    }
    .badge-mandatory {
      background: #fed7d7;
      color: #9b2c2c;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      display: inline-block;
    }
    .badge-voluntary {
      background: #e2e8f0;
      color: #4a5568;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      display: inline-block;
    }
    .notes-box {
      margin-top: 24px;
      padding: 16px;
      border: 1px dashed #cbd5e0;
      border-radius: 8px;
      font-size: 12px;
      background: #fffaf0;
      border-color: #dd6b20;
    }
    .notes-box h4 {
      margin: 0 0 6px;
      color: #c05621;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      padding-top: 20px;
    }
    .signature-block {
      text-align: center;
      width: 220px;
      border-top: 1px solid #718096;
      padding-top: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #4a5568;
    }
    .print-btn {
      background: #003366;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 20px;
    }
    @media print {
      .print-btn { display: none; }
      body { margin: 15mm; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header-bar">
    <div>
      <div class="gov-title">BUREAU OF INDIAN STANDARDS (BIS) COMPLIANCE DOSSIER</div>
      <div class="sub-title">NormAI · National Procurement Intelligence System · Smart India Hackathon 2026</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #718096;">
      <div>Ref ID: <strong>BIS-REC-${Date.now().toString().slice(-6)}</strong></div>
      <div>Date: ${dateStr}</div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-grid">
      <div>
        <div class="meta-label">Evaluation Engine</div>
        <div class="meta-value">${engine === 'rag' ? 'Self-Hosted RAG Pipeline (Live)' : 'Local BIS Knowledge Base (Offline Resilient)'}</div>
      </div>
      <div>
        <div class="meta-label">Standards Identified</div>
        <div class="meta-value">${standards.length} Applicable Codes</div>
      </div>
      <div>
        <div class="meta-label">Mandatory QCO Requirement</div>
        <div class="meta-value" style="color: ${mandatoryCount > 0 ? '#c53030' : '#2b6cb0'};">
          ${mandatoryCount} Mandatory Standard(s)
        </div>
      </div>
    </div>
    <div class="spec-quote">
      <strong>Procurement Specification:</strong> "${spec}"
    </div>
  </div>

  <h3 style="font-size: 14px; text-transform: uppercase; color: #003366; margin-bottom: 8px;">
    Applicable Indian Standards Matrix
  </h3>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th style="width: 130px;">IS Code</th>
        <th>Standard Title</th>
        <th style="width: 140px;">Category</th>
        <th style="width: 120px; text-align: center;">BIS Status</th>
        <th>QCO Reference / Legal Ground</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="notes-box">
    <h4>LEGAL TENDER COMPLIANCE ADVISORY:</h4>
    Under Section 16 of the Bureau of Indian Standards Act, 2016, all government procurement departments, Public Sector Undertakings (PSUs), and autonomous bodies are statutorily mandated to enforce BIS Quality Control Orders (QCO). For any item marked as <strong>MANDATORY</strong> above, the bidder MUST submit a valid BIS License (ISI Mark / CRS Registration) issued by BIS.
  </div>

  <div class="signature-row">
    <div class="signature-block">
      Technical Officer / Procurement Lead
    </div>
    <div class="signature-block">
      BIS Compliance / Competent Authority
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
