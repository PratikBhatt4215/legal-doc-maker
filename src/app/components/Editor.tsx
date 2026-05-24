import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import { Download, Loader2, Eye, FileText, X, Printer, Mic, MicOff } from "lucide-react";
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

function injectAndWire(container: HTMLElement): void {
  const dotPattern = /([.…]{4,}|_{4,})/g;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.isContentEditable || node.parentElement?.closest('.legal-editable-field')) {
        return NodeFilter.FILTER_REJECT;
      }
      return dotPattern.test(node.textContent || "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    }
  });

  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;
    const text = textNode.textContent || "";
    dotPattern.lastIndex = 0;
    const parts = text.split(/((?:[.…]{4,}|_{4,}))/g);
    if (parts.length <= 1) return;

    const frag = document.createDocumentFragment();
    parts.forEach(part => {
      if (/^(?:[.…]{4,}|_{4,})$/.test(part)) {
        const span = document.createElement("span");
        span.className = "legal-editable-field is-empty";
        span.contentEditable = "true";
        span.dataset.fieldId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        span.dataset.placeholder = part;
        span.setAttribute("spellcheck", "false");

        span.addEventListener("paste", e => {
          e.preventDefault();
          const pastedText = e.clipboardData?.getData("text/plain") || "";
          document.execCommand("insertText", false, pastedText);
        });

        span.addEventListener("input", () => {
          const currentText = span.textContent?.trim() || "";
          if (currentText.length > 0) {
            span.classList.remove("is-empty");
            span.classList.add("has-value");
          } else {
            span.classList.add("is-empty");
            span.classList.remove("has-value");
          }
        });

        frag.appendChild(span);
      } else if (part) {
        frag.appendChild(document.createTextNode(part));
      }
    });
    parent.replaceChild(frag, textNode);
  });

  container.querySelectorAll("td").forEach(td => {
    const cleanText = (td.textContent || "").trim().replace(/\u00A0/g, "");
    if (cleanText === "" || /^[.…_]+$/.test(cleanText)) {
      td.innerHTML = "";
      const span = document.createElement("span");
      span.className = "legal-editable-field is-empty td-field";
      span.contentEditable = "true";
      span.dataset.fieldId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      span.setAttribute("spellcheck", "false");

      span.addEventListener("input", () => {
        const currentText = span.textContent?.trim() || "";
        if (currentText.length > 0) {
          span.classList.remove("is-empty");
          span.classList.add("has-value");
        } else {
          span.classList.add("is-empty");
          span.classList.remove("has-value");
        }
      });
      td.appendChild(span);
    }
  });
}

function lockDocument(container: HTMLElement) {
  container.addEventListener("contextmenu", e => e.preventDefault());
  container.addEventListener("selectstart", e => {
    if (!(e.target as HTMLElement).isContentEditable) e.preventDefault();
  });
  container.addEventListener("copy", e => {
    if (!(e.target as HTMLElement).isContentEditable) e.preventDefault();
  });
}

function breakPagesDynamically(container: HTMLElement) {
  const sections = Array.from(container.querySelectorAll(".docx-wrapper > section.docx, section.docx")) as HTMLElement[];
  for (let i = 0; i < sections.length; i++) {
    paginateSection(sections[i]);
  }
}

