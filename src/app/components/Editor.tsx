import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
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

const A4_W = 794;

/* ─────────────────────────────────────────────────────────────────
   Dot/underscore → input fields
   ───────────────────────────────────────────────────────────────── */
function injectAndWire(container: HTMLElement) {
  // 1. Process inline text fields (dots / underscores)
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

  // 2. Identify blank table columns (empty td or cell with only dots/underscores)
  container.querySelectorAll("td").forEach(td => {
    const rawText = td.textContent || "";
    const cleanText = rawText.trim().replace(/\u00A0/g, ""); // replace non-breaking spaces
    
    // Check if the cell is completely empty or has only dot/underscore patterns
    if (cleanText === "" || /^[.…_]+$/.test(cleanText)) {
      td.innerHTML = ""; // clear dots or non-breaking spaces
      const inp = makeInput(15);
      inp.style.width = "100%";
      inp.style.minWidth = "100%";
      inp.style.boxSizing = "border-box";
      td.appendChild(inp);
    }
  });

  // 3. Setup input event wiring
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
  (container.style as any).webkitUserSelect  = "none";
  (container.style as any).userSelect         = "none";
  (container.style as any).webkitTouchCallout = "none";
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

/* ─────────────────────────────────────────────────────────────────
   Custom touch-based pan & pinch-zoom hook
   Works 100% reliably in Android WebView / Capacitor using raw
   touchstart / touchmove / touchend — NOT pointer events.
   ───────────────────────────────────────────────────────────────── */
function useTouchPanZoom(viewportRef: React.RefObject<HTMLDivElement>, contentRef: React.RefObject<HTMLDivElement>) {
  const stateRef = useRef({ x: 0, y: 0, scale: 1 });
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4.0;

  const applyTransform = useCallback((x: number, y: number, scale: number, animate = false) => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.25s ease-out" : "none";
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stateRef.current = { x, y, scale };
  }, [contentRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    let touch1 = { x: 0, y: 0 };
    let touch2 = { x: 0, y: 0 };
    let isPinching = false;
    let isPanning = false;
    let lastDist = 0;
    let lastMidX = 0;
    let lastMidY = 0;

    // Velocity tracking for inertia
    let velX = 0, velY = 0;
    let lastTime = 0;
    let prevX = 0, prevY = 0;
    let rafId = 0;

    function dist(t1: {x:number,y:number}, t2: {x:number,y:number}) {
      return Math.hypot(t2.x - t1.x, t2.y - t1.y);
    }
    function mid(t1: {x:number,y:number}, t2: {x:number,y:number}) {
      return { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
    }

    function clampPosition(x: number, y: number, scale: number) {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const scaledW = A4_W * scale;
      const scaledH = content.scrollHeight * scale;
      const minX = Math.min(0, vw - scaledW);
      const maxX = Math.max(0, vw - scaledW);
      const minY = Math.min(0, vh - scaledH);
      const maxY = 0;
      return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      };
    }

    function onTouchStart(e: TouchEvent) {
      cancelAnimationFrame(rafId);
      velX = 0; velY = 0;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        touch1 = { x: t.clientX, y: t.clientY };
        prevX = stateRef.current.x;
        prevY = stateRef.current.y;
        lastTime = Date.now();
        isPanning = true;
        isPinching = false;
      } else if (e.touches.length === 2) {
        isPinching = true;
        isPanning = false;
        const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        lastDist = dist(t1, t2);
        const m = mid(t1, t2);
        lastMidX = m.x;
        lastMidY = m.y;
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();

      if (isPinching && e.touches.length === 2) {
        const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        const newDist = dist(t1, t2);
        const m = mid(t1, t2);

        const { x, y, scale } = stateRef.current;
        const scaleFactor = newDist / lastDist;
        let newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * scaleFactor));

        // Zoom towards the midpoint between fingers
        const rect = viewport.getBoundingClientRect();
        const pinchX = m.x - rect.left;
        const pinchY = m.y - rect.top;
        const newX = pinchX - (pinchX - x) * (newScale / scale) + (m.x - lastMidX);
        const newY = pinchY - (pinchY - y) * (newScale / scale) + (m.y - lastMidY);

        applyTransform(newX, newY, newScale);
        lastDist = newDist;
        lastMidX = m.x;
        lastMidY = m.y;

      } else if (isPanning && e.touches.length === 1) {
        const t = e.touches[0];
        const now = Date.now();
        const dt = now - lastTime;
        const dx = t.clientX - touch1.x;
        const dy = t.clientY - touch1.y;

        if (dt > 0) {
          velX = dx / dt * 16;
          velY = dy / dt * 16;
        }
        lastTime = now;
        touch1 = { x: t.clientX, y: t.clientY };

        const newX = stateRef.current.x + dx;
        const newY = stateRef.current.y + dy;
        applyTransform(newX, newY, stateRef.current.scale);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        if (isPanning) {
          // Inertia: glide to a stop
          let { x, y, scale } = stateRef.current;
          const friction = 0.92;
          function inertia() {
            velX *= friction;
            velY *= friction;
            if (Math.abs(velX) < 0.3 && Math.abs(velY) < 0.3) {
              // Snap to bounds
              const clamped = clampPosition(x, y, scale);
              if (clamped.x !== x || clamped.y !== y) {
                applyTransform(clamped.x, clamped.y, scale, true);
              }
              return;
            }
            x += velX;
            y += velY;
            applyTransform(x, y, scale);
            rafId = requestAnimationFrame(inertia);
          }
          rafId = requestAnimationFrame(inertia);
        }

        if (isPinching) {
          // Snap scale bounds after pinch
          const { x, y, scale } = stateRef.current;
          const clamped = clampPosition(x, y, scale);
          applyTransform(clamped.x, clamped.y, scale, true);
        }

        isPanning = false;
        isPinching = false;
      } else if (e.touches.length === 1) {
        // One finger lifted during pinch → switch to pan
        isPinching = false;
        isPanning = true;
        touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        velX = 0; velY = 0;
      }
    }

    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove",  onTouchMove,  { passive: false });
    viewport.addEventListener("touchend",   onTouchEnd,   { passive: true });
    viewport.addEventListener("touchcancel",onTouchEnd,   { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove",  onTouchMove);
      viewport.removeEventListener("touchend",   onTouchEnd);
      viewport.removeEventListener("touchcancel",onTouchEnd);
    };
  }, [viewportRef, contentRef, applyTransform]);

  return { applyTransform, stateRef };
}

