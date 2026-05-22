import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import { useGesture } from "@use-gesture/react";
import { Download, Loader2, Eye, FileText, X, Printer, ZoomIn, ZoomOut } from "lucide-react";
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
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

/* ─────────────────────────────────────────────────────────────────
   Replace dot/underscore sequences with real input fields.
   Input fields:
   - Allow typing + pasting from clipboard ✅
   - Do NOT allow copying the existing doc text ❌
   ───────────────────────────────────────────────────────────────── */
function injectAndWire(container: HTMLElement) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (/[.…]{4,}|_{4,}/.test((n as Text).textContent || "")) {
      textNodes.push(n as Text);
    }
  }

  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;
    const parts = (textNode.textContent || "").split(/([.…]{4,}|_{4,})/g);
    const frag = document.createDocumentFragment();
    parts.forEach(part => {
      if (/[.…]{4,}|_{4,}/.test(part)) {
        frag.appendChild(makeInput(part.length));
      } else if (part) {
        frag.appendChild(document.createTextNode(part));
      }
    });
    parent.replaceChild(frag, textNode);
  });

  container.querySelectorAll<HTMLInputElement>("input[data-field]").forEach(inp => {
    if (inp.value.trim()) inp.classList.add("has-value");

    inp.addEventListener("input", () =>
      inp.value.trim()
        ? inp.classList.add("has-value")
        : inp.classList.remove("has-value")
    );

    // Allow paste from clipboard ✅
    inp.addEventListener("paste", (e) => {
      e.stopPropagation(); // don't bubble to doc-level handler
    });

    // Block copy from input — user typed values also shouldn't be copyable
    inp.addEventListener("copy", (e) => e.preventDefault());
    inp.addEventListener("cut", (e) => e.preventDefault());
  });
}

function makeInput(dotLen: number): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.setAttribute("data-field", `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`);
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

/* ─────────────────────────────────────────────────────────────────
   Lock the document — no text selection, no copy, no context menu.
   Input fields are excluded so they still work normally.
   ───────────────────────────────────────────────────────────────── */
function lockDocumentContent(container: HTMLElement) {
  // 1. Prevent the long-press "Select text / Copy" context menu
  container.addEventListener("contextmenu", (e) => e.preventDefault());

  // 2. Prevent text selection on the document body (not inputs)
  container.addEventListener("selectstart", (e) => {
    if ((e.target as HTMLElement).tagName !== "INPUT") {
      e.preventDefault();
    }
  });

  // 3. Block copy/cut from document (inputs handle their own)
  container.addEventListener("copy", (e) => {
    if ((e.target as HTMLElement).tagName !== "INPUT") {
      e.preventDefault();
    }
  });
  container.addEventListener("cut", (e) => e.preventDefault());

  // 4. CSS-level: prevent selection highlight appearing
  (container as HTMLElement).style.webkitUserSelect = "none";
  (container as HTMLElement).style.userSelect = "none";
}

/* ─────────────────────────────────────────────────────────────────
   Always-on drag: hold any element 300ms → drag it freely.
   No mode toggle needed — works like a canvas editor.
   ───────────────────────────────────────────────────────────────── */
