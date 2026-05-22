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

const A4_W    = 794;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;

/* ─────────────────────────────────────────────────────────────────
   Dot/underscore → input field replacement
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
      inp.value.trim() ? inp.classList.add("has-value") : inp.classList.remove("has-value")
    );
    // Allow paste, block copy
    inp.addEventListener("paste", e => e.stopPropagation());
    inp.addEventListener("copy", e => e.preventDefault());
    inp.addEventListener("cut", e => e.preventDefault());
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
  (container.style as any).webkitUserSelect = "none";
  (container.style as any).userSelect = "none";
  (container.style as any).webkitTouchCallout = "none";
}

/* ─────────────────────────────────────────────────────────────────
   Free-drag: hold 250ms on any block → drag anywhere
   scaleRef → current zoom level (needed for coord math)
   ───────────────────────────────────────────────────────────────── */
function setupFreeDrag(container: HTMLElement, scaleRef: React.MutableRefObject<number>) {
  container.style.position = "relative";

  const SELECTOR = [
    ".docx-wrapper section > p",
    ".docx-wrapper section > h1",
    ".docx-wrapper section > h2",
    ".docx-wrapper section > h3",
    ".docx-wrapper section > table",
    ".docx-wrapper section > ul",
    ".docx-wrapper section > ol",
    ".docx-wrapper section > div",
  ].join(", ");

  const els = Array.from(container.querySelectorAll<HTMLElement>(SELECTOR));

  els.forEach(el => {
    // Visible draggable box
    el.style.outline = "1px dashed rgba(30, 58, 95, 0.18)";
    el.style.borderRadius = "3px";
    el.style.cursor = "grab";
    el.style.touchAction = "none";  // prevent scroll interference while dragging
    el.style.boxSizing = "border-box";

    let timer: ReturnType<typeof setTimeout> | null = null;
    let dragging = false;
    let curLeft = 0;
    let curTop  = 0;
    let lastX   = 0;
    let lastY   = 0;

    el.addEventListener("pointerdown", (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      lastX = e.clientX;
      lastY = e.clientY;

      timer = setTimeout(() => {
        const scale = scaleRef.current;

        // Capture current visual position in unscaled (document) space
        const cRect  = container.getBoundingClientRect(); // scaled viewport rect
        const elRect = el.getBoundingClientRect();

        // Distance from container origin in viewport space → divide by scale → doc space
        curLeft = (elRect.left - cRect.left) / scale;
        curTop  = (elRect.top  - cRect.top ) / scale + container.scrollTop / scale;

        // Fix element in place
        el.style.position  = "absolute";
        el.style.left      = `${curLeft}px`;
        el.style.top       = `${curTop}px`;
        el.style.width     = `${elRect.width / scale}px`;
        el.style.zIndex    = "200";
        el.style.background= "rgba(255,255,255,0.97)";
        el.style.boxShadow = "0 8px 28px rgba(30,58,95,0.22)";
        el.style.outline   = "2px solid #1e3a5f";
        el.style.cursor    = "grabbing";

        dragging = true;
        el.setPointerCapture(e.pointerId);
        if (navigator.vibrate) navigator.vibrate(25);
      }, 250);
    });

    el.addEventListener("pointermove", (e: PointerEvent) => {
      // Cancel long-press if finger moves too much before 250ms
      if (timer && !dragging) {
        const moved = Math.abs(e.clientX - lastX) > 8 || Math.abs(e.clientY - lastY) > 8;
        if (moved) { clearTimeout(timer); timer = null; }
        return;
      }
      if (!dragging) return;
      e.preventDefault();

      // Move in document space (divide screen delta by scale)
      const scale = scaleRef.current;
      curLeft += (e.clientX - lastX) / scale;
      curTop  += (e.clientY - lastY) / scale;
      el.style.left = `${curLeft}px`;
      el.style.top  = `${curTop}px`;

      lastX = e.clientX;
      lastY = e.clientY;
    });

    const stop = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (dragging) {
        el.style.cursor    = "grab";
        el.style.boxShadow = "none";
        el.style.background= "transparent";
        el.style.zIndex    = "auto";
        el.style.outline   = "1px dashed rgba(30, 58, 95, 0.18)";
        dragging = false;
      }
    };

    el.addEventListener("pointerup",     stop);
    el.addEventListener("pointercancel", stop);
  });
}