/* ── Main Editor ─────────────────────────────────────────────────── */
export function Editor({ formId, onBack, onExportPDF }: EditorProps) {
  const [isLoading,      setIsLoading]      = useState(true);
  const [pageCount,      setPageCount]      = useState(0);
  const [previewHtml,    setPreviewHtml]    = useState<string | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF,   setExportingPDF]   = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef  = useRef<HTMLDivElement>(null);
  const docxRef     = useRef<HTMLDivElement>(null);

  const template = getTemplateById(formId);

  const { applyTransform, stateRef } = useTouchPanZoom(viewportRef, contentRef);

  /* ── Set initial scale to fit A4 width on screen ── */
  useEffect(() => {
    const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
    const x = (window.innerWidth - A4_W * scale) / 2;
    applyTransform(x, 0, scale);
  }, [applyTransform]);

  /* ── Load docx ── */
  useEffect(() => {
    if (!docxRef.current || !template?.filePath) { setIsLoading(false); return; }
    setIsLoading(true);

    fetch(template.filePath)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob(); })
      .then(blob => docx.renderAsync(blob, docxRef.current!, null, {
        inWrapper: true, ignoreWidth: false, ignoreHeight: false,
        ignoreFonts: false, breakPages: true, useBase64URL: true,
        className: "docx",
      }))
      .then(() => {
        if (!docxRef.current) return;
        injectAndWire(docxRef.current);
        lockDocument(docxRef.current);
        
        // Center and set pageCount after rendering and pagination settle
        setTimeout(() => {
          if (docxRef.current) {
            setPageCount(docxRef.current.querySelectorAll(".docx-wrapper > section, .docx").length || 1);
          }
          const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
          const x = (window.innerWidth - A4_W * scale) / 2;
          applyTransform(x, 0, scale);
        }, 400);
      })
      .catch(e => { console.error(e); toast.error("Could not load template."); })
      .finally(() => setIsLoading(false));
  }, [formId, template, applyTransform]);

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

    const performExport = async () => {
      toast.info(`Generating ${size.toUpperCase()} PDF…`);
      const { x: ox, y: oy, scale: os } = stateRef.current;

      // Reset to 1:1 scale for pixel-perfect PDF capture
      applyTransform(0, 0, 1);
      await new Promise(r => setTimeout(r, 200));

      try {
        await generatePDF({
          elementId: "docx-print-target",
          filename:  `${template?.name || "legal-document"}-${Date.now()}.pdf`,
          paperSize: size,
          onSuccess: () => toast.success("PDF downloaded!"),
          onError:   () => toast.error("PDF failed. Try again."),
        });
      } catch (err) {
        console.error("PDF generation failed:", err);
        toast.error("PDF failed. Try again.");
      } finally {
        applyTransform(ox, oy, os);
        setExportingPDF(false);
      }
    };

    if (onExportPDF) {
      onExportPDF(() => { performExport(); });
      setExportingPDF(false);
    } else {
      await performExport();
    }
  };

  // Preview scale: fit A4 width to screen
  const previewScale = Math.min(1, (window.innerWidth - 16) / A4_W);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />

      {/* Toolbar */}
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

      {/* Pan & Zoom Viewport — raw touch events, works 100% in Capacitor */}
      <div
        ref={viewportRef}
        style={{
          flex: 1,
          overflow: "hidden",
          background: "#cbd5e1",
          position: "relative",
          touchAction: "none",   // Let our JS handle ALL touch gestures
          userSelect: "none",
        }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <Loader2 className="animate-spin text-slate-500" size={32} />
            <p style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>Loading template…</p>
          </div>
        )}

        {/* Transformable content — origin top-left for correct pinch math */}
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transformOrigin: "0 0",
            willChange: "transform",
            width: `${A4_W}px`,
            padding: "24px 0 40px",
          }}
        >
          <div id="docx-print-target" ref={docxRef} className="legal-doc-container"
            style={{
              visibility: isLoading ? "hidden" : "visible",
              WebkitUserSelect: "none",
              userSelect: "none",
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Preview modal — correctly scaled to fit screen */}
      {previewHtml && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "white", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Document Preview</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Exactly how PDF will look</p>
            </div>
            <button onClick={() => setPreviewHtml(null)} style={{ background: "#e2e8f0", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Close</button>
          </div>
          {/* Scroll container */}
          <div style={{ flex: 1, overflowY: "auto", background: "#cbd5e1" }}>
            {/* Scale wrapper: shrinks A4 to fit phone width, origin top-center */}
            <div style={{
              width: `${A4_W}px`,
              transformOrigin: "top left",
              transform: `scale(${previewScale})`,
              // Collapse the extra whitespace caused by scaling down
              marginBottom: `-${A4_W * (1 - previewScale)}px`,
            }}>
              <div className="legal-doc-container" dangerouslySetInnerHTML={{ __html: previewHtml }} />
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
