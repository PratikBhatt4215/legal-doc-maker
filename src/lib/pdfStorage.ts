// ─────────────────────────────────────────────────────────────
//  pdfStorage.ts — Manages successfully exported PDFs and payments
// ─────────────────────────────────────────────────────────────

export interface PDFExportRecord {
  id: string;
  formId: string;
  templateName: string;
  exportedAt: string; // ISO string
  amountPaid: string; // e.g., "₹10"
  paymentId: string;  // e.g., "TXN-89F3A12C"
  fileName: string;
  content?: string;   // HTML content snapshot at export time
  fileUrl?: string;   // Local device file path
  status?: string;    // Real payment status e.g., "Success"
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
  paymentId?: string,
  content?: string,
  fileUrl?: string,
  status = "Success"
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
    paymentId: paymentId || `TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
    fileName: `${templateName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`,
    content,
    fileUrl,
    status
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