function paginateSection(section: HTMLElement) {
  const article = section.querySelector("article");
  if (!article) return;

  const pageRect = section.getBoundingClientRect();
  const maxBottom = pageRect.top + 1070;

  const children = Array.from(article.children) as HTMLElement[];
  let splitIndex = -1;
  let tableSplitRowIndex = -1;
  let splitTableElement: HTMLTableElement | null = null;
  let hasKeptSomething = false;

  for (let j = 0; j < children.length; j++) {
    const child = children[j];
    const rect = child.getBoundingClientRect();

    if (rect.height === 0) continue;

    if (rect.bottom > maxBottom) {
      if (!hasKeptSomething) {
        hasKeptSomething = true;
        continue;
      }

      if (child.tagName === "TABLE") {
        const table = child as HTMLTableElement;
        const rows = Array.from(table.querySelectorAll("tr")) as HTMLTableRowElement[];
        let keptRow = false;

        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const rowRect = row.getBoundingClientRect();
          if (rowRect.bottom > maxBottom) {
            if (!keptRow) {
              keptRow = true;
              continue;
            }
            splitIndex = j;
            tableSplitRowIndex = r;
            splitTableElement = table;
            break;
          } else {
            keptRow = true;
          }
        }

        if (splitIndex !== -1) break;
      }

      splitIndex = j;
      break;
    } else {
      hasKeptSomething = true;
    }
  }

  if (splitIndex !== -1) {
    const newSection = section.cloneNode(true) as HTMLElement;
    const newArticle = newSection.querySelector("article");
    if (newArticle) {
      newArticle.innerHTML = "";
    }

    section.parentNode?.insertBefore(newSection, section.nextSibling);

    const overflowingElements: HTMLElement[] = [];

    if (splitTableElement && tableSplitRowIndex !== -1) {
      const table = splitTableElement;
      const rows = Array.from(table.querySelectorAll("tr")) as HTMLTableRowElement[];

      const newTable = table.cloneNode(false) as HTMLTableElement;
      const originalTbody = table.querySelector("tbody");
      const newTbody = originalTbody ? (originalTbody.cloneNode(false) as HTMLElement) : newTable;
      if (originalTbody) {
        newTable.appendChild(newTbody);
      }

      for (let r = tableSplitRowIndex; r < rows.length; r++) {
        newTbody.appendChild(rows[r]);
      }

      overflowingElements.push(newTable);

      for (let j = splitIndex + 1; j < children.length; j++) {
        overflowingElements.push(children[j]);
      }
    } else {
      for (let j = splitIndex; j < children.length; j++) {
        overflowingElements.push(children[j]);
      }
    }

    if (newArticle) {
      overflowingElements.forEach(el => newArticle.appendChild(el));
    }

    paginateSection(newSection);
  }
}

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
   PAN AND ZOOM HOOK (Updated with isDraggingRef check)
   ───────────────────────────────────────────────────────────────── */
function useTouchPanZoom(
  viewportRef: React.RefObject<HTMLDivElement>,
  contentRef: React.RefObject<HTMLDivElement>,
  isDraggingRef: React.MutableRefObject<boolean> // 🚨 NEW PARAMETER
) {
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
    let isPinching = false;
    let isPanning = false;
    let lastDist = 0;
    let lastMidX = 0;
    let lastMidY = 0;

    let velX = 0, velY = 0;
    let lastTime = 0;
    let rafId = 0;

    function dist(t1: { x: number, y: number }, t2: { x: number, y: number }) {
      return Math.hypot(t2.x - t1.x, t2.y - t1.y);
    }
    function mid(t1: { x: number, y: number }, t2: { x: number, y: number }) {
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
      // 🚨 CRITICAL FIX: If we are dragging an element, completely disable background panning!
      if (isDraggingRef.current) return;

      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        const newDist = dist(t1, t2);
        const m = mid(t1, t2);

        const { x, y, scale } = stateRef.current;
        const scaleFactor = newDist / lastDist;
        let newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * scaleFactor));

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
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.isContentEditable) {
          return;
        }

        e.preventDefault();
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
          let { x, y, scale } = stateRef.current;
          const friction = 0.92;
          function inertia() {
            velX *= friction;
            velY *= friction;
            if (Math.abs(velX) < 0.3 && Math.abs(velY) < 0.3) {
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
          const { x, y, scale } = stateRef.current;
          const clamped = clampPosition(x, y, scale);
          applyTransform(clamped.x, clamped.y, scale, true);
        }

        isPanning = false;
        isPinching = false;
      } else if (e.touches.length === 1) {
        isPinching = false;
        isPanning = true;
        touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        velX = 0; velY = 0;
      }
    }

    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [viewportRef, contentRef, applyTransform, isDraggingRef]);

  return { applyTransform, stateRef };
}

