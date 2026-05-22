import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import { useGesture } from "@use-gesture/react";
import { Download, Loader2, Eye, FileText, X, Printer } from "lucide-react";
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

const A4_W     = 794;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;

/* ─────────────────────────────────────────────────────────────────
   Dot/underscore → input fields
   ───────────────────────────────────────────────────────────────── */
function injectAndWire(container: HTMLElement) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (/[.…]{4,}|_{4,}/.test((n as Text).textContent || "")) nodes.push(n as Text);
  }
  nodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;
    const parts = (textNode.textContent || "").split(/([.…]{4,}|_{4,})/g);
    const frag = document.createDocumentFragment();
    parts.forEach(part => {
      if (/[.…]{4,}|_{4,}/.test(part)) frag.appendChild(makeInput(part.length));
      else if (part) frag.appendChild(document.createTextNode(part));
    });
    parent.replaceChild(frag, textNode);
  });

  container.querySelectorAll<HTMLInputElement>("input[data-field]").forEach(inp => {
    if (inp.value.trim()) inp.classList.add("has-value");
    inp.addEventListener("input", () =>
      inp.value.trim() ? inp.classList.add("has-value") : inp.classList.remove("has-value")
    );
    inp.addEventListener("paste", e => e.stopPropagation());
    inp.addEventListener("copy",  e => e.preventDefault());
    inp.addEventListener("cut",   e => e.preventDefault());
  });
}

function makeInput(dotLen: number): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.setAttribute("data-field", `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`);
  inp.placeholder = " ";
  inp.style.width    = `calc(${dotLen * 0.45}ch + 10px)`;
  inp.style.minWidth = "60px";
  inp.addEventListener("input", () =>
    inp.value.trim() ? inp.classList.add("has-value") : inp.classList.remove("has-value")
  );
  return inp;
}

/* ─────────────────────────────────────────────────────────────────
   Lock document — no select / copy / context menu
   ───────────────────────────────────────────────────────────────── */
function lockDocument(container: HTMLElement) {
  container.addEventListener("contextmenu", e => e.preventDefault());
  container.addEventListener("selectstart", e => {
    if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
  });
  container.addEventListener("copy", e => {
    if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
  });
  (container.style as any).webkitUserSelect   = "none";
  (container.style as any).userSelect          = "none";
  (container.style as any).webkitTouchCallout  = "none";
}

/* ─────────────────────────────────────────────────────────────────
   Free drag — completely reliable approach:
   1. Long-press 250ms activates drag
   2. DOCUMENT-LEVEL pointermove listener (never loses the pointer)
   3. translate() to move — no coordinate math needed
   4. Scale division so movement matches finger even when zoomed
   ───────────────────────────────────────────────────────────────── */
function setupFreeDrag(
  container: HTMLElement,
  scaleRef: React.MutableRefObject<number>
) {
  // Match all text-block elements regardless of nesting depth
  const SELECTOR = ".docx-wrapper p, .docx-wrapper h1, .docx-wrapper h2, .docx-wrapper h3, .docx-wrapper table";
  const els = Array.from(container.querySelectorAll<HTMLElement>(SELECTOR));

  els.forEach(el => {
    // Give every element a visible dashed box so user knows it's draggable
    el.style.outline      = "1px dashed rgba(30,58,95,0.20)";
    el.style.borderRadius = "2px";
    el.style.cursor       = "grab";
    el.style.touchAction  = "none"; // this element won't scroll

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let isDragging = false;
    let tx = 0, ty = 0;           // cumulative translate in doc-space px
    let lastX = 0, lastY = 0;
    let startX = 0, startY = 0;
    let activePointerId = -1;

    // ── Document-level move/up handlers (attached only while dragging) ──
    function onDocMove(e: PointerEvent) {
      if (e.pointerId !== activePointerId) return;
      if (!isDragging) return;
      e.preventDefault();

      const s = scaleRef.current;
      tx += (e.clientX - lastX) / s;
      ty += (e.clientY - lastY) / s;
      el.style.transform = `translate(${tx}px, ${ty}px)`;
      lastX = e.clientX;
      lastY = e.clientY;
    }

    function onDocUp(e: PointerEvent) {
      if (e.pointerId !== activePointerId) return;
      endDrag();
    }

    function endDrag() {
      document.removeEventListener("pointermove", onDocMove);
      document.removeEventListener("pointerup",   onDocUp);
      document.removeEventListener("pointercancel", onDocUp);
      if (isDragging) {
        isDragging = false;
        el.style.cursor     = "grab";
        el.style.zIndex     = "auto";
        el.style.boxShadow  = "none";
        el.style.background = "transparent";
        el.style.outline    = "1px dashed rgba(30,58,95,0.20)";
      }
    }

    // ── Pointerdown: start long-press timer ──
    el.addEventListener("pointerdown", (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      activePointerId = e.pointerId;

      longPressTimer = setTimeout(() => {
        isDragging = true;

        // Visual: element lifts up
        el.style.zIndex     = "500";
        el.style.position   = "relative";
        el.style.cursor     = "grabbing";
        el.style.background = "rgba(255,255,255,0.95)";
        el.style.boxShadow  = "0 8px 32px rgba(30,58,95,0.28)";
        el.style.outline    = "2px solid #1e3a5f";

        // Vibration feedback on Android
        if (navigator.vibrate) navigator.vibrate(30);

        // Attach document-level listeners — these NEVER miss the pointer
        document.addEventListener("pointermove",   onDocMove, { passive: false });
        document.addEventListener("pointerup",     onDocUp);
        document.addEventListener("pointercancel", onDocUp);
      }, 250);
    });

    // Cancel long-press if finger moves before 250ms (user is scrolling)
    el.addEventListener("pointermove", (e: PointerEvent) => {
      if (longPressTimer && !isDragging) {
        const moved = Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8;
        if (moved) { clearTimeout(longPressTimer); longPressTimer = null; }
      }
    });

    el.addEventListener("pointerup", () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
    el.addEventListener("pointercancel", () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (isDragging) endDrag();
    });
  });
}

