// ─────────────────────────────────────────────────────────────
//  pdfStorage.ts — Manages successfully exported PDFs and payments
// ─────────────────────────────────────────────────────────────

export interface PDFExportRecord {
  id: string;
  formId: string;
  templateName: string;
  exportedAt: string; // ISO string
  amountPaid: string; // e.g., "₹99"
  paymentId: string;  // e.g., "demo_pay_123456"
  fileName: string;
}

const EXPORTS_KEY = "legal_pdf_exports_v1";

function loadAllExports(): PDFExportRecord[] {
  try {
    const raw = localStorage.getItem(EXPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PDFExportRecord[];
  } catch {
    return [];
  }
}

function saveAllExports(records: PDFExportRecord[]): void {
  localStorage.setItem(EXPORTS_KEY, JSON.stringify(records));
}

/** Record a successful PDF export (document created and purchased) */
export function savePDFExport(
  formId: string,
  templateName: string,
  amountPaid = "₹10",
  paymentId?: string
): PDFExportRecord {
  const exports = loadAllExports();
  const now = new Date().toISOString();
  const id = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: PDFExportRecord = {
    id,
    formId,
    templateName,
    exportedAt: now,
    amountPaid,
    paymentId: paymentId || `demo_pay_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    fileName: `${templateName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`
  };
  exports.unshift(record); // newest first
  saveAllExports(exports);
  return record;
}

/** Get all successful PDF export records, newest first */
export function getAllPDFExports(): PDFExportRecord[] {
  return loadAllExports();
}

/** Calculate the total amount paid across all exports */
export function getTotalSpentAmount(): number {
  const exports = loadAllExports();
  // Strip currency symbol and sum
  return exports.reduce((sum, item) => {
    const val = parseInt(item.amountPaid.replace(/[^\d]/g, ""), 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
}

/** Get total count of successfully created documents */
export function getPDFExportsCount(): number {
  return loadAllExports().length;
}