/* ── Paper size modal ──────────────────────────────────────────── */
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
  const [isLoading,     setIsLoading]     = useState(true);
  const [pageCount,     setPageCount]     = useState(0);
  const [previewHtml,   setPreviewHtml]   = useState<string | null>(null);
  const [showPaperModal,setShowPaperModal]= useState(false);
  const [exportingPDF,  setExportingPDF]  = useState(false);

  // Scale is kept in a ref for 60fps direct DOM updates; React state is secondary
  const scaleRef       = useRef(1);
  const scalerRef      = useRef<HTMLDivElement>(null);   // the div we transform
  const wrapperRef     = useRef<HTMLDivElement>(null);   // scroll container
  const docxRef        = useRef<HTMLDivElement>(null);   // docx-preview target
  const spaceRef       = useRef<HTMLDivElement>(null);   // invisible spacer for scroll height

  const template = getTemplateById(formId);

  /* ── Initial scale to fit phone ── */
  useEffect(() => {
    const fit = parseFloat(Math.min(1, (window.innerWidth - 8) / A4_W).toFixed(3));
    scaleRef.current = fit;
    if (scalerRef.current) {
      scalerRef.current.style.transform = `scale(${fit})`;
      updateSpacerHeight(fit);
    }
  }, []);

  const updateSpacerHeight = (s: number) => {
    if (spaceRef.current && scalerRef.current) {
      const naturalH = scalerRef.current.scrollHeight || 1200;
      spaceRef.current.style.height = `${naturalH * s}px`;
    }
  };

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
        const c = docxRef.current!;
        injectAndWire(c);
        lockDocument(c);
        setupFreeDrag(c, scaleRef);
        setPageCount(c.querySelectorAll(".docx-wrapper > section, .docx").length || 1);
        // Update spacer after content is rendered
        requestAnimationFrame(() => updateSpacerHeight(scaleRef.current));
      })
      .catch(e => { console.error(e); toast.error("Could not load template."); })
      .finally(() => setIsLoading(false));
  }, [formId, template]);

  /* ── Pinch-to-zoom via @use-gesture ──────────────────────────
     Direct DOM mutation (no React setState) = true 60fps on Android
     ─────────────────────────────────────────────────────────── */
  useGesture(
    {
      onPinch: ({ offset: [s], event }) => {
        event?.preventDefault();
        const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
        scaleRef.current = clamped;
        if (scalerRef.current) {
          // GPU-accelerated — no React re-render, no layout reflow
          scalerRef.current.style.transform = `scale(${clamped})`;
          updateSpacerHeight(clamped);
        }
      },
    },
    {
      target: wrapperRef,
      pinch: {
        from:        () => [scaleRef.current, 0],
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
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
    if (docxRef.current) { storage.saveDraft(formId, docxRef.current.innerHTML); }
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
        filename: `${template?.name || "legal-document"}-${Date.now()}.pdf`,
        paperSize: size,
        onSuccess: () => toast.success("PDF downloaded!"),
        onError:   () => toast.error("PDF failed. Try again."),
      });
    } finally { setExportingPDF(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      {/* ── Nav ── */}
      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />

      {/* ── Toolbar — minimal, NO zoom buttons ── */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {pageCount} page{pageCount !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: 10, color: "#cbd5e1" }}>
            · Pinch to zoom · Hold 0.25s to move
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={handlePreview} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            <Eye size={15} /> Preview
          </button>
          <button onClick={() => setShowPaperModal(true)} disabled={exportingPDF || isLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#9b1c31", color: "white", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: exportingPDF ? "not-allowed" : "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(155,28,49,0.3)", opacity: exportingPDF ? 0.7 : 1 }}>
            {exportingPDF ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exportingPDF ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── Scroll + pinch area ── */}
      <div
        ref={wrapperRef}
        id="printable-area"
        style={{
          flex: 1,
          overflow: "auto",
          background: "#cbd5e1",
          position: "relative",
          // Allow one-finger scroll; @use-gesture handles two-finger pinch
          touchAction: "pan-x pan-y",
          overscrollBehaviorX: "none",
          // Prevent horizontal page swipe causing navigation
          overscrollBehavior: "contain",
        }}
      >
        {/*
          Space holder: makes the scroll container aware of scaled height.
          Without this, scroll would stop short when zoomed in.
        */}
        <div ref={spaceRef} style={{ width: "100%", minHeight: "100%" }}>
          {/*
            Scaler: transform:scale() is GPU-accelerated.
            transformOrigin top-left keeps coordinate math simple.
            We update this div's style directly (no React setState) for 60fps.
          */}
          <div
            ref={scalerRef}
            style={{
              transformOrigin: "top left",
              width: A4_W,
              margin: "0 auto",
              paddingBottom: 40,
              willChange: "transform",
            }}
          >
            <div style={{ position: "relative", paddingTop: 24 }}>
              {isLoading && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, minHeight: 500 }}>
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

      {/* ── Preview modal ── */}
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
            <div style={{ transform: `scale(${scaleRef.current})`, transformOrigin: "top left", width: A4_W, margin: "0 auto", paddingBottom: 40 }}>
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
