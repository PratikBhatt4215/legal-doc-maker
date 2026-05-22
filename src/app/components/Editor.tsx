import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import { Download, Loader2, ZoomIn, ZoomOut, Eye, FileText, X, Printer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { storage } from "../../lib/storage";
import { toast } from "sonner";
import { TopNavBar } from "./TopNavBar";
import { getTemplateById } from "../../lib/templateRegistry";
import { generatePDF, type PaperSize } from "../../lib/pdfGenerator";
import "../../styles/legal-document.css";

interface EditorProps {
  formId: string;
  onBack: () => void;
  onExportPDF: () => void;
}

const A4_W = 794;
const A4_H = 1123;
const LEGAL_FONT = "'Nirmala UI', 'Noto Sans Devanagari', Arial, sans-serif";

/* ─────────────────────────────────────────────────────────────────
   Walk the rendered docx and replace dot-sequences with real inputs.
   Dotted line = empty field. Once user types → dotted line disappears.
   ───────────────────────────────────────────────────────────────── */
function injectAndWire(container: HTMLElement) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (/[.…]{4,}/.test((n as Text).textContent || "")) {
      textNodes.push(n as Text);
    }
  }

  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;
    const parts = (textNode.textContent || "").split(/([.…]{4,})/g);
    const frag = document.createDocumentFragment();
    parts.forEach(part => {
      if (/[.…]{4,}/.test(part)) {
        frag.appendChild(makeInput(part.length));
      } else if (part) {
        frag.appendChild(document.createTextNode(part));
      }
    });
    parent.replaceChild(frag, textNode);
  });

  // Wire existing inputs (re-hydrate saved drafts)
  container.querySelectorAll<HTMLInputElement>("input[data-field]").forEach(inp => {
    if (inp.value.trim()) inp.classList.add("has-value");
    inp.addEventListener("input", () =>
      inp.value.trim()
        ? inp.classList.add("has-value")
        : inp.classList.remove("has-value")
    );
  });
}