export function Editor({ formId, onBack, onExportPDF }: EditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const dragElRef = useRef<HTMLElement | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef({ screenX: 0, screenY: 0, origTop: 0, origLeft: 0 });

  // 🚨 NEW COMMUNICATION BRIDGE: Tells Pan/Zoom when a drag is happening
  const isDraggingRef = useRef(false);

 

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const docxRef = useRef<HTMLDivElement>(null);

  const template = getTemplateById(formId);

  // Pass the ref to the Pan/Zoom hook
  const { applyTransform, stateRef } = useTouchPanZoom(viewportRef, contentRef, isDraggingRef);

  useEffect(() => {
    const container = docxRef.current;
    if (!container || isLoading) return;

    const setupTimer = setTimeout(() => {
      const draggables = container.querySelectorAll<HTMLElement>(
        ".docx-wrapper > section.docx article > p, " +
        ".docx-wrapper > section.docx article > table, " +
        ".docx-wrapper > section.docx article > div"
      );

      draggables.forEach(el => {
        if (!el.style.position || el.style.position === "static") {
          el.style.position = "relative";
          el.style.top = "0px";
          el.style.left = "0px";
        }
      });
    }, 600);

    return () => clearTimeout(setupTimer);
  }, [isLoading, pageCount]);

  /* ─────────────────────────────────────────────────────────────────
     DRAG AND DROP LOGIC
     ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = docxRef.current;
    if (!container) return;

    function findDraggableParent(target: HTMLElement): HTMLElement | null {
      if (target.isContentEditable) return null;

      let el: HTMLElement | null = target;
      while (el && el !== container) {
        const parent = el.parentElement;
        if (parent && parent.tagName === "ARTICLE") {
          return el;
        }
        el = parent;
      }
      return null;
    }

    function onPointerDown(e: TouchEvent | MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.isContentEditable) return;

      const draggable = findDraggableParent(target);
      if (!draggable) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);

      dragStartRef.current = {
        screenX: clientX,
        screenY: clientY,
        origTop: parseFloat(draggable.style.top) || 0,
        origLeft: parseFloat(draggable.style.left) || 0,
      };

      dragTimerRef.current = setTimeout(() => {
        dragElRef.current = draggable;

        // 🚨 TELL PAN/ZOOM TO STOP!
        isDraggingRef.current = true;

        draggable.style.outline = "2px dashed #1e3a5f";
        draggable.style.opacity = "0.85";
        draggable.style.zIndex = "100";
        draggable.style.transition = "none";

        // Disable native browser scrolling just in case
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
      }, 400);
    }

    function onPointerMove(e: TouchEvent | MouseEvent) {
      const clientX = "touches" in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      if (!dragElRef.current) {
        if (dragTimerRef.current) {
          const dx = clientX - dragStartRef.current.screenX;
          const dy = clientY - dragStartRef.current.screenY;
          if (Math.hypot(dx, dy) > 8) {
            clearTimeout(dragTimerRef.current);
            dragTimerRef.current = null;
          }
        }
        return;
      }

      if (e.cancelable) e.preventDefault();

      const { scale } = stateRef.current;
      const safeScale = scale > 0 ? scale : 1;
      const dx = (clientX - dragStartRef.current.screenX) / safeScale;
      const dy = (clientY - dragStartRef.current.screenY) / safeScale;

      const newLeft = Math.round((dragStartRef.current.origLeft + dx) / 2) * 2;
      const newTop = Math.round((dragStartRef.current.origTop + dy) / 2) * 2;

      dragElRef.current.style.left = `${newLeft}px`;
      dragElRef.current.style.top = `${newTop}px`;
    }

    function onPointerUp() {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }

      if (dragElRef.current) {
        dragElRef.current.style.outline = "";
        dragElRef.current.style.opacity = "";
        dragElRef.current.style.zIndex = "";
        dragElRef.current.style.transition = "";
        dragElRef.current = null;

        // 🚨 TELL PAN/ZOOM TO START AGAIN!
        isDraggingRef.current = false;

        // Re-enable native browser scrolling
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      }
    }

    container.addEventListener("touchstart", onPointerDown, { passive: true });
    container.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);
    window.addEventListener("mouseup", onPointerUp);

    return () => {
      container.removeEventListener("touchstart", onPointerDown);
      container.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("touchcancel", onPointerUp);
      window.removeEventListener("mouseup", onPointerUp);
    };
  }, [isLoading, pageCount, stateRef]);

  const toggleVoiceTyping = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice typing not supported on this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening for Hindi dictation...");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((res: any) => res[0].transcript)
        .join("");

      const activeEl = document.activeElement as HTMLElement;

      if (activeEl && activeEl.classList.contains("legal-editable-field")) {
        const span = activeEl as HTMLSpanElement;
        const currentText = span.textContent?.trim() || "";
        span.textContent = (currentText + " " + transcript).trim();
        span.classList.remove("is-empty");
        span.classList.add("has-value");
        span.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        toast.info("Tap a dotted line field first, then dictate.");
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening]);

  useEffect(() => {
    const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
    const x = (window.innerWidth - A4_W * scale) / 2;
    applyTransform(x, 0, scale);
  }, [applyTransform]);

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
        lockDocument(docxRef.current);

        const doInject = () => {
          if (docxRef.current) {
            injectAndWire(docxRef.current);
            applyTransform(0, 0, 1);
            breakPagesDynamically(docxRef.current);

            const pc = docxRef.current.querySelectorAll(".docx-wrapper > section.docx, section.docx").length || 1;
            setPageCount(pc);

            const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
            const x = (window.innerWidth - A4_W * scale) / 2;
            applyTransform(x, 0, scale);
          }
        };

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => setTimeout(doInject, 200));
        } else {
          setTimeout(doInject, 400);
        }
      })
      .catch(e => { console.error(e); toast.error("Could not load template."); })
      .finally(() => setIsLoading(false));
  }, [formId, template, applyTransform]);

  const handlePreview = useCallback(() => {
    if (!docxRef.current) return;
    const clone = docxRef.current.cloneNode(true) as HTMLElement;
    setPreviewHtml(clone.innerHTML);
  }, []);

  const handleSave = useCallback(() => {
    if (docxRef.current) storage.saveDraft(formId, docxRef.current.innerHTML);
  }, [formId]);

  const handleResetLayout = useCallback(() => {
    const container = docxRef.current;
    if (!container) return;
    const draggables = container.querySelectorAll<HTMLElement>(
      ".docx-wrapper > section.docx article > p, " +
      ".docx-wrapper > section.docx article > table, " +
      ".docx-wrapper > section.docx article > div"
    );
    draggables.forEach(el => {
      el.style.top = "0px";
      el.style.left = "0px";
    });
    toast.success("Document layout reset to original!");
  }, []);

  const handlePaperSelect = async (size: PaperSize) => {
    setShowPaperModal(false);
    handleSave();
    setExportingPDF(true);

    const performExport = async () => {
      toast.info(`Generating ${size.toUpperCase()} PDF…`);
      const { x: ox, y: oy, scale: os } = stateRef.current;

      applyTransform(0, 0, 1);
      await new Promise(r => setTimeout(r, 200));

      try {
        await generatePDF({
          elementId: "docx-print-target",
          filename: `${template?.name || "legal-document"}-${Date.now()}.pdf`,
          paperSize: size,
          onSuccess: () => toast.success("PDF downloaded!"),
          onError: () => toast.error("PDF failed. Try again."),
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

  const previewScale = Math.min(1, (window.innerWidth - 16) / A4_W);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />

      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {pageCount} page{pageCount !== 1 ? "s" : ""}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={toggleVoiceTyping}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: isListening ? "#dc2626" : "#f8fafc",
              color: isListening ? "white" : "#334155",
              border: "1px solid", borderColor: isListening ? "#dc2626" : "#cbd5e1",
              borderRadius: 9, padding: "8px 14px", fontWeight: 600, fontSize: 13,
              cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            {isListening ? "Listening..." : "Dictate"}
          </button>
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

      <div
        ref={viewportRef}
        style={{
          flex: 1, overflow: "hidden", background: "#cbd5e1",
          position: "relative", touchAction: "none", userSelect: "none",
        }}
      >
        {isLoading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <Loader2 className="animate-spin text-slate-500" size={32} />
            <p style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>Loading template…</p>
          </div>
        )}

        <div
          ref={contentRef}
          style={{
            position: "absolute", top: 0, left: 0,
            transformOrigin: "0 0", willChange: "transform",
            width: `${A4_W}px`, padding: "24px 0 40px",
          }}
        >
          <div
            id="docx-print-target"
            ref={docxRef}
            className="legal-doc-container"
            style={{
              visibility: isLoading ? "hidden" : "visible",
              WebkitUserSelect: "none",
              userSelect: "none",
              position: "relative",
            } as React.CSSProperties}
          />
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
          }}
        >
          <button
            onClick={handleResetLayout}
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(8px)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "9999px",
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            onTouchStart={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onTouchEnd={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Reset Layout
          </button>
        </div>
      </div>

      {previewHtml && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "white", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Document Preview</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Exactly how PDF will look</p>
            </div>
            <button onClick={() => setPreviewHtml(null)} style={{ background: "#e2e8f0", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Close</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", background: "#cbd5e1" }}>
            <div style={{
              width: `${A4_W}px`, transformOrigin: "top left",
              transform: `scale(${previewScale})`,
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