/* ── Paper modal ──────────────────────────────────────────────────── */
function PaperSizeModal({ onSelect, onCancel }: { onSelect: (s: PaperSize) => void; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1e3a5f]">Select Paper Size</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="space-y-3">
          <button onClick={() => onSelect("a4")} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#1e3a5f] rounded-2xl transition-all group">
            <div className="w-10 h-14 border-2 border-gray-300 group-hover:border-[#1e3a5f] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <Printer className="w-5 h-5 text-gray-400 group-hover:text-[#1e3a5f]" />
            </div>
            <div className="text-left"><p className="font-bold text-[#1e3a5f]">A4 Size</p><p className="text-sm text-gray-500">210 × 297 mm</p></div>
          </button>
          <button onClick={() => onSelect("legal")} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#9b1c31] rounded-2xl transition-all group">
            <div className="w-10 h-16 border-2 border-gray-300 group-hover:border-[#9b1c31] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#9b1c31]" />
            </div>
            <div className="text-left"><p className="font-bold text-[#9b1c31]">Legal Size</p><p className="text-sm text-gray-500">216 × 356 mm</p></div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Editor ─────────────────────────────────────────────────── */
export function Editor({ formId, onBack }: EditorProps) {
  const [isLoading,      setIsLoading]      = useState(true);
  const [pageCount,      setPageCount]      = useState(0);
  const [previewHtml,    setPreviewHtml]    = useState<string | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF,   setExportingPDF]   = useState(false);

  const scaleRef   = useRef(1);          // current zoom level
  const scalerRef  = useRef<HTMLDivElement>(null); // the CSS-zoomed div
  const wrapperRef = useRef<HTMLDivElement>(null); // scroll container
  const docxRef    = useRef<HTMLDivElement>(null); // docx-preview target

  const template = getTemplateById(formId);

  /* ── Initial fit ── */
  useEffect(() => {
    const fit = parseFloat(Math.min(1, (window.innerWidth - 8) / A4_W).toFixed(3));
    scaleRef.current = fit;
    // CSS zoom property: affects layout so scroll works correctly,
    // and renders from top-center when combined with margin:auto
    if (scalerRef.current) (scalerRef.current.style as any).zoom = fit;
  }, []);

  /* ── Load docx ── */
  useEffect(() => {
    if (!docxRef.current || !template?.filePath) { setIsLoading(false); return; }
    setIsLoading(true);

    fetch(template.filePath)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob(); })
      .then(blob => docx.renderAsync(blob, docxRef.current!, null, {
        inWrapper: true, ignoreWidth: false, ignoreHeight: false,
        ignoreFonts: false, breakPages: true, useBase64URL: true,
        className: "legal-doc",
      }))
      .then(() => {
        if (!docxRef.current) return;
        injectAndWire(docxRef.current);
        lockDocument(docxRef.current);
        setupFreeDrag(docxRef.current, scaleRef);
        setPageCount(docxRef.current.querySelectorAll(".docx-wrapper > section, .docx").length || 1);
      })
      .catch(e => { console.error(e); toast.error("Could not load template."); })
      .finally(() => setIsLoading(false));
  }, [formId, template]);

  /* ── Pinch-to-zoom via @use-gesture ─────────────────────────────
     Uses CSS `zoom` property via direct DOM (no React re-render = fast).
     CSS zoom affects layout so scroll height updates automatically.
     zoom property zooms from top-left; we center the div with margin:auto.

     For pinch ORIGIN (zoom towards where fingers are):
     We adjust scrollLeft/scrollTop to simulate "zoom at finger position".
     ─────────────────────────────────────────────────────────────── */
  useGesture(
    {
      onPinch: ({ offset: [s], origin: [ox, oy], first, memo, event }) => {
        event?.preventDefault();
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s));
        const oldZoom = scaleRef.current;

        if (scalerRef.current && wrapperRef.current) {
          const wrapper = wrapperRef.current;

          // Where the pinch center is relative to the scroll container
          const wRect = wrapper.getBoundingClientRect();
          const pinchX = ox - wRect.left + wrapper.scrollLeft;
          const pinchY = oy - wRect.top  + wrapper.scrollTop;

          // Apply zoom via CSS zoom (layout-aware, fast)
          (scalerRef.current.style as any).zoom = newZoom;

          // Adjust scroll so pinch center stays fixed in view
          const ratio = newZoom / oldZoom;
          wrapper.scrollLeft = pinchX * ratio - (ox - wRect.left);
          wrapper.scrollTop  = pinchY * ratio - (oy - wRect.top);
        }

        scaleRef.current = newZoom;
        return memo;
      },
    },
    {
      target: wrapperRef,
      pinch: {
        from:        () => [scaleRef.current, 0],
        scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM },
        rubberband:  true,
      },
      eventOptions: { passive: false },
    }
  );

  /* ── Preview ── */
  const handlePreview = useCallback(() => {
    if (!docxRef.current) return;
    const clone = docxRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLInputElement>("input[data-field]").forEach(ci => {
      const live = docxRef.current!.querySelector<HTMLInputElement>(`input[data-field="${ci.dataset.field}"]`);
      const val = live?.value || ci.value || "";
      const span = document.createElement("span");
      span.textContent = val || "\u00A0";
      span.style.cssText = `display:inline-block;width:${ci.style.width||"auto"};min-width:60px;border-bottom:${val?"2px solid transparent":"1.5px dotted #777"};padding:0 4px;font-size:inherit;font-weight:400;color:#111;vertical-align:baseline;`;
      ci.parentNode?.replaceChild(span, ci);
    });
    setPreviewHtml(clone.innerHTML);
  }, []);

  const handleSave = useCallback(() => {
    if (docxRef.current) storage.saveDraft(formId, docxRef.current.innerHTML);
  }, [formId]);

  const handlePaperSelect = async (size: PaperSize) => {
    setShowPaperModal(false);
    handleSave();
    setExportingPDF(true);
    toast.info(`Generating ${size.toUpperCase()} PDF…`);
    await new Promise(r => setTimeout(r, 100));
    try {
      await generatePDF({
        elementId: "printable-area",
        filename:  `${template?.name || "legal-document"}-${Date.now()}.pdf`,
        paperSize: size,
        onSuccess: () => toast.success("PDF downloaded!"),
        onError:   () => toast.error("PDF failed. Try again."),
      });
    } finally { setExportingPDF(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />

      {/* Toolbar — minimal */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {pageCount} page{pageCount !== 1 ? "s" : ""}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={handlePreview}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            <Eye size={15} /> Preview
          </button>
          <button onClick={() => setShowPaperModal(true)} disabled={exportingPDF || isLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#9b1c31", color: "white", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: exportingPDF ? "not-allowed" : "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(155,28,49,0.3)", opacity: exportingPDF ? 0.7 : 1 }}>
            {exportingPDF ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exportingPDF ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Scroll + pinch area */}
      <div
        ref={wrapperRef}
        id="printable-area"
        style={{
          flex: 1,
          overflow: "auto",
          background: "#cbd5e1",
          // Allow one-finger scroll natively; we intercept pinch
          touchAction: "pan-x pan-y",
          overscrollBehavior: "contain",
        }}
      >
        {/* Centering wrapper */}
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 0 40px", minHeight: "100%" }}>
          {/*
            scalerRef: CSS zoom property (layout-aware, affects scrollHeight).
            margin:auto centers the page horizontally at any zoom level.
          */}
          <div
            ref={scalerRef}
            style={{
              width: A4_W,
              flexShrink: 0,
              // zoom applied via DOM in useEffect above
            }}
          >
            <div style={{ position: "relative" }}>
              {isLoading && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, minHeight: 600 }}>
                  <Loader2 className="animate-spin text-slate-400" size={32} />
                  <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Loading template…</p>
                </div>
              )}
              <div
                ref={docxRef}
                className="legal-doc-container"
                style={{
                  visibility: isLoading ? "hidden" : "visible",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                } as React.CSSProperties}
              />
            </div>
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
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0 40px" }}>
              <div style={{ width: A4_W }}>
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
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
