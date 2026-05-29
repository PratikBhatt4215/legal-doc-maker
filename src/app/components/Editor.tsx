import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import { Download, Loader2, Eye, FileText, X, Printer, Mic, MicOff, Bold, Underline, AlignCenter, AlignJustify, Table, Ruler, BetweenHorizontalStart, RotateCcw } from "lucide-react";
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
  onExportPDF: (onSuccess: () => void) => void;
}

const A4_W = 794;

function injectAndWire(container: HTMLElement): void {
  const dotPattern = /([.…]{4,}|_{4,})/g;
  const testPattern = /([.…]{4,}|_{4,})/; // stateless non-global pattern to prevent lastIndex bug!

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest('.legal-editable-field')) {
        return NodeFilter.FILTER_REJECT;
      }
      return testPattern.test(node.textContent || "")
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

    parts.forEach((part, partIdx) => {
      if (/^(?:[.…]{4,}|_{4,})$/.test(part)) {
        const span = document.createElement("span");
        const isInTable = parent && typeof (parent as any).closest === "function"
          ? (parent as any).closest("table") !== null
          : false;
        span.className = isInTable ? "legal-editable-field is-empty td-field" : "legal-editable-field is-empty";
        // NO contentEditable on span — the parent article handles all editing.
        // Span is just a visual decoration (dotted underline) inside the editable article.
        span.dataset.fieldId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        span.dataset.placeholder = isInTable ? "" : part;
        span.textContent = "";

        // Dynamic min-width so each dotted field has an appropriate visible width
        if (!isInTable) {
          const minW = Math.max(60, Math.round(part.length * 5.5));
          span.style.setProperty("min-width", `${minW}px`, "important");
        }

        frag.appendChild(span);

      } else if (part) {
        // Wrap leading and trailing whitespaces in legal-conditional-space ONLY if they are layout gaps (2 or more spaces)
        const leadingMatch = part.match(/^([\s\u00A0]+)/);
        const leadingSpace = leadingMatch ? leadingMatch[1] : "";
        
        const remainingAfterLeading = part.substring(leadingSpace.length);
        const trailingMatch = remainingAfterLeading.match(/([\s\u00A0]+)$/);
        const trailingSpace = trailingMatch ? trailingMatch[1] : "";
        
        const coreText = remainingAfterLeading.substring(0, remainingAfterLeading.length - trailingSpace.length);

        if (leadingSpace) {
          if (leadingSpace.length === 1) {
            frag.appendChild(document.createTextNode(leadingSpace));
          } else {
            const spaceSpan = document.createElement("span");
            spaceSpan.className = "legal-conditional-space";
            spaceSpan.textContent = leadingSpace;
            frag.appendChild(spaceSpan);
          }
        }

        if (coreText) {
          frag.appendChild(document.createTextNode(coreText));
        }

        if (trailingSpace) {
          if (trailingSpace.length === 1) {
            frag.appendChild(document.createTextNode(trailingSpace));
          } else {
            const spaceSpan = document.createElement("span");
            spaceSpan.className = "legal-conditional-space";
            spaceSpan.textContent = trailingSpace;
            frag.appendChild(spaceSpan);
          }
        }
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
      span.dataset.placeholder = "";
      span.textContent = "";
      span.setAttribute("spellcheck", "false");

      span.addEventListener("paste", e => {
        e.preventDefault();
        const pastedText = e.clipboardData?.getData("text/plain") || "";
        document.execCommand("insertText", false, pastedText);
      });

      span.addEventListener("focus", () => {
        if (span.classList.contains("is-empty")) {
          span.textContent = "";
          span.classList.remove("is-empty");
        }
      });

      span.addEventListener("blur", () => {
        const currentText = span.textContent || "";
        if (currentText.trim() === "") {
          span.textContent = span.dataset.placeholder || "";
          span.classList.add("is-empty");
          span.classList.remove("has-value");
        }
      });

      span.addEventListener("input", () => {
        const currentText = span.textContent || "";
        if (currentText.length > 0 && currentText !== span.dataset.placeholder) {
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

  // Merge adjacent editable fields to avoid multiple inputs for a single dotted line!
  let changed = true;
  while (changed) {
    changed = false;
    const fields = Array.from(container.querySelectorAll(".legal-editable-field")) as HTMLSpanElement[];
    for (let i = 0; i < fields.length - 1; i++) {
      const current = fields[i];
      const next = fields[i + 1];

      // Check if they are inside the same block container (like a paragraph, table cell, or section)
      const p1 = current.closest("p, td, li, div");
      const p2 = next.closest("p, td, li, div");
      if (p1 && p1 === p2) {
        try {
          const range = document.createRange();
          range.setStartAfter(current);
          range.setEndBefore(next);
          const textBetween = range.toString().trim().replace(/\u00A0/g, "").replace(/\s+/g, "");

          if (textBetween === "") {
            // Merging next into current!
            const ph1 = current.dataset.placeholder || "";
            const ph2 = next.dataset.placeholder || "";
            current.dataset.placeholder = ph1 + ph2;

            current.textContent = (current.textContent || "") + (next.textContent || "");

            if ((current.textContent || "").trim().length > 0) {
              current.classList.remove("is-empty");
              current.classList.add("has-value");
            } else {
              current.classList.add("is-empty");
              current.classList.remove("has-value");
            }

            next.parentNode?.removeChild(next);
            changed = true;
            break;
          }
        } catch (rangeErr) {
          console.error("Range merge error:", rangeErr);
        }
      }
    }
  }
}

function lockDocument(container: HTMLElement) {
  container.addEventListener("contextmenu", e => e.preventDefault());
  container.addEventListener("selectstart", e => {
    const target = e.target as HTMLElement;
    if (target && !target.isContentEditable && typeof target.closest === "function" && !target.closest("[contenteditable='true']")) {
      e.preventDefault();
    }
  });
  container.addEventListener("copy", e => {
    const target = e.target as HTMLElement;
    if (target && !target.isContentEditable && typeof target.closest === "function" && !target.closest("[contenteditable='true']")) {
      e.preventDefault();
    }
  });
}

let paginationTimeout: any = null;

function schedulePagination(container: HTMLElement) {
  clearTimeout(paginationTimeout);

  paginationTimeout = setTimeout(() => {
    breakPagesDynamically(container);
  }, 300);
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

function MarginRuler({
  leftMargin,
  rightMargin,
  onLeftMarginChange,
  onRightMarginChange,
  isDraggingRef,
}: {
  leftMargin: number;
  rightMargin: number;
  onLeftMarginChange: (m: number) => void;
  onRightMarginChange: (m: number) => void;
  isDraggingRef: React.MutableRefObject<boolean>;
}) {
  const rulerWidth = 794;
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate tick marks (every 10px, major ticks every 50px)
  const ticks = [];
  for (let i = 0; i <= rulerWidth; i += 10) {
    const isMajor = i % 50 === 0;
    ticks.push(
      <div
        key={i}
        className={`ruler-tick ${isMajor ? "major" : ""}`}
        style={{ left: `${i}px` }}
      >
        {isMajor && i > 0 && i < rulerWidth && (
          <span className="ruler-tick-label">{(i / 50).toFixed(0)}</span>
        )}
      </div>
    );
  }

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    type: "left" | "right"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    // Disable panning of the document while adjusting margins
    isDraggingRef.current = true;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentScale = rect.width / rulerWidth;

      if (type === "left") {
        const clientX = moveEvent.clientX - rect.left;
        const localX = clientX / currentScale;
        // Limit left margin strictly between 20px and 220px
        const newLeft = Math.min(220, Math.max(20, Math.round(localX)));
        onLeftMarginChange(newLeft);
      } else {
        const clientX = rect.right - moveEvent.clientX;
        const localX = clientX / currentScale;
        // Limit right margin strictly between 20px and 220px
        const newRight = Math.min(220, Math.max(20, Math.round(localX)));
        onRightMarginChange(newRight);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      handle.releasePointerCapture(upEvent.pointerId);
      isDraggingRef.current = false; // Re-enable panning
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div ref={containerRef} className="margin-ruler-container">
      {/* Visual Ticks scale */}
      <div className="margin-ruler-scale">{ticks}</div>

      {/* Shaded margin areas */}
      <div className="ruler-shaded-area" style={{ left: 0, width: `${leftMargin}px` }} />
      <div className="ruler-shaded-area" style={{ right: 0, width: `${rightMargin}px` }} />

      {/* Left Margin Handle */}
      <div
        className="ruler-handle"
        style={{ left: `${leftMargin - 5}px` }}
        onPointerDown={(e) => handlePointerDown(e, "left")}
        title="Drag Left Margin"
      />

      {/* Right Margin Handle */}
      <div
        className="ruler-handle"
        style={{ right: `${rightMargin - 5}px` }}
        onPointerDown={(e) => handlePointerDown(e, "right")}
        title="Drag Right Margin"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAN AND ZOOM HOOK (Updated with isDraggingRef check)
   ───────────────────────────────────────────────────────────────── */
function useTouchPanZoom(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
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
      const vw = viewport!.clientWidth;
      const vh = viewport!.clientHeight;
      const scaledW = A4_W * scale;
      const scaledH = content!.scrollHeight * scale;

      let minX = 0;
      let maxX = 0;
      if (scaledW > vw) {
        minX = vw - scaledW;
        maxX = 0;
      } else {
        minX = (vw - scaledW) / 2;
        maxX = (vw - scaledW) / 2;
      }

      let minY = 0;
      let maxY = 0;
      if (scaledH > vh) {
        minY = vh - scaledH - 120; // 120px extra padding at bottom for very comfortable typing with keyboard
        maxY = 0;
      } else {
        minY = 0;
        maxY = 0;
      }

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
        isPanning = false;
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

        const rect = viewport!.getBoundingClientRect();
        const pinchX = m.x - rect.left;
        const pinchY = m.y - rect.top;
        const newX = pinchX - (pinchX - x) * (newScale / scale) + (m.x - lastMidX);
        const newY = pinchY - (pinchY - y) * (newScale / scale) + (m.y - lastMidY);

        const clamped = clampPosition(newX, newY, newScale);
        applyTransform(clamped.x, clamped.y, newScale);
        lastDist = newDist;
        lastMidX = m.x;
        lastMidY = m.y;
      }
      else if (e.touches.length === 1) {
        const activeElement = document.activeElement as HTMLElement;
        const touchTarget = e.target as HTMLElement;
        
        // Only block panning if we are touching the CURRENTLY ACTIVE (FOCUSED) input!
        // This allows users to swipe freely and zoom/scroll even if their finger touches other inputs!
        if (
          activeElement &&
          activeElement.isContentEditable &&
          touchTarget &&
          touchTarget.closest(".legal-editable-field") === activeElement
        ) {
          return;
        }

        if (!isPanning) {
          isPanning = true;
          touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          lastTime = Date.now();
          velX = 0; velY = 0;
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
        const clamped = clampPosition(newX, newY, stateRef.current.scale);
        // If clamped, zero velocity in that direction — prevents rubber-band accumulation!
        if (clamped.x !== newX) velX = 0;
        if (clamped.y !== newY) velY = 0;
        applyTransform(clamped.x, clamped.y, stateRef.current.scale);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) {
        if (isPanning) {
          let { x, y, scale } = stateRef.current;
          const friction = 0.88; // Slightly more friction = quicker stop, less overshoot
          function inertia() {
            velX *= friction;
            velY *= friction;
            // Stop when velocity is near-zero
            if (Math.abs(velX) < 0.3 && Math.abs(velY) < 0.3) {
              // Final snap to valid bounds (no animation needed — already clamped each frame)
              return;
            }
            const nextX = x + velX;
            const nextY = y + velY;
            // 🔑 Clamp EVERY frame so content NEVER visually overshoots the edge!
            const clamped = clampPosition(nextX, nextY, scale);
            // If hitting a wall, kill velocity in that direction to stop rubber-band
            if (clamped.x !== nextX) velX = 0;
            if (clamped.y !== nextY) velY = 0;
            x = clamped.x;
            y = clamped.y;
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
  const [lineSpacing, setLineSpacing] = useState<number | null>(null);
  const [perfectAlign, setPerfectAlign] = useState(false);
  const [leftMargin, setLeftMargin] = useState(72); // Default Left Margin in px
  const [rightMargin, setRightMargin] = useState(72); // Default Right Margin in px
  const [isTwoColumns, setIsTwoColumns] = useState(false);
  const [showRuler, setShowRuler] = useState(true);
  const [showSpacingOptions, setShowSpacingOptions] = useState(false);
  const [globalAlign, setGlobalAlign] = useState(""); // Default "" uses template original styles
  const [showTools, setShowTools] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(2);
  const [tableCols, setTableCols] = useState(5);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [tableFit, setTableFit] = useState("fixed");
  const [selectionFormat, setSelectionFormat] = useState({
    bold: false,
    underline: false,
    align: "left" as "left" | "center" | "right" | "justify",
  });

  // Enable styleWithCSS so formatting cleanly applies inline style overrides inside text fields
  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch (e) { }
  }, []);

  // Track rich-text command states + selected paragraph for ruler
  useEffect(() => {
    const handleSelectionChange = () => {
      try {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl.isContentEditable) {
          const bold = document.queryCommandState("bold");
          const underline = document.queryCommandState("underline");
          const align = document.queryCommandState("justifyCenter") ? "center" :
            document.queryCommandState("justifyRight") ? "right" :
              document.queryCommandState("justifyFull") ? "justify" : "left";

          setSelectionFormat(prev => {
            if (prev.bold === bold && prev.underline === underline && prev.align === align) {
              return prev;
            }
            return { bold, underline, align };
          });

          // Track which paragraph the cursor is in — for paragraph-level ruler changes
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            let node: Node | null = sel.getRangeAt(0).startContainer;
            // Walk up to find the closest block element — ONLY P/H/LI, NOT DIV
            // DIVs in docx-preview are wrapper containers that may hold many paragraphs
            while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
            let el = node as HTMLElement | null;
            while (el && !["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI"].includes(el.tagName)) {
              el = el.parentElement;
            }
            // Only set if the found element is inside the document (not a UI button etc.)
            if (el && docxRef.current?.contains(el)) {
              selectedParaRef.current = el;
            } else {
              selectedParaRef.current = null;
            }
          }
        }
      } catch (e) {
        // Ignore errors if querying is temporarily unsupported
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const dragElRef = useRef<HTMLElement | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef({ screenX: 0, screenY: 0, origTop: 0, origLeft: 0 });

  // 🚨 NEW COMMUNICATION BRIDGE: Tells Pan/Zoom when a drag is happening
  const isDraggingRef = useRef(false);

  // Tracks where user last clicked/tapped on the document — used for table insertion position
  const savedRangeRef = useRef<Range | null>(null);

  // Tracks the paragraph currently containing the cursor — ruler applies indent to this paragraph
  const selectedParaRef = useRef<HTMLElement | null>(null);

  const originalMarginsRef = useRef<{ left: number; right: number } | null>(null);

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
      // Don't drag if clicking directly on an editable field placeholder
      if (target.closest(".legal-editable-field")) return null;

      let el: HTMLElement | null = target;
      while (el && el !== container) {
        const parentEl: HTMLElement | null = el.parentElement;
        if (parentEl && parentEl.tagName === "ARTICLE") {
          return el;
        }
        el = parentEl;
      }
      return null;
    }

    function onPointerDown(e: TouchEvent | MouseEvent) {
      const target = e.target as HTMLElement;
      // Let native taps on input fields work
      if (target.closest(".legal-editable-field")) return;

      const draggable = findDraggableParent(target);
      if (!draggable) return;

      // Dynamically ensure position: relative is set so top/left styles will take effect!
      if (!draggable.style.position || draggable.style.position === "static") {
        draggable.style.position = "relative";
        if (!draggable.style.top) draggable.style.top = "0px";
        if (!draggable.style.left) draggable.style.left = "0px";
      }

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);

      dragStartRef.current = {
        screenX: clientX,
        screenY: clientY,
        origTop: parseFloat(draggable.style.top) || 0,
        origLeft: parseFloat(draggable.style.left) || 0,
      };

      // Responsive long-press hold delay of 1200ms.
      // This allows the OS native text selection to appear first (usually ~500ms).
      // If the user continues holding past 1.2s, it triggers paragraph drag mode.
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
      }, 350);
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
      .then(blob => docx.renderAsync(blob, docxRef.current!, undefined, {
        inWrapper: true, ignoreWidth: false, ignoreHeight: false,
        ignoreFonts: false, breakPages: true, useBase64URL: true,
        renderHeaders: false, renderFooters: false,
        className: "docx",
      }))
      .then(() => {
        if (!docxRef.current) return;
        // ✅ No lockDocument — whole document is now freely editable like MS Word!

        const doInject = () => {
          if (docxRef.current) {
            injectAndWire(docxRef.current);
            applyTransform(0, 0, 1);
            breakPagesDynamically(docxRef.current);

            // Read the actual computed margins of the natively rendered section
            const firstSection = docxRef.current.querySelector(".docx-wrapper > section.docx, section.docx") as HTMLElement;
            if (firstSection) {
              const computedStyle = window.getComputedStyle(firstSection);
              const computedLeft = parseFloat(computedStyle.paddingLeft);
              const computedRight = parseFloat(computedStyle.paddingRight);
              if (!isNaN(computedLeft) && !isNaN(computedRight)) {
                setLeftMargin(computedLeft);
                setRightMargin(computedRight);
                originalMarginsRef.current = { left: computedLeft, right: computedRight };
              }
            }

            const pc = docxRef.current.querySelectorAll(".docx-wrapper > section.docx, section.docx").length || 1;
            setPageCount(pc);

            const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
            const x = (window.innerWidth - A4_W * scale) / 2;
            applyTransform(x, 0, scale);

            // ✅ Make EVERY article element fully contentEditable — single unified MS Word-like editor!
            docxRef.current.querySelectorAll("article").forEach(article => {
              const el = article as HTMLElement;
              el.contentEditable = "true";
              el.spellcheck = false;
              el.style.cursor = "text";
              el.style.outline = "none";
              el.style.caretColor = "#111";

              // Single input listener: update is-empty/has-value on ALL dotted fields
              // whenever anything in the article changes (user typed, deleted, etc.)
              el.addEventListener("input", () => {
                el.querySelectorAll(".legal-editable-field").forEach(field => {
                  const f = field as HTMLElement;
                  const hasText = (f.textContent || "").trim().length > 0;
                  f.classList.toggle("is-empty", !hasText);
                  f.classList.toggle("has-value", hasText);
                });
                // Also save current selection for table insertion
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  savedRangeRef.current = sel.getRangeAt(0).cloneRange();
                }
              });

              // Track click for table insertion position
              el.addEventListener("click", () => {
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  savedRangeRef.current = sel.getRangeAt(0).cloneRange();
                }
              });
            });
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
  }, [formId, template, applyTransform, resetTrigger]); // 🚨 Added resetTrigger to force reload on reset!

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

    // 1. Reset formatting state variables to original template defaults
    setLineSpacing(null);
    setPerfectAlign(false);
    setIsTwoColumns(false);
    setShowRuler(true);
    setShowSpacingOptions(false);
    setGlobalAlign("");
    setShowTools(false);
    if (originalMarginsRef.current) {
      setLeftMargin(originalMarginsRef.current.left);
      setRightMargin(originalMarginsRef.current.right);
    } else {
      setLeftMargin(72);
      setRightMargin(72);
    }

    // 2. Trigger template reload to clear all typing, tables, and offsets!
    setResetTrigger(prev => prev + 1);

    toast.success("Document layout & formatting reset to original!");
  }, []);

  const insertTableAtCursor = () => {
    let inserted = false;

    // Create a standard legal-styled table
    const table = document.createElement("table");
    table.className = "inserted-user-table";
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "12px";
    table.style.marginBottom = "12px";
    table.style.tableLayout = "fixed";

    const tbody = document.createElement("tbody");
    for (let r = 0; r < tableRows; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < tableCols; c++) {
        const td = document.createElement("td");
        td.style.padding = "8px 10px";
        td.style.border = "1px solid #1e293b";
        td.style.height = "2.2em";
        td.style.verticalAlign = "middle";

        const span = document.createElement("span");
        span.className = "legal-editable-field is-empty td-field";
        span.contentEditable = "true";
        span.dataset.fieldId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        span.style.display = "block";
        span.style.width = "100%";
        span.style.minHeight = "1.5em";
        span.style.outline = "none";
        span.addEventListener("input", () => {
          const text = span.textContent || "";
          span.classList.toggle("is-empty", text.length === 0);
          span.classList.toggle("has-value", text.length > 0);
        });
        td.appendChild(span);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Helper: insert table after the block containing the given range
    const insertAfterBlock = (range: Range): boolean => {
      const article = docxRef.current?.querySelector("article");
      if (!article) return false;
      // Walk up from range start to find a direct article child
      let node: Node | null = range.startContainer;
      while (node && node.parentNode !== article) node = node.parentNode;
      if (node && node.parentNode === article) {
        // Insert table right after that paragraph/block
        node.parentNode!.insertBefore(table, node.nextSibling);
        const brP = document.createElement("p");
        brP.style.minHeight = "1em";
        brP.innerHTML = "<br>";
        table.parentNode?.insertBefore(brP, table.nextSibling);
        return true;
      }
      return false;
    };

    // Priority 1: Use the saved tap/click position from savedRangeRef
    if (savedRangeRef.current && docxRef.current?.contains(savedRangeRef.current.startContainer)) {
      inserted = insertAfterBlock(savedRangeRef.current);
    }

    // Priority 2: Live selection fallback
    if (!inserted) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (docxRef.current?.contains(range.startContainer)) {
          inserted = insertAfterBlock(range);
        }
      }
    }

    // Priority 3: Append at end of article
    if (!inserted && docxRef.current) {
      const article = docxRef.current.querySelector("article");
      if (article) {
        article.appendChild(table);
        const brP = document.createElement("p");
        brP.style.minHeight = "1em";
        brP.innerHTML = "<br>";
        article.appendChild(brP);
        inserted = true;
      }
    }

    if (inserted) {
      savedRangeRef.current = null;
      toast.success(`Inserted a ${tableRows}x${tableCols} table!`);
      setShowTableModal(false);
      setTimeout(() => {
        if (docxRef.current) schedulePagination(docxRef.current);
      }, 150);
    } else {
      toast.error("Tap inside the document first where you want to insert the table.");
    }
  };

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


  const insertTable = () => {
    const rows = Number(tableRows);
    const cols = Number(tableCols);

    if (!rows || !cols) return;

    let html = "<table style='width:100%; border-collapse: collapse;'>";

    for (let r = 0; r < rows; r++) {
      html += "<tr>";

      for (let c = 0; c < cols; c++) {
        html += `
        <td
          style="
            border:1px solid #000;
            padding:8px;
            min-width:80px;
          "
        >
          &nbsp;
        </td>
      `;
      }

      html += "</tr>";
    }

    html += "</table><br/>";

    document.execCommand("insertHTML", false, html);

    setShowTableModal(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      <TopNavBar
        title={template?.name || "Legal Document Editor"}
        subtitle={template?.description}
        onBack={onBack}
      />



      <div
        ref={viewportRef}
        style={{
          flex: 1, overflow: "hidden", background: "#cbd5e1",
          position: "relative", touchAction: "none",
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
          {showRuler && (
            <MarginRuler
              leftMargin={leftMargin}
              rightMargin={rightMargin}
              isDraggingRef={isDraggingRef}
              onLeftMarginChange={(m) => {
                // Always move the handle visually
                setLeftMargin(m);
                if (selectedParaRef.current) {
                  // Apply RELATIVE indent to selected paragraph only.
                  // m is absolute from page left edge; section already provides leftMargin padding.
                  // So relative indent = m - leftMargin (0px at original position).
                  const relativeIndent = Math.max(0, m - leftMargin);
                  selectedParaRef.current.style.paddingLeft = `${relativeIndent}px`;
                  selectedParaRef.current.style.marginLeft = "0";
                }
                // NO fallback to section — that would affect ALL paragraphs!
                setTimeout(() => {
                  if (docxRef.current) breakPagesDynamically(docxRef.current);
                }, 100);
              }}
              onRightMarginChange={(m) => {
                setRightMargin(m);
                if (selectedParaRef.current) {
                  const relativeIndent = Math.max(0, m - rightMargin);
                  selectedParaRef.current.style.paddingRight = `${relativeIndent}px`;
                  selectedParaRef.current.style.marginRight = "0";
                }
                // NO fallback to section
                setTimeout(() => {
                  if (docxRef.current) breakPagesDynamically(docxRef.current);
                }, 100);
              }}
            />
          )}

          <div
            id="docx-print-target"
            ref={docxRef}
            contentEditable={false}
            suppressContentEditableWarning={true}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"

            className={`legal-doc-container ${perfectAlign ? "perfect-left-align" : ""} ${isTwoColumns ? "two-columns-layout" : ""} ${globalAlign ? `global-align-${globalAlign}` : ""}`}
            style={{
              visibility: isLoading ? "hidden" : "visible",
              //WebkitUserSelect: "none",
              WebkitUserSelect: "text",

              //userSelect: "none",
              userSelect: "text",
              position: "relative",
              "--document-line-spacing": lineSpacing || "inherit",
              "--document-left-margin": `${leftMargin}px`,
              "--document-right-margin": `${rightMargin}px`,
            } as React.CSSProperties}
          />
        </div>

        {/* Floating reset layout button has been moved into the bottom toolbar to avoid obscuring canvas content */}
      </div>



      {/* ── Premium Bottom Editing Toolbar & Operations Panel ── */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #e2e8f0",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          flexShrink: 0,
        }}
      >
        {/* Dynamic Spacing Secondary Toolbar */}
        {showTools && showSpacingOptions && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginRight: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Select Line Spacing (1.5 - 2.0):
            </span>
            {[1.5, 1.6, 1.7, 1.8, 1.9, 2.0].map((val) => (
              <button
                key={val}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setLineSpacing(val);
                  setTimeout(() => {
                    if (docxRef.current) breakPagesDynamically(docxRef.current);
                  }, 100);
                }}
                style={{
                  background: lineSpacing === val ? "#1e3a5f" : "#ffffff",
                  color: lineSpacing === val ? "#ffffff" : "#334155",
                  border: "1px solid",
                  borderColor: lineSpacing === val ? "#1e3a5f" : "#cbd5e1",
                  borderRadius: "9999px",
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: lineSpacing === val ? "0 2px 6px rgba(30,58,95,0.3)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {val.toFixed(1)}x
              </button>
            ))}
          </div>
        )}

        {/* Primary Row: Swipeable Horizontal Edit Options */}
        {showTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              overflowX: "auto",
              whiteSpace: "nowrap",
              borderBottom: "1px solid #f1f5f9",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            className="no-scrollbar"
          >
            {/* Bold Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                try {
                  document.execCommand("bold");
                  setSelectionFormat(prev => ({ ...prev, bold: document.queryCommandState("bold") }));
                } catch (err) { }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: selectionFormat.bold ? "#e0f2fe" : "transparent",
                color: selectionFormat.bold ? "#0369a1" : "#475569",
                border: "none",
                borderRadius: 8,
                minWidth: "46px",
                height: "44px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              title="Bold"
            >
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: selectionFormat.bold ? "#bae6fd" : "#f1f5f9",
                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center"
              }}>
                <Bold size={13} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700 }}>Bold</span>
            </button>

            {/* Underline Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                try {
                  document.execCommand("underline");
                  setSelectionFormat(prev => ({ ...prev, underline: document.queryCommandState("underline") }));
                } catch (err) { }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: selectionFormat.underline ? "#e0f2fe" : "transparent",
                color: selectionFormat.underline ? "#0369a1" : "#475569",
                border: "none",
                borderRadius: 8,
                minWidth: "46px",
                height: "44px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              title="Underline"
            >
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: selectionFormat.underline ? "#bae6fd" : "#f1f5f9",
                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center"
              }}>
                <Underline size={13} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700 }}>Underline</span>
            </button>

            <div style={{ width: 1, height: 24, background: "#cbd5e1", flexShrink: 0, margin: "0 2px" }} />

            {/* Alignment: Center */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                document.execCommand("justifyCenter");
              }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                background: selectionFormat.align === "center" ? "#ffedd5" : "transparent",
                color: selectionFormat.align === "center" ? "#c2410c" : "#475569",
                border: "none", borderRadius: 8, minWidth: "46px", height: "44px", cursor: "pointer", transition: "all 0.15s",
              }}
              title="Center"
            >
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: selectionFormat.align === "center" ? "#fed7aa" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlignCenter size={13} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700 }}>Center</span>
            </button>

            {/* Alignment: Justify */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                document.execCommand("justifyFull");
              }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                background: selectionFormat.align === "justify" ? "#ffedd5" : "transparent",
                color: selectionFormat.align === "justify" ? "#c2410c" : "#475569",
                border: "none", borderRadius: 8, minWidth: "46px", height: "44px", cursor: "pointer", transition: "all 0.15s",
              }}
              title="Justify"
            >
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: selectionFormat.align === "justify" ? "#fed7aa" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlignJustify size={13} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700 }}>Justify</span>
            </button>

            <div style={{ width: 1, height: 24, background: "#cbd5e1", flexShrink: 0, margin: "0 2px" }} />

            {/* Table Insert Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setShowTableModal(true);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: showTableModal ? "#f0fdf4" : "transparent",
                color: showTableModal ? "#15803d" : "#475569",
                border: "none",
                borderRadius: 8,
                minWidth: "46px",
                height: "44px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: showTableModal ? "#bbf7d0" : "#f1f5f9",
                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center"
              }}>
                <Table size={13} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700 }}>Table</span>
            </button>

            {/* Spacing Selector Toggle */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setShowSpacingOptions(prev => !prev);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: showSpacingOptions ? "#faf5ff" : "transparent",
                color: showSpacingOptions ? "#7e22ce" : "#475569",
                border: "none",
                borderRadius: 8,
                minWidth: "46px",
                height: "44px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: showSpacingOptions ? "#f3e8ff" : "#f1f5f9",
                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center"
              }}>
                <BetweenHorizontalStart size={13} style={{ transform: "rotate(90deg)" }} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700 }}>Spacing</span>
            </button>

            {/* Ruler Toggle Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setShowRuler(prev => !prev);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: showRuler ? "#f0f9ff" : "transparent",
                color: showRuler ? "#0369a1" : "#475569",
                border: "none",
                borderRadius: 8,
                minWidth: "46px",
                height: "44px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: showRuler ? "#e0f2fe" : "#f1f5f9",
                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center"
              }}>
                <Ruler size={13} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700 }}>Ruler</span>
            </button>
          </motion.div>
        )}

        {/* Secondary Row: Primary Operations Sub-bar (Preview & Export PDF) - Ultra-Compact Style */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 12px 10px",
            borderTop: "1px solid #f1f5f9",
            background: "#ffffff",
          }}
        >

          <button
            onClick={() => setShowTableModal(true)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "transparent",
              color: "#475569",
              border: "none",
              borderRadius: 8,
              minWidth: "46px",
              height: "44px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Table size={13} />
            </div>

            <span style={{ fontSize: 9, fontWeight: 700 }}>
              Table
            </span>
          </button>
          {/* Format Toggle Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              setShowTools(prev => !prev);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: showTools ? "#e0f2fe" : "#f1f5f9",
              color: showTools ? "#0369a1" : "#475569",
              border: "1px solid",
              borderColor: showTools ? "#bae6fd" : "#cbd5e1",
              borderRadius: "10px",
              padding: "7px 12px",
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            title="Formatting & Spacing Tools"
          >
            <Ruler size={16} style={{ marginRight: showTools ? 4 : 0 }} />
            {showTools && <span style={{ fontSize: 12, fontWeight: 700 }}>Hide Tools</span>}
          </button>

          {/* Reset Layout Button */}
          <button
            onClick={handleResetLayout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "#f8fafc",
              color: "#64748b",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "7px 12px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              flex: 1,
              transition: "background 0.15s, transform 0.1s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            onClick={handlePreview}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "#f8fafc",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "7px 16px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              flex: 1,
              transition: "background 0.15s, transform 0.1s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <Eye size={14} /> Preview
          </button>

          <button
            onClick={() => setShowPaperModal(true)}
            disabled={exportingPDF || isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "#9b1c31",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "7px 16px",
              fontWeight: 700,
              fontSize: 12,
              cursor: exportingPDF ? "not-allowed" : "pointer",
              flex: 1.2,
              boxShadow: "0 4px 12px rgba(155,28,49,0.3)",
              opacity: exportingPDF ? 0.7 : 1,
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            {exportingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exportingPDF ? "Generating…" : "Export PDF"}
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
              transform: `translateX(${(window.innerWidth - (A4_W * previewScale)) / 2}px) scale(${previewScale})`,
              marginBottom: `-${A4_W * (1 - previewScale)}px`,
            }}>
              <div
                className={`legal-doc-container ${perfectAlign ? "perfect-left-align" : ""} ${isTwoColumns ? "two-columns-layout" : ""} ${globalAlign ? `global-align-${globalAlign}` : ""}`}
                style={{
                  "--document-line-spacing": lineSpacing || "inherit",
                  "--document-left-margin": `${leftMargin}px`,
                  "--document-right-margin": `${rightMargin}px`,
                } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {showTableModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: 380,
              borderRadius: 8,
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              border: "1px solid #d1d5db",
              fontFamily: "Segoe UI, sans-serif",
            }}
          >
            <h2
              style={{
                fontSize: 28,
                fontWeight: 400,
                marginBottom: 24,
              }}
            >
              Insert Table
            </h2>

            <div
              style={{
                fontSize: 14,
                color: "#666",
                borderBottom: "1px solid #ddd",
                paddingBottom: 6,
                marginBottom: 16,
              }}
            >
              Table size
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Number of columns:
              </label>

              <input
                type="number"
                min={1}
                value={tableCols}
                onChange={(e) => setTableCols(Number(e.target.value) || 1)}
                style={{
                  width: "100%",
                  height: 38,
                  border: "1px solid #bfc5d2",
                  borderRadius: 4,
                  padding: "0 10px",
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Number of rows:
              </label>

              <input
                type="number"
                min={1}
                value={tableRows}
                onChange={(e) => setTableRows(Number(e.target.value) || 1)}
                style={{
                  width: "100%",
                  height: 38,
                  border: "1px solid #bfc5d2",
                  borderRadius: 4,
                  padding: "0 10px",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 14,
                color: "#666",
                borderBottom: "1px solid #ddd",
                paddingBottom: 6,
                marginBottom: 16,
              }}
            >
              AutoFit behavior
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "flex", gap: 8 }}>
                <input
                  type="radio"
                  checked={tableFit === "fixed"}
                  onChange={() => setTableFit("fixed")}
                />
                Fixed column width
              </label>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "flex", gap: 8 }}>
                <input
                  type="radio"
                  checked={tableFit === "content"}
                  onChange={() => setTableFit("content")}
                />
                AutoFit to contents
              </label>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "flex", gap: 8 }}>
                <input
                  type="radio"
                  checked={tableFit === "window"}
                  onChange={() => setTableFit("window")}
                />
                AutoFit to window
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setShowTableModal(false)}
                style={{
                  padding: "8px 18px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  borderRadius: 4,
                }}
              >
                Cancel
              </button>

              <button
                onClick={insertTable}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  borderRadius: 4,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPaperModal && <PaperSizeModal onSelect={handlePaperSelect} onCancel={() => setShowPaperModal(false)} />}

        {showTableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15,23,42,0.4)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: "24px",
                width: "100%",
                maxWidth: "340px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Insert Table</h3>
                <button
                  onClick={() => setShowTableModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                {/* Columns Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Number of Columns</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setTableCols(prev => Math.max(1, prev - 1))}
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: "1px solid #cbd5e1",
                        background: "#f8fafc", color: "#334155", fontSize: 16, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={tableCols}
                      onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        flex: 1, height: 36, borderRadius: 8, border: "1px solid #cbd5e1",
                        textAlign: "center", fontSize: 15, fontWeight: 600, color: "#1e293b",
                        outline: "none"
                      }}
                    />
                    <button
                      onClick={() => setTableCols(prev => Math.min(10, prev + 1))}
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: "1px solid #cbd5e1",
                        background: "#f8fafc", color: "#334155", fontSize: 16, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Rows Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Number of Rows</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setTableRows(prev => Math.max(1, prev - 1))}
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: "1px solid #cbd5e1",
                        background: "#f8fafc", color: "#334155", fontSize: 16, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={tableRows}
                      onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        flex: 1, height: 36, borderRadius: 8, border: "1px solid #cbd5e1",
                        textAlign: "center", fontSize: 15, fontWeight: 600, color: "#1e293b",
                        outline: "none"
                      }}
                    />
                    <button
                      onClick={() => setTableRows(prev => Math.min(20, prev + 1))}
                      style={{
                        width: 36, height: 36, borderRadius: 8, border: "1px solid #cbd5e1",
                        background: "#f8fafc", color: "#334155", fontSize: 16, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowTableModal(false)}
                  style={{
                    flex: 1, height: 40, borderRadius: 10, border: "1px solid #cbd5e1",
                    background: "#ffffff", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={insertTableAtCursor}
                  style={{
                    flex: 1, height: 40, borderRadius: 10, border: "none",
                    background: "#0f766e", color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(15,110,105,0.2)"
                  }}
                >
                  Insert Table
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}