function setupFreeDrag(container: HTMLElement) {
  // Target every block-level rendered element
  const SELECTORS = [
    ".docx-wrapper section p",
    ".docx-wrapper section h1",
    ".docx-wrapper section h2",
    ".docx-wrapper section h3",
    ".docx-wrapper section table",
    ".docx-wrapper section li",
  ].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(SELECTORS));

  elements.forEach(el => {
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    el.addEventListener("pointerdown", (e: PointerEvent) => {
      // Tap on input → don't drag, let it focus normally
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      e.stopPropagation();

      const elRect = el.getBoundingClientRect();
      offsetX = e.clientX - elRect.left;
      offsetY = e.clientY - elRect.top;

      longPressTimer = setTimeout(() => {
        // Activate drag
        dragging = true;
        const containerRect = container.getBoundingClientRect();
        const left = elRect.left - containerRect.left + container.scrollLeft;
        const top = elRect.top - containerRect.top + container.scrollTop;

        el.style.position = "absolute";
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${elRect.width}px`;
        el.style.zIndex = "999";
        el.style.background = "rgba(255,255,255,0.97)";
        el.style.boxShadow = "0 8px 32px rgba(30,58,95,0.22)";
        el.style.borderRadius = "4px";
        el.style.cursor = "grabbing";
        el.style.transition = "none";

        // Light vibration feedback (Android)
        if (navigator.vibrate) navigator.vibrate(30);

        el.setPointerCapture(e.pointerId);
      }, 300);
    });

    el.addEventListener("pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();

      const containerRect = container.getBoundingClientRect();
      const newLeft = e.clientX - containerRect.left - offsetX + container.scrollLeft;
      const newTop = e.clientY - containerRect.top - offsetY + container.scrollTop;

      el.style.left = `${Math.max(0, newLeft)}px`;
      el.style.top = `${Math.max(0, newTop)}px`;
    });

    const stopDrag = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (dragging) {
        el.style.cursor = "default";
        el.style.boxShadow = "none";
        el.style.background = "transparent";
        el.style.zIndex = "auto";
        dragging = false;
      }
    };

    el.addEventListener("pointerup", stopDrag);
    el.addEventListener("pointercancel", stopDrag);
  });
}

/* ── Paper size modal ─────────────────────────────────────────────── */
function PaperSizeModal({ onSelect, onCancel }: { onSelect: (s: PaperSize) => void; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1e3a5f]">Select Paper Size</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="space-y-3">
          <button onClick={() => onSelect("a4")}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#1e3a5f] rounded-2xl transition-all group">
            <div className="w-10 h-14 border-2 border-gray-300 group-hover:border-[#1e3a5f] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <Printer className="w-5 h-5 text-gray-400 group-hover:text-[#1e3a5f]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#1e3a5f]">A4 Size</p>
              <p className="text-sm text-gray-500">210 × 297 mm</p>
            </div>
          </button>
          <button onClick={() => onSelect("legal")}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#9b1c31] rounded-2xl transition-all group">
            <div className="w-10 h-16 border-2 border-gray-300 group-hover:border-[#9b1c31] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#9b1c31]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#9b1c31]">Legal Size</p>
              <p className="text-sm text-gray-500">216 × 356 mm</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Editor ─────────────────────────────────────────────────── */
export function Editor({ formId, onBack }: EditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const template = getTemplateById(formId);

  // Auto-fit to screen
  useEffect(() => {
    const fit = parseFloat(Math.min(1, (window.innerWidth - 16) / A4_W).toFixed(3));
    setZoom(fit);
    zoomRef.current = fit;
  }, []);

  // Load docx
  useEffect(() => {
    if (!docxContainerRef.current || !template?.filePath) { setIsLoading(false); return; }
    setIsLoading(true);

    fetch(template.filePath)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
      .then(blob => docx.renderAsync(blob, docxContainerRef.current!, null, {
        inWrapper: true, ignoreWidth: false, ignoreHeight: false,
        ignoreFonts: false, breakPages: true, useBase64URL: true,
        className: "legal-doc",
      }))
      .then(() => {
        if (!docxContainerRef.current) return;
        // Replace dots → inputs
        injectAndWire(docxContainerRef.current);
        // Block selection/copy on document text
        lockDocumentContent(docxContainerRef.current);
        // Enable always-on hold-to-drag
        setupFreeDrag(docxContainerRef.current);
        setPageCount(
          docxContainerRef.current.querySelectorAll(".docx-wrapper > section, .docx").length || 1
        );
      })
      .catch(err => { console.error("[Editor]", err); toast.error("Could not load template."); })
      .finally(() => setIsLoading(false));
  }, [formId, template]);

  // Pinch-to-zoom
  useGesture(
    {
      onPinch: ({ offset: [scale], event }) => {
        event?.preventDefault();
        const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
        zoomRef.current = nz;
        setZoom(nz);
      },
      onWheel: ({ delta: [, dy], event }) => {
        if ((event as WheelEvent).ctrlKey) {
          event?.preventDefault();
          const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current - dy * 0.002));
          zoomRef.current = nz;
          setZoom(nz);
        }
      },
    },
    {
      target: wrapperRef,
      pinch: { scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM }, rubberband: true },
      eventOptions: { passive: false },
    }
  );

  // Preview
  const handlePreview = useCallback(() => {
    if (!docxContainerRef.current) return;
    const clone = docxContainerRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLInputElement>("input[data-field]").forEach(ci => {
      const live = docxContainerRef.current!.querySelector<HTMLInputElement>(`input[data-field="${ci.dataset.field}"]`);
      const val = live?.value || ci.value || "";
      const span = document.createElement("span");
      span.textContent = val || "\u00A0";
      span.style.cssText = `display:inline-block;width:${ci.style.width || "auto"};min-width:60px;border-bottom:${val ? "2px solid transparent" : "1.5px dotted #777"};padding:0 4px;font-size:inherit;font-weight:400;color:#111;vertical-align:baseline;`;
      ci.parentNode?.replaceChild(span, ci);
    });
    setPreviewHtml(clone.innerHTML);
  }, []);

  const handleSave = useCallback(() => {
    if (docxContainerRef.current) {
      storage.saveDraft(formId, docxContainerRef.current.innerHTML);
      toast.success("Draft saved!");
    }
  }, [formId]);

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
    } finally { setExportingPDF(false); }
  };

  const adjustZoom = (delta: number) => {
    const nz = parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)).toFixed(2));
    setZoom(nz); zoomRef.current = nz;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      {/* Nav */}
      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />

      {/* Toolbar — clean, no mode buttons */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flexShrink: 0, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", minWidth: "max-content" }}>

          {/* Zoom */}
          <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 8, padding: "2px 4px", gap: 2 }}>
            <button onClick={() => adjustZoom(-0.1)} style={{ padding: 5, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex" }}>
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", minWidth: 34, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => adjustZoom(0.1)} style={{ padding: 5, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex" }}>
              <ZoomIn size={14} />
            </button>
          </div>

          <span style={{ fontSize: 11, color: "#94a3b8", userSelect: "none" }}>
            {pageCount} page{pageCount !== 1 ? "s" : ""}
          </span>

          <div style={{ flex: 1 }} />

          {/* Preview */}
          <button onClick={handlePreview} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            <Eye size={15} /> Preview
          </button>

          {/* Export PDF */}
          <button onClick={() => setShowPaperModal(true)} disabled={exportingPDF || isLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#9b1c31", color: "white", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: exportingPDF ? "not-allowed" : "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(155,28,49,0.3)", opacity: exportingPDF ? 0.7 : 1 }}>
            {exportingPDF ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exportingPDF ? "Generating..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Document area */}
      <div
        ref={wrapperRef}
        id="printable-area"
        style={{
          flex: 1,
          overflow: "auto",
          background: "#cbd5e1",
          position: "relative",
          // Allow native pinch-zoom + scroll, block horizontal swipe navigation
          touchAction: "pan-y pinch-zoom",
          overscrollBehaviorX: "none",
        }}
      >
        <div style={{ zoom: zoom, width: A4_W, margin: "0 auto", padding: "24px 0 40px" }}>
          <div style={{ position: "relative", minHeight: A4_H }}>
            {isLoading && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Loading template...</p>
              </div>
            )}
            <div
              ref={docxContainerRef}
              className="legal-doc-container"
              style={{
                visibility: isLoading ? "hidden" : "visible",
                // Prevent the selection/copy context menu on document
                WebkitUserSelect: "none",
                userSelect: "none",
                WebkitTouchCallout: "none", // iOS long-press menu
              } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewHtml && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "white", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Document Preview</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Exactly how PDF will look</p>
            </div>
            <button onClick={() => setPreviewHtml(null)} style={{ background: "#e2e8f0", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Close</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", background: "#cbd5e1" }} className="legal-doc-container">
            <div style={{ zoom: zoom, width: A4_W, margin: "0 auto", padding: "24px 0 40px" }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPaperModal && <PaperSizeModal onSelect={handlePaperSelect} onCancel={() => setShowPaperModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
