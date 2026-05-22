import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import { useGesture } from "@use-gesture/react";
import { Download, Loader2, Eye, FileText, X, Printer, ZoomIn, ZoomOut, Move, MousePointer } from "lucide-react";
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
   Replace dot/underscore sequences with editable input fields
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
   Draggable element overlay — appears when user long-presses a block
   Uses pointer events for reliable touch support
   ───────────────────────────────────────────────────────────────── */
interface DragItem {
  el: HTMLElement;
  origLeft: number;
  origTop: number;
  offsetX: number;
  offsetY: number;
}

function setupDragOnContainer(container: HTMLElement, dragModeRef: React.MutableRefObject<boolean>) {
  // Make every block-level child draggable
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(
      ".docx-wrapper section p, .docx-wrapper section h1, .docx-wrapper section h2, .docx-wrapper section h3, .docx-wrapper section table, .docx-wrapper section li"
    )
  );

  let dragging: DragItem | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  elements.forEach(el => {
    // Make all elements absolutely positionable
    el.style.cursor = "grab";
    el.style.userSelect = "none";
    el.style.touchAction = "none";

    el.addEventListener("pointerdown", (e: PointerEvent) => {
      if (!dragModeRef.current) return;
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      longPressTimer = setTimeout(() => {
        // Compute position relative to container
        const left = rect.left - containerRect.left + container.scrollLeft;
        const top = rect.top - containerRect.top + container.scrollTop;

        // Make it absolutely positioned
        el.style.position = "absolute";
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${rect.width}px`;
        el.style.zIndex = "999";
        el.style.background = "rgba(255,255,255,0.95)";
        el.style.boxShadow = "0 4px 20px rgba(30,58,95,0.25)";
        el.style.borderRadius = "6px";
        el.style.cursor = "grabbing";

        dragging = {
          el,
          origLeft: left,
          origTop: top,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
        };

        el.setPointerCapture(e.pointerId);
      }, 300);
    });

    el.addEventListener("pointermove", (e: PointerEvent) => {
      if (!dragging || dragging.el !== el) return;
      e.preventDefault();

      const containerRect = container.getBoundingClientRect();
      const newLeft = e.clientX - containerRect.left - dragging.offsetX + container.scrollLeft;
      const newTop = e.clientY - containerRect.top - dragging.offsetY + container.scrollTop;

      el.style.left = `${Math.max(0, newLeft)}px`;
      el.style.top = `${Math.max(0, newTop)}px`;
    });

    el.addEventListener("pointerup", () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (dragging?.el === el) {
        el.style.cursor = "grab";
        el.style.boxShadow = "none";
        el.style.background = "transparent";
        el.style.zIndex = "1";
        dragging = null;
      }
    });

    el.addEventListener("pointercancel", () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      dragging = null;
    });
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
  const [dragMode, setDragMode] = useState(false);

  // Zoom + pan state (controlled by gesture)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragModeRef = useRef(false);

  const docxContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const template = getTemplateById(formId);

  // Keep ref in sync
  useEffect(() => { dragModeRef.current = dragMode; }, [dragMode]);

  // Auto-fit A4 to phone width on first load
  useEffect(() => {
    const fit = Math.min(1, (window.innerWidth - 16) / A4_W);
    const rounded = parseFloat(fit.toFixed(3));
    setZoom(rounded);
    zoomRef.current = rounded;
  }, []);

  // Load docx
  useEffect(() => {
    if (!docxContainerRef.current || !template?.filePath) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    fetch(template.filePath)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
      .then(blob => docx.renderAsync(blob, docxContainerRef.current!, null, {
        inWrapper: true, ignoreWidth: false, ignoreHeight: false,
        ignoreFonts: false, breakPages: true, useBase64URL: true,
        className: "legal-doc",
      }))
      .then(() => {
        if (docxContainerRef.current) {
          injectAndWire(docxContainerRef.current);
          setupDragOnContainer(docxContainerRef.current, dragModeRef);
          setPageCount(docxContainerRef.current.querySelectorAll(".docx-wrapper > section, .docx").length || 1);
        }
      })
      .catch(err => {
        console.error("[Editor]", err);
        toast.error("Could not load template.");
      })
      .finally(() => setIsLoading(false));
  }, [formId, template]);

  // ── Pinch-to-zoom + Pan gesture ──────────────────────────────────
  useGesture(
    {
      onPinch: ({ offset: [scale], origin: [ox, oy], event }) => {
        event?.preventDefault();
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
        zoomRef.current = newZoom;
        setZoom(newZoom);
      },
      onWheel: ({ delta: [, dy], event }) => {
        // Ctrl+wheel = zoom on desktop
        if ((event as WheelEvent).ctrlKey) {
          event?.preventDefault();
          const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current - dy * 0.002));
          zoomRef.current = newZoom;
          setZoom(newZoom);
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
      span.style.cssText = `display:inline-block;width:${ci.style.width||"auto"};min-width:60px;border-bottom:${val?"2px solid transparent":"1.5px dotted #777"};padding:0 4px;font-size:inherit;font-weight:400;color:#111;vertical-align:baseline;`;
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
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      {/* Nav */}
      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />

      {/* Toolbar */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flexShrink: 0, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", minWidth: "max-content" }}>

          {/* Zoom controls */}
          <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 8, padding: "2px 4px", gap: 2 }}>
            <button onClick={() => { const z = Math.max(MIN_ZOOM, parseFloat((zoom - 0.1).toFixed(2))); setZoom(z); zoomRef.current = z; }}
              style={{ padding: 5, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex" }}>
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", minWidth: 34, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => { const z = Math.min(MAX_ZOOM, parseFloat((zoom + 0.1).toFixed(2))); setZoom(z); zoomRef.current = z; }}
              style={{ padding: 5, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, display: "flex" }}>
              <ZoomIn size={14} />
            </button>
          </div>

          <span style={{ fontSize: 11, color: "#94a3b8", userSelect: "none" }}>
            {pageCount} page{pageCount !== 1 ? "s" : ""}
          </span>

          {/* Move/Edit mode toggle */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 2, gap: 2 }}>
            <button
              onClick={() => setDragMode(false)}
              title="Edit mode — tap fields to type"
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: !dragMode ? "white" : "transparent", color: !dragMode ? "#1e3a5f" : "#94a3b8", boxShadow: !dragMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              <MousePointer size={12} /> Edit
            </button>
            <button
              onClick={() => setDragMode(true)}
              title="Move mode — hold and drag any block"
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: dragMode ? "#1e3a5f" : "transparent", color: dragMode ? "white" : "#94a3b8", boxShadow: dragMode ? "0 1px 3px rgba(0,0,0,0.2)" : "none" }}>
              <Move size={12} /> Move
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={handlePreview} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            <Eye size={15} /> Preview
          </button>

          <button onClick={() => setShowPaperModal(true)} disabled={exportingPDF || isLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#9b1c31", color: "white", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: exportingPDF ? "not-allowed" : "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(155,28,49,0.3)", opacity: exportingPDF ? 0.7 : 1 }}>
            {exportingPDF ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exportingPDF ? "Generating..." : "Export PDF"}
          </button>
        </div>

        {/* Mode hint */}
        {dragMode && (
          <div style={{ padding: "2px 12px 6px", fontSize: 11, color: "#1e3a5f", fontWeight: 600 }}>
            🖐 Hold any paragraph for 0.3s → drag it anywhere on the page
          </div>
        )}
      </div>

      {/* Document scroll + pinch-to-zoom area */}
      <div
        ref={wrapperRef}
        id="printable-area"
        style={{
          flex: 1,
          overflow: "auto",
          background: "#cbd5e1",
          position: "relative",
          touchAction: "pan-x pan-y pinch-zoom", // native pinch-zoom on mobile
        }}
      >
        <div
          style={{
            zoom: zoom,
            width: A4_W,
            margin: "0 auto",
            padding: "24px 0 40px",
            transformOrigin: "top center",
          }}
        >
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
                cursor: dragMode ? "grab" : "text",
              }}
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