function makeInput(dotLen: number): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.setAttribute(
    "data-field",
    `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
  );
  inp.placeholder = " ";
  inp.style.width = `calc(${dotLen * 0.45}ch + 10px)`;
  inp.style.minWidth = "60px";
  inp.addEventListener("input", () =>
    inp.value.trim()
      ? inp.classList.add("has-value")
      : inp.classList.remove("has-value")
  );
  return inp;
}

/* ── Paper size modal ─────────────────────────────────────────────── */
function PaperSizeModal({ onSelect, onCancel }: {
  onSelect: (s: PaperSize) => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1e3a5f]">Select Paper Size</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3">
          <button onClick={() => onSelect("a4")}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#1e3a5f] rounded-2xl transition-all group">
            <div className="w-10 h-14 border-2 border-gray-300 group-hover:border-[#1e3a5f] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <Printer className="w-5 h-5 text-gray-400 group-hover:text-[#1e3a5f]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#1e3a5f]">A4 Size</p>
              <p className="text-sm text-gray-500">210 × 297 mm — Standard</p>
            </div>
          </button>
          <button onClick={() => onSelect("legal")}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#9b1c31] rounded-2xl transition-all group">
            <div className="w-10 h-16 border-2 border-gray-300 group-hover:border-[#9b1c31] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#9b1c31]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#9b1c31]">Legal Size</p>
              <p className="text-sm text-gray-500">216 × 356 mm — Legal paper</p>
            </div>
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">As per client requirement</p>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Editor ─────────────────────────────────────────────────── */
export function Editor({ formId, onBack }: EditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const template = getTemplateById(formId);

  // Auto-fit A4 to phone screen width
  useEffect(() => {
    const fit = (window.innerWidth - 16) / A4_W;
    setZoom(parseFloat(Math.min(1, fit).toFixed(3)));
  }, []);

  // Load .docx → render using docx-preview (pixel-perfect)
  useEffect(() => {
    if (!docxContainerRef.current || !template?.filePath) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    fetch(template.filePath)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        return docx.renderAsync(blob, docxContainerRef.current!, null, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
          // Add the legal-doc class so our CSS applies
          className: "legal-doc",
        });
      })
      .then(() => {
        if (docxContainerRef.current) {
          // Replace dot-sequences with real input fields
          injectAndWire(docxContainerRef.current);
          // Count rendered pages
          const pages = docxContainerRef.current.querySelectorAll(".docx-wrapper > section, .docx").length;
          setPageCount(pages || 1);
        }
      })
      .catch(err => {
        console.error("[Editor] docx-preview error:", err);
        toast.error("Could not load template.");
        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML =
            `<div style="padding:40px;font-family:${LEGAL_FONT};font-size:14px;color:#111">
              <p>Template could not be rendered. Please try again.</p>
            </div>`;
        }
      })
      .finally(() => setIsLoading(false));
  }, [formId, template]);

  // Preview — substitute inputs with styled spans (what PDF will look like)
  const handlePreview = useCallback(() => {
    if (!docxContainerRef.current) return;
    const clone = docxContainerRef.current.cloneNode(true) as HTMLElement;

    clone.querySelectorAll<HTMLInputElement>("input[data-field]").forEach(cloneInp => {
      const live = docxContainerRef.current!.querySelector<HTMLInputElement>(
        `input[data-field="${cloneInp.dataset.field}"]`
      );
      const val = live?.value || cloneInp.value || "";
      const span = document.createElement("span");
      span.textContent = val || "\u00A0";
      span.style.cssText = `
        display:inline-block;
        width:${cloneInp.style.width || "auto"};
        min-width:${cloneInp.style.minWidth || "60px"};
        border-bottom:${val ? "2px solid transparent" : "1.5px dotted #777"};
        padding: 0 4px;
        font-family:${LEGAL_FONT};
        font-size:inherit; font-weight:400; color:#111;
        vertical-align:baseline;
      `;
      cloneInp.parentNode?.replaceChild(span, cloneInp);
    });

    setPreviewHtml(clone.innerHTML);
  }, []);

  // Save draft (stores the current HTML including filled input values)
  const handleSave = useCallback(() => {
    if (docxContainerRef.current) {
      storage.saveDraft(formId, docxContainerRef.current.innerHTML);
      toast.success("Draft saved!");
    }
  }, [formId]);

  // PDF export
  const handlePaperSelect = async (size: PaperSize) => {
    setShowPaperModal(false);
    handleSave();
    setExportingPDF(true);
    toast.info(`Generating ${size.toUpperCase()} PDF...`);
    await new Promise(r => setTimeout(r, 150));
    try {
      await generatePDF({
        elementId: "printable-area",
        filename: `${template?.name || "legal-document"}-${Date.now()}.pdf`,
        paperSize: size,
        onSuccess: () => toast.success("PDF downloaded!"),
        onError: () => toast.error("PDF failed. Try again."),
      });
    } finally {
      setExportingPDF(false);
    }
  };

  const zoomIn  = () => setZoom(p => parseFloat(Math.min(2,   p + 0.1).toFixed(3)));
  const zoomOut = () => setZoom(p => parseFloat(Math.max(0.3, p - 0.1).toFixed(3)));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      {/* ── Nav bar ── */}
      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />

      {/* ── Toolbar ── */}
      <div style={{
        background: "white", borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flexShrink: 0,
        width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" as any,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", minWidth: "max-content" }}>

          {/* Zoom controls */}
          <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 8, padding: "2px 4px", gap: 2 }}>
            <button onClick={zoomOut} style={{ padding: 5, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex" }}>
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", minWidth: 34, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn} style={{ padding: 5, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex" }}>
              <ZoomIn size={14} />
            </button>
          </div>

          <span style={{ fontSize: 11, color: "#94a3b8", userSelect: "none" }}>
            {pageCount} page{pageCount !== 1 ? "s" : ""}
          </span>

          <div style={{ flex: 1 }} />

          {/* Preview button */}
          <button onClick={handlePreview} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1",
            borderRadius: 9, padding: "8px 14px", fontWeight: 600, fontSize: 13,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <Eye size={15} /> Preview
          </button>

          {/* Export PDF button */}
          <button
            onClick={() => setShowPaperModal(true)}
            disabled={exportingPDF || isLoading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#9b1c31", color: "white", border: "none",
              borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: 13,
              cursor: exportingPDF ? "not-allowed" : "pointer", whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(155,28,49,0.3)", opacity: exportingPDF ? 0.7 : 1,
            }}
          >
            {exportingPDF
              ? <Loader2 size={15} className="animate-spin" />
              : <Download size={15} />
            }
            {exportingPDF ? "Generating..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── Document scroll area ── */}
      <div
        id="printable-area"
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          background: "#cbd5e1", position: "relative",
        }}
      >
        <div style={{
          zoom: zoom,
          width: A4_W,
          margin: "0 auto",
          padding: "24px 0 40px",
        }}>
          <div style={{ position: "relative", minHeight: A4_H }}>
            {/* Loading spinner */}
            {isLoading && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 10,
                background: "white", display: "flex",
                alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 12,
              }}>
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Loading template...</p>
              </div>
            )}

            {/* docx-preview renders here */}
            <div
              ref={docxContainerRef}
              className="legal-doc-container"
              style={{ visibility: isLoading ? "hidden" : "visible" }}
            />
          </div>
        </div>
      </div>

      {/* ── Preview modal ── */}
      {previewHtml && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.85)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            background: "white", padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Document Preview
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                This is exactly how your PDF will look
              </p>
            </div>
            <button
              onClick={() => setPreviewHtml(null)}
              style={{
                background: "#e2e8f0", border: "none", padding: "8px 16px",
                borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13,
              }}
            >
              Close
            </button>
          </div>
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            background: "#cbd5e1",
          }} className="legal-doc-container">
            <div style={{
              zoom: zoom, width: A4_W, margin: "0 auto", padding: "24px 0 40px",
            }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Paper size modal ── */}
      <AnimatePresence>
        {showPaperModal && (
          <PaperSizeModal
            onSelect={handlePaperSelect}
            onCancel={() => setShowPaperModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
