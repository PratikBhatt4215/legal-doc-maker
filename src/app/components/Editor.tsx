import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import { Download, Loader2, Eye, FileText, X, Printer, Mic, MicOff, Bold, Underline, AlignCenter, AlignJustify, Table, Ruler, BetweenHorizontalStart, RotateCcw, Trash, Plus, Minus, Rows3, Columns3, Save, Undo2, ArrowRightToLine } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { storage } from "../../lib/storage";
import { toast } from "sonner";
import { TopNavBar } from "./TopNavBar";
import { saveDraft } from "../../lib/draftStorage";
import { getTemplateById } from "../../lib/templateRegistry";
import { generatePDF, type PaperSize } from "../../lib/pdfGenerator";
import { savePDFExport } from "../../lib/pdfStorage";
import "../../styles/legal-document.css";

interface EditorProps {
  formId: string;
  initialContent?: string;  // when opening a saved draft
  draftId?: string;         // when overwriting an existing draft
  customFile?: File | Blob;
  customFileName?: string;
  onBack: () => void;
  onExportPDF: (onSuccess: () => void) => void;
}

const A4_W = 794;

function wireEditableField(span: HTMLElement) {
  if ((span as any)._wired) return;
  (span as any)._wired = true;

  span.contentEditable = "true";
  span.setAttribute("spellcheck", "false");
  // Re-enable selection and caret inside editable spans (overrides article's user-select:none)
  span.style.userSelect = "text";
  (span.style as any).webkitUserSelect = "text";
  span.style.caretColor = "#111";

  // Initialize classes based on actual content (handles restored drafts and paginated fields)
  const isTdField = span.classList.contains("td-field");
  const currentText = span.textContent || "";
  if (isTdField) {
    if (currentText.length > 0 && currentText !== span.dataset.placeholder) {
      span.classList.remove("is-empty");
      span.classList.add("has-value");
      span.style.removeProperty("padding-right");
    } else {
      span.classList.add("is-empty");
      span.classList.remove("has-value");
    }
  } else {
    const text = currentText.replace(/\u200B/g, "").trim();
    const hasText = text.length > 0;
    span.classList.toggle("is-empty", !hasText);
    span.classList.toggle("has-value", hasText);
    if (hasText) {
      span.style.removeProperty("padding-right");
    } else if (span.dataset.placeholder) {
      const w = Math.max(60, Math.round(span.dataset.placeholder.length * 5.5));
      span.style.setProperty("padding-right", `${w}px`, "important");
    }
  }

  span.addEventListener("paste", e => {
    e.preventDefault();
    toast.error("Pasting is restricted inside the editor.");
  });

  span.addEventListener("focus", () => {
    // Only force caret position to the end for empty fields (no user text entered yet)
    if (!span.classList.contains("is-empty")) return;

    const sel = window.getSelection();
    if (sel) {
      // Small defer so Android keyboard has time to register the focus
      requestAnimationFrame(() => {
        if (!span.classList.contains("is-empty")) return;
        const range = document.createRange();
        let textNode = span.firstChild;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
          // CRITICAL: Must use \u200B (zero-width space), NOT empty string ""
          // An empty text node has no physical position for the caret to land on,
          // so Android falls back to the nearest text it finds — the static word next to it.
          textNode = document.createTextNode("\u200B");
          span.innerHTML = "";
          span.appendChild(textNode);
        }
        range.setStart(textNode, textNode.textContent?.length || 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      });
    }
  });

  span.addEventListener("blur", () => {
    const isTdField = span.classList.contains("td-field");
    const currentText = (span.textContent || "").trim();
    if (isTdField) {
      if (currentText === "") {
        span.textContent = "\u200B";
        span.classList.add("is-empty");
        span.classList.remove("has-value");
      }
    } else {
      const cleaned = currentText.replace(/\u200B/g, "").replace(/\uFEFF/g, "").trim();
      if (cleaned === "") {
        span.textContent = "\u200B"; // Truly empty look — CSS handles layout size
        span.classList.add("is-empty");
        span.classList.remove("has-value");
        if (span.dataset.placeholder) {
          const w = Math.max(60, Math.round(span.dataset.placeholder.length * 5.5));
          span.style.setProperty("padding-right", `${w}px`, "important");
        }
      }
    }
  });

  span.addEventListener("input", () => {
    const isTdField = span.classList.contains("td-field");
    // Strip any zero-width spaces injected by Android/browser so isEmpty check is accurate
    const raw = span.textContent || "";
    const cleaned = raw.replace(/\u200B/g, "").replace(/\uFEFF/g, "");
    const hasText = cleaned.trim().length > 0;

    span.classList.toggle("is-empty", !hasText);
    span.classList.toggle("has-value", hasText);

    if (hasText) {
      span.style.removeProperty("padding-right");
    } else {
      if (isTdField) {
        span.textContent = "\u200B";
      } else if (span.dataset.placeholder) {
        const w = Math.max(60, Math.round(span.dataset.placeholder.length * 5.5));
        span.style.setProperty("padding-right", `${w}px`, "important");
      }
    }
  });

  span.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Backspace") {
      const isTdField = span.classList.contains("td-field");
      if (!isTdField) {
        const text = (span.textContent || "").replace(/\u200B/g, "");
        if (text === "") {
          e.preventDefault();
          const parent = span.parentNode;
          if (parent) {
            let prev = span.previousSibling;
            if (!prev) {
              prev = document.createTextNode("");
              parent.insertBefore(prev, span);
            }
            span.remove(); // Remove empty field span from DOM
            const range = document.createRange();
            const sel = window.getSelection();
            if (sel) {
              if (prev.nodeType === Node.TEXT_NODE) {
                range.setStart(prev, prev.textContent?.length || 0);
              } else {
                range.setStartAfter(prev);
              }
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  });
}

function mergeAdjacentDotTextNodes(container: HTMLElement): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    textNodes.push(n as Text);
  }

  // Improved dot character test including spaces and non-breaking spaces
  const isDotChar = (char: string) => /^[.…_\s\u00A0]$/.test(char);

  for (let i = textNodes.length - 1; i > 0; i--) {
    const current = textNodes[i];
    const prev = textNodes[i - 1];

    const currentText = current.textContent || "";
    const prevText = prev.textContent || "";

    const currentIsDot = currentText.length > 0 && Array.from(currentText).every(isDotChar);
    const prevIsDot = prevText.length > 0 && Array.from(prevText).every(isDotChar);

    if (currentIsDot && prevIsDot) {
      const hasActualDots = /[.…_]/.test(currentText) || /[.…_]/.test(prevText);
      if (hasActualDots) {
        const p1 = current.parentElement?.closest("p, div, td, li, article");
        const p2 = prev.parentElement?.closest("p, div, td, li, article");
        if (p1 && p1 === p2) {
          prev.textContent = prevText + currentText;
          
          const parent = current.parentNode;
          current.remove();
          
          let ancestor = parent;
          while (ancestor && ancestor !== container && ancestor.childNodes.length === 0) {
            const nextAncestor = ancestor.parentNode;
            ancestor.remove();
            ancestor = nextAncestor;
          }
        }
      }
    }
  }
}

function getTextBetween(nodeA: Node, nodeB: Node, ancestor: Node): string {
  let text = "";
  let started = false;
  let finished = false;

  const traverse = (current: Node): void => {
    if (finished) return;
    if (current === nodeA) {
      started = true;
      return;
    }
    if (current === nodeB) {
      finished = true;
      return;
    }

    if (started && current.nodeType === Node.TEXT_NODE) {
      text += current.textContent || "";
    }

    for (let i = 0; i < current.childNodes.length; i++) {
      traverse(current.childNodes[i]);
    }
  };

  traverse(ancestor);
  return text;
}

function mergeAdjacentFields(container: HTMLElement): void {
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
          const textBetweenRaw = getTextBetween(current, next, p1);
          const textBetween = textBetweenRaw.trim().replace(/\u00A0/g, "").replace(/\s+/g, "");

          if (textBetween === "") {
            // Merging next into current!
            const ph1 = current.dataset.placeholder || "";
            const ph2 = next.dataset.placeholder || "";
            current.dataset.placeholder = ph1 + ph2;

            current.textContent = (current.textContent || "") + (next.textContent || "");

            // Re-initialize class values properly
            const text = current.textContent.replace(/\u200B/g, "").trim();
            const hasText = text.length > 0;
            current.classList.toggle("is-empty", !hasText);
            current.classList.toggle("has-value", hasText);

            next.parentNode?.removeChild(next);
            changed = true;
            break;
          }
        } catch (err) {
          console.error("DOM traversal merge error:", err);
        }
      }
    }
  }
}

function mergeAdjacentPlaceholderSpans(container: HTMLElement): void {
  let changed = true;
  while (changed) {
    changed = false;
    const spans = Array.from(container.querySelectorAll("span"));
    for (let i = 0; i < spans.length - 1; i++) {
      const current = spans[i];
      const next = spans[i + 1];
      if (!current.parentNode || !next.parentNode) continue;
      if (current.parentNode !== next.parentNode) continue; // direct siblings

      const t1 = current.textContent || "";
      const t2 = next.textContent || "";
      
      const isPlaceholder1 = /^[.…_\s\u00A0]*$/.test(t1) && t1.trim().length > 0;
      const isPlaceholder2 = /^[.…_\s\u00A0]*$/.test(t2) && t2.trim().length > 0;

      if (isPlaceholder1 && isPlaceholder2) {
        current.textContent = t1 + t2;
        next.remove();
        changed = true;
        break;
      }
    }
  }
}

function injectAndWire(container: HTMLElement): void {
  // Merge fragmented placeholder spans first so they form a single field
  mergeAdjacentPlaceholderSpans(container);

  // Convert spaces-only styled underlines (from MS Word templates) to editable fields
  container.querySelectorAll("span").forEach(span => {
    if (span.classList.contains("legal-editable-field")) return;

    const style = span.getAttribute("style") || "";
    const hasDottedUnderline = /text-decoration|border-bottom/i.test(style) && /dot|dash|underline/i.test(style);
    const hasUnderlineClass = Array.from(span.classList).some(c => /underline|border/i.test(c));

    if (hasDottedUnderline || hasUnderlineClass) {
      const text = (span.textContent || "").replace(/\u200B/g, "");
      // If the span contains only spaces, dots, or underscores, and is at least 3 characters long
      if (/^[.…_\s\u00A0]*$/.test(text) && text.length >= 3) {
        span.className = "legal-editable-field is-empty";
        span.dataset.fieldId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        span.dataset.placeholder = text;
        span.textContent = "\u200B"; // Zero-width space so browser resolves caret inside the span on click
        
        
        // Strip the underline/border styles from this span and ALL wrapper ancestors
        span.style.textDecoration = "none";
        span.style.borderBottom = "";

        let ancestor = span.parentNode;
        while (ancestor && ancestor.nodeType === Node.ELEMENT_NODE && ancestor !== container) {
          const el = ancestor as HTMLElement;
          if (el.tagName === "ARTICLE") break;
          el.style.textDecoration = "none";
          el.style.borderBottom = "none";
          el.classList.remove("docx-underline");
          ancestor = ancestor.parentNode;
        }
      }
    }
  });

  // Merge fragmented dotted line elements first
  mergeAdjacentDotTextNodes(container);

  // Normalize the container first to merge any adjacent text nodes.
  container.normalize();

  const dotPattern = /((?:\.[ \u00A0]*){3,}|(?:\u2026[ \u00A0]*){3,}|(?:_[ \u00A0]*){3,})/g;
  const testPattern = /((?:\.[ \u00A0]*){3,}|(?:\u2026[ \u00A0]*){3,}|(?:_[ \u00A0]*){3,})/; // stateless non-global pattern to prevent lastIndex bug!

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
    const parts = text.split(dotPattern);
    if (parts.length <= 1) return;

    const frag = document.createDocumentFragment();

    parts.forEach((part, partIdx) => {
      const isBlankField = /^(?:\.[ \u00A0]*){3,}$|^(?:\u2026[ \u00A0]*){3,}$|^(?:_[ \u00A0]*){3,}$/.test(part);
      if (isBlankField) {
        const span = document.createElement("span");
        const isInTable = parent && typeof (parent as any).closest === "function"
          ? (parent as any).closest("table") !== null
          : false;
        span.className = isInTable ? "legal-editable-field is-empty td-field" : "legal-editable-field is-empty";
        span.dataset.fieldId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        span.dataset.placeholder = isInTable ? "" : part;
        span.textContent = "\u200B"; // Zero-width space so browser resolves caret inside the span on click

        // Strip text-decoration and borders from all wrapper ancestors up the tree
        let ancestor = parent;
        while (ancestor && ancestor.nodeType === Node.ELEMENT_NODE && ancestor !== container) {
          const el = ancestor as HTMLElement;
          if (el.tagName === "ARTICLE") break;
          el.style.textDecoration = "none";
          el.style.borderBottom = "none";
          el.style.borderBottomWidth = "0px";
          el.classList.remove("docx-underline");
          ancestor = ancestor.parentNode;
        }

        // Dynamic width using padding-right so each dotted field has an appropriate visible width
        // in inline display mode, avoiding the inline-block caret placement bug
        if (!isInTable) {
          const w = Math.max(60, Math.round(part.length * 5.5));
          span.style.setProperty("padding-right", `${w}px`, "important");
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
      span.dataset.fieldId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      span.dataset.placeholder = "";
      span.textContent = "\u200B";
      td.appendChild(span);
    }
  });

  // Merge adjacent editable fields to avoid multiple inputs for a single dotted line!
  mergeAdjacentFields(container);

  // Wire up all editable fields (both existing/restored and newly created)
  container.querySelectorAll(".legal-editable-field").forEach(field => {
    wireEditableField(field as HTMLElement);
  });

  // Lock the document to prevent copying, cutting, and pasting
  lockDocument(container);
}

function lockDocument(container: HTMLElement) {
  if ((container as any)._locked) return;
  (container as any)._locked = true;

  container.addEventListener("contextmenu", e => e.preventDefault());
  container.addEventListener("selectstart", e => {
    const target = e.target as HTMLElement;
    if (target && !target.isContentEditable && typeof target.closest === "function" && !target.closest("[contenteditable='true']")) {
      e.preventDefault();
    }
  });
  
  container.addEventListener("copy", e => {
    e.preventDefault();
    toast.error("Copying is restricted inside the editor.");
  });

  container.addEventListener("cut", e => {
    e.preventDefault();
    toast.error("Cutting is restricted inside the editor.");
  });

  container.addEventListener("paste", e => {
    e.preventDefault();
    toast.error("Pasting is restricted inside the editor.");
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
  // Remove all previously-split sections first so we re-paginate from scratch
  // (keeps only the first section per original docx page wrapper)
  const allSections = Array.from(
    container.querySelectorAll(".docx-wrapper > section.docx, section.docx")
  ) as HTMLElement[];

  // Collect only "original" sections (those without data-split marker)
  const originalSections: HTMLElement[] = [];
  for (const sec of allSections) {
    if (sec.dataset.split === "1") {
      // Merge its article children back into the previous original section's article before removing
      const prevOrig = originalSections[originalSections.length - 1];
      if (prevOrig) {
        const prevArticle = prevOrig.querySelector("article");
        const thisArticle = sec.querySelector("article");
        if (prevArticle && thisArticle) {
          while (thisArticle.firstChild) {
            prevArticle.appendChild(thisArticle.firstChild);
          }
        }
      }
      sec.remove();
    } else {
      originalSections.push(sec);
    }
  }

  // Now paginate each original section fresh
  for (const sec of originalSections) {
    paginateSection(sec);
  }

  // CRITICAL: Re-apply article styles on all pages (original + split ones)
  container.querySelectorAll("article").forEach(article => {
    const el = article as HTMLElement;
    el.contentEditable = "false";
    el.spellcheck = false;
    el.style.cursor = "default";
    el.style.outline = "none";
    el.style.caretColor = "transparent"; // hide caret on static article areas
    el.style.userSelect = "none";         // block text selection in static areas
    (el.style as any).webkitUserSelect = "none"; // iOS/Android Chrome
  });

  // CRITICAL: Re-wire all fields in the entire container so event listeners
  // are active on split/cloned pages (since cloneNode does not copy event listeners)
  container.querySelectorAll(".legal-editable-field").forEach(field => {
    wireEditableField(field as HTMLElement);
  });
}

// A4 page usable height in CSS pixels at 96dpi (≈ 297mm → 1122px) minus top+bottom padding (96px)
const A4_CONTENT_HEIGHT_PX = 1026;

function hasPageBreak(el: HTMLElement): boolean {
  if (!el) return false;
  if (el.classList.contains("docx-page-break") || el.classList.contains("last-rendered-page-break")) return true;
  if (el.tagName === "BR" && (el.style.pageBreakBefore === "always" || el.style.pageBreakAfter === "always")) return true;
  
  const style = el.style;
  if (style.pageBreakBefore === "always" || style.breakBefore === "page" || style.pageBreakAfter === "always" || style.breakAfter === "page") {
    return true;
  }
  
  if (el.querySelector(".docx-page-break") || el.querySelector(".last-rendered-page-break")) return true;
  
  const innerBrs = el.querySelectorAll("br, span, div, p");
  for (let i = 0; i < innerBrs.length; i++) {
    const item = innerBrs[i] as HTMLElement;
    if (item.classList.contains("docx-page-break") || item.classList.contains("last-rendered-page-break")) return true;
    if (item.style.pageBreakBefore === "always" || item.style.pageBreakAfter === "always" || item.style.breakBefore === "page" || item.style.breakAfter === "page") {
      return true;
    }
  }

  return false;
}

function paginateSection(section: HTMLElement) {
  const article = section.querySelector("article");
  if (!article) return;

  // Use offsetTop of article relative to the section for layout-accurate (unscaled) measurements
  const articleOffsetTop = (article as HTMLElement).offsetTop || 0;
  const maxBottom = articleOffsetTop + A4_CONTENT_HEIGHT_PX;

  const children = Array.from(article.children) as HTMLElement[];
  let splitIndex = -1;
  let tableSplitRowIndex = -1;
  let splitTableElement: HTMLTableElement | null = null;
  let hasKeptSomething = false;

  for (let j = 0; j < children.length; j++) {
    const child = children[j];
    // Use offsetTop + offsetHeight (layout-relative, unaffected by CSS transform)
    const childBottom = child.offsetTop + child.offsetHeight;

    if (child.offsetHeight === 0) continue;

    // Detect manual page breaks (only if it is not the very first element on the page)
    const isManualBreak = j > 0 && hasPageBreak(child);

    if (isManualBreak || childBottom > maxBottom) {
      if (!hasKeptSomething && !isManualBreak) {
        hasKeptSomething = true;
        continue;
      }

      if (child.tagName === "TABLE") {
        const table = child as HTMLTableElement;
        const rows = Array.from(table.querySelectorAll("tr")) as HTMLTableRowElement[];
        const tableOffsetTop = table.offsetTop;
        let keptRow = false;

        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const rowBottom = tableOffsetTop + row.offsetTop + row.offsetHeight;
          if (rowBottom > maxBottom) {
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
    newSection.dataset.split = "1"; // mark as a split page
    const newArticle = newSection.querySelector("article");
    newSection.innerHTML = ""; // Strip any duplicated sibling elements outside article to fix floating ghost boxes
    if (newArticle) {
      newArticle.innerHTML = "";
      newSection.appendChild(newArticle);
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

function PaperSizeModal({ onSelect, onCancel }: { onSelect: (s: PaperSize, p?: string) => void; onCancel: () => void }) {
  const [pages, setPages] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
        <div className="flex items-center justify-between mb-6">
          <p className="text-2xl mb-1 opacity-90">Welcome to</p>
          <h2 className="text-2xl font-bold">Legal Docs Maker</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Pages to Export (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. 1, 2-5, or leave empty for all" 
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#1e3a5f]"
          />
          <p className="text-xs text-gray-400 mt-1">Leave empty to export all pages.</p>
        </div>

        <div className="space-y-3">
          <button onClick={() => onSelect("a4", pages)} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#1e3a5f] rounded-2xl transition-all group">
            <div className="w-10 h-14 border-2 border-gray-300 group-hover:border-[#1e3a5f] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <Printer className="w-5 h-5 text-gray-400 group-hover:text-[#1e3a5f]" />
            </div>
            <div className="text-left"><p className="font-bold text-[#1e3a5f]">A4 Size</p><p className="text-sm text-gray-500">210 × 297 mm</p></div>
          </button>
          <button onClick={() => onSelect("legal", pages)} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#9b1c31] rounded-2xl transition-all group">
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
        // Limit left margin between 0px and 600px
        const newLeft = Math.min(600, Math.max(0, Math.round(localX)));
        onLeftMarginChange(newLeft);
      } else {
        const clientX = rect.right - moveEvent.clientX;
        const localX = clientX / currentScale;
        // Limit right margin between 0px and 600px
        const newRight = Math.min(600, Math.max(0, Math.round(localX)));
        onRightMarginChange(newRight);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      try { handle.releasePointerCapture(upEvent.pointerId); } catch(e){}
      isDraggingRef.current = false; // Re-enable panning
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
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

    let cachedViewportW = 0;
    let cachedViewportH = 0;
    let cachedContentH = 0;

    function dist(t1: { x: number, y: number }, t2: { x: number, y: number }) {
      return Math.hypot(t2.x - t1.x, t2.y - t1.y);
    }
    function mid(t1: { x: number, y: number }, t2: { x: number, y: number }) {
      return { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
    }

    function clampPosition(x: number, y: number, scale: number) {
      const vw = cachedViewportW || viewport!.clientWidth;
      const vh = cachedViewportH || viewport!.clientHeight;
      const scaledW = A4_W * scale;
      const scaledH = (cachedContentH || content!.scrollHeight) * scale;

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
        maxY = 40; // Allow 40px positive pull so top of page 1 is always accessible
      } else {
        minY = Math.min(0, (vh - scaledH) / 2);
        maxY = Math.max(0, (vh - scaledH) / 2);
      }

      return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      };
    }

    let touchedInputField = false;

    function onTouchStart(e: TouchEvent) {
      const touchTarget = e.target as HTMLElement;
      if (touchTarget && touchTarget.closest(".legal-editable-field")) {
        touchedInputField = true;
        return;
      }
      touchedInputField = false;
      cancelAnimationFrame(rafId);
      velX = 0; velY = 0;
      
      cachedViewportW = viewport!.clientWidth;
      cachedViewportH = viewport!.clientHeight;
      cachedContentH = content!.scrollHeight;

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
      if (touchedInputField) return;
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
      if (touchedInputField) {
        if (e.touches.length === 0) touchedInputField = false;
        return;
      }
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

    const handleNativeScroll = (e: Event) => {
      if (viewport.scrollTop !== 0) viewport.scrollTop = 0;
      if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: true });
    viewport.addEventListener("scroll", handleNativeScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      viewport.removeEventListener("scroll", handleNativeScroll);
    };
  }, [viewportRef, contentRef, applyTransform, isDraggingRef]);

  const scrollToElement = useCallback((el: HTMLElement) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!el || !viewport || !content) return;

    let obj: HTMLElement | null = el;
    let fieldTop = 0;
    while (obj && obj !== content) {
      fieldTop += obj.offsetTop;
      obj = obj.offsetParent as HTMLElement;
    }

    const currentState = stateRef.current;
    const targetScale = Math.max(0.85, currentState.scale);
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    const targetY = -(fieldTop * targetScale) + (vh * 0.22);
    const targetX = (vw - A4_W * targetScale) / 2;

    const scaledH = content.scrollHeight * targetScale;
    const minY = scaledH > vh ? vh - scaledH - 120 : Math.min(0, (vh - scaledH) / 2);
    const maxY = scaledH > vh ? 40 : Math.max(0, (vh - scaledH) / 2);
    const clampedY = Math.min(Math.max(targetY, minY), maxY);

    const scaledW = A4_W * targetScale;
    const minX = scaledW > vw ? vw - scaledW : (vw - scaledW) / 2;
    const maxX = scaledW > vw ? 0 : (vw - scaledW) / 2;
    const clampedX = Math.min(Math.max(targetX, minX), maxX);

    applyTransform(clampedX, clampedY, targetScale, true);
  }, [viewportRef, contentRef, applyTransform]);

  return { applyTransform, stateRef, scrollToElement };
}

export function Editor({ formId, initialContent, draftId, customFile, customFileName, onBack, onExportPDF }: EditorProps) {
  const isHi = storage.loadLanguage() === "hi";
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
  const [inTableNode, setInTableNode] = useState<HTMLTableElement | null>(null);
  const [inTableCellNode, setInTableCellNode] = useState<HTMLTableCellElement | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showTableEditMenu, setShowTableEditMenu] = useState(false);
  const [tableRows, setTableRows] = useState<string>("2");
  const [tableCols, setTableCols] = useState<string>("5");
  const [tableFit, setTableFit] = useState("fixed");
  const [fontSize, setFontSize] = useState<number | "">("");
  const [focusedField, setFocusedField] = useState<HTMLElement | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(draftId);
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

  // Track rich-text command states + selected paragraph for ruler (NO table detection here)
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
            while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
            let el = node as HTMLElement | null;
            while (el && !["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI"].includes(el.tagName)) {
              el = el.parentElement;
            }
            if (el && docxRef.current?.contains(el)) {
              selectedParaRef.current = el;
            } else {
              selectedParaRef.current = null;
            }

            // Track active editable field
            let activeField: HTMLElement | null = null;
            let field = node as HTMLElement | null;
            while (field && field !== docxRef.current) {
              if (field.classList.contains("legal-editable-field")) {
                activeField = field;
                break;
              }
              field = field.parentElement;
            }
            setFocusedField(activeField);
            if (activeField) {
              const inlineSize = activeField.style.fontSize;
              if (inlineSize) {
                const val = parseFloat(inlineSize);
                if (!isNaN(val)) setFontSize(Math.round(val));
              } else {
                const comp = window.getComputedStyle(activeField).fontSize;
                const px = parseFloat(comp);
                if (!isNaN(px)) setFontSize(Math.round(px * 0.75));
              }
            } else {
              setFontSize("");
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

  // SOLE table detection: touchend on the viewport
  // selectionchange is NOT used for table detection at all — it caused race conditions
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !docxRef.current) return;
      const tableEl = target.closest("table") as HTMLTableElement | null;
      const tdEl = target.closest("td") as HTMLTableCellElement | null;
      if (tableEl && docxRef.current.contains(tableEl)) {
        setInTableNode(tableEl);
        setInTableCellNode(tdEl);
      } else {
        setInTableNode(null);
        setInTableCellNode(null);
      }
    };

    viewport.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => viewport.removeEventListener("touchend", handleTouchEnd);
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
  // Snapshot of the clean HTML right after first render (blank template or opened draft)
  // Reset always restores from this — no re-fetch needed
  const originalHtmlRef = useRef<string | null>(null);
  const hasSnapshottedRef = useRef(false);
  // Guard: prevent re-fetching/re-rendering the template when other state changes
  const hasRenderedRef = useRef(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const docxRef = useRef<HTMLDivElement>(null);

  // ── Custom Undo/Redo State Stack ───────────────────────────────────
  const undoStackRef = useRef<string[]>([]);
  const isRestoringRef = useRef(false);
  const inputDebounceTimerRef = useRef<any>(null);

  const saveToUndoStack = () => {
    if (isRestoringRef.current) return;
    const container = docxRef.current;
    if (!container) return;

    const currentHTML = container.innerHTML;
    // Only push if different from the top of the stack
    if (undoStackRef.current.length === 0 || undoStackRef.current[undoStackRef.current.length - 1] !== currentHTML) {
      undoStackRef.current.push(currentHTML);
      if (undoStackRef.current.length > 40) {
        undoStackRef.current.shift(); // Limit history size
      }
    }
  };

  const handleUndo = () => {
    const container = docxRef.current;
    if (!container) return;

    if (undoStackRef.current.length === 0) {
      toast.info("Nothing to undo.");
      return;
    }

    const currentHTML = container.innerHTML;
    let previousState = undoStackRef.current.pop();
    
    // If the popped state is the same as the current live HTML, pop the actual previous state
    if (previousState === currentHTML && undoStackRef.current.length > 0) {
      previousState = undoStackRef.current.pop();
    }

    if (previousState && previousState !== currentHTML) {
      isRestoringRef.current = true;
      container.innerHTML = previousState;

      // Re-wire all fields in the restored DOM
      container.querySelectorAll(".legal-editable-field").forEach(field => {
        (field as HTMLElement).dataset.wired = "1";
        wireEditableField(field as HTMLElement);
      });

      // Recalculate margins
      const firstSection = container.querySelector(".docx-wrapper > section.docx, section.docx") as HTMLElement;
      if (firstSection) {
        const computedStyle = window.getComputedStyle(firstSection);
        const computedLeft = parseFloat(computedStyle.paddingLeft);
        const computedRight = parseFloat(computedStyle.paddingRight);
        if (!isNaN(computedLeft) && !isNaN(computedRight)) {
          setLeftMargin(computedLeft);
          setRightMargin(computedRight);
        }
      }
      
      const pc = container.querySelectorAll(".docx-wrapper > section.docx, section.docx").length || 1;
      setPageCount(pc);

      // Re-paginate
      schedulePagination(container);

      toast.success("Undone!");

      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    } else {
      toast.info("Nothing to undo.");
    }
  };

  const execFormatCommand = (command: string, value: string = "") => {
    saveToUndoStack();
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.error("Format execution error:", e);
    }
  };

  const template = getTemplateById(formId);
  const displayName = customFile ? (customFileName || "Custom Document") : (template?.name || "Legal Document");
  const displaySubtitle = customFile ? "Custom Uploaded File" : template?.description;

  // Pass the ref to the Pan/Zoom hook
  const { applyTransform, stateRef, scrollToElement } = useTouchPanZoom(viewportRef, contentRef, isDraggingRef);

  const getActiveFieldFontSize = (): number => {
    if (focusedField) {
      const inlineSize = focusedField.style.fontSize;
      if (inlineSize) {
        const val = parseFloat(inlineSize);
        if (!isNaN(val)) return Math.round(val);
      }
      const comp = window.getComputedStyle(focusedField).fontSize;
      const px = parseFloat(comp);
      if (!isNaN(px)) {
        return Math.round(px * 0.75);
      }
    }
    if (typeof fontSize === "number") return fontSize;
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && activeEl.classList.contains("legal-editable-field")) {
      const comp = window.getComputedStyle(activeEl).fontSize;
      const px = parseFloat(comp);
      if (!isNaN(px)) {
        return Math.round(px * 0.75); // Convert px to pt
      }
    }
    if (selectedParaRef.current) {
      const comp = window.getComputedStyle(selectedParaRef.current).fontSize;
      const px = parseFloat(comp);
      if (!isNaN(px)) {
        return Math.round(px * 0.75);
      }
    }
    return 12; // default fallback
  };

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

  // Screen Wake Lock to prevent screen sleep during active dictation (voice typing)
  useEffect(() => {
    let wakeLock: any = null;
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator.wakeLock as any).request('screen');
        }
      } catch (err) {
        console.warn("Wake lock failed:", err);
      }
    }
    if (isListening) {
      requestWakeLock();
    } else {
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
        }).catch(() => {});
      }
    }
    return () => {
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
        }).catch(() => {});
      }
    };
  }, [isListening]);

  useEffect(() => {
    const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
    const x = (window.innerWidth - A4_W * scale) / 2;
    applyTransform(x, 0, scale);
  }, [applyTransform]);

  useEffect(() => {
    if (!docxRef.current) return;

    const setupEditorBehaviors = () => {
        // Apply scale
        const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
        const x = (window.innerWidth - A4_W * scale) / 2;
        applyTransform(x, 0, scale);

        // Setup articles — completely block native caret from landing in static text
        docxRef.current!.querySelectorAll("article").forEach(article => {
          const el = article as HTMLElement;
          el.contentEditable = "false";
          el.spellcheck = false;
          el.style.cursor = "default";
          el.style.outline = "none";
          el.style.caretColor = "transparent"; // hide caret on static article areas
          el.style.userSelect = "none";         // block text selection in static areas
          (el.style as any).webkitUserSelect = "none"; // iOS/Android Chrome
        });

        // Merge adjacent editable fields first (handles loading existing/restored drafts)
        mergeAdjacentFields(docxRef.current!);

        // Wire up all editable fields
        docxRef.current!.querySelectorAll(".legal-editable-field").forEach(field => {
          wireEditableField(field as HTMLElement);
        });
    };

    const container = docxRef.current;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;
      const article = target.closest("article");
      if (!article) return;

      // Defer DOM read slightly — Android WebView may not have flushed textContent yet
      setTimeout(() => {
        // Update empty/filled styles for ALL fields in this article using cleaned check
        article.querySelectorAll(".legal-editable-field").forEach(field => {
          const f = field as HTMLElement;
          const raw = f.textContent || "";
          const cleaned = raw.replace(/\u200B/g, "").replace(/\uFEFF/g, "");
          const hasText = cleaned.trim().length > 0;
          f.classList.toggle("is-empty", !hasText);
          f.classList.toggle("has-value", hasText);

          if (hasText) {
            f.style.removeProperty("padding-right");
          } else {
            const isTdField = f.classList.contains("td-field");
            if (!isTdField && f.dataset.placeholder) {
              const w = Math.max(60, Math.round(f.dataset.placeholder.length * 5.5));
              f.style.setProperty("padding-right", `${w}px`, "important");
            }
          }
        });

        // Save state to undo stack with a debounce to group typing operations
        if (inputDebounceTimerRef.current) clearTimeout(inputDebounceTimerRef.current);
        inputDebounceTimerRef.current = setTimeout(() => {
          saveToUndoStack();
        }, 800);

        // Also save immediately on word boundaries
        const textVal = target.textContent || "";
        if ([" ", ",", ".", "\n"].includes(textVal.slice(-1))) {
          saveToUndoStack();
        }
      }, 0);

      // Save selection
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }

      // Dynamically recalculate pages when user types
      schedulePagination(container);
    };

    const handleClick = (e: MouseEvent) => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    };

    // ── TAP vs SWIPE discriminator ────────────────────────────────────────────
    // We record the touchstart position, then on touchend we check if the
    // finger moved significantly. If movement > 8px it was a SCROLL/SWIPE and
    // we do nothing. If movement <= 8px it was a TAP and we handle focus.
    let tapStartX = 0;
    let tapStartY = 0;
    let tapStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return; // Only single finger taps
      tapStartX = e.touches[0].clientX;
      tapStartY = e.touches[0].clientY;
      tapStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = Math.abs(endX - tapStartX);
      const dy = Math.abs(endY - tapStartY);
      const elapsed = Date.now() - tapStartTime;

      // If finger moved more than 8px in any direction, or held for more than
      // 400ms (long-press), it was a scroll/swipe/long-press — do NOT focus.
      if (dx > 8 || dy > 8 || elapsed > 400) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // If they tapped directly ON a contentEditable field, let browser handle it natively
      if (target.isContentEditable || target.closest("[contenteditable='true']")) return;

      // Tapped on static text or empty margin — redirect to nearest field inside that same page
      const section = target.closest("section.docx") as HTMLElement;
      if (!section) return;

      const clientX = endX;
      const clientY = endY;

      // Find the absolute closest field in this specific section/page.
      // By using Infinity and locking search to this page/section, any tap on the page's
      // static text will map to a valid field on that page and prevent caret landing in static text.
      const allFields = Array.from(section.querySelectorAll(".legal-editable-field")) as HTMLElement[];
      let closestField: HTMLElement | null = null;
      let minDist = Infinity;

      for (const f of allFields) {
        const rect = f.getBoundingClientRect();
        const dx2 = Math.max(0, rect.left - clientX, clientX - rect.right);
        const dy2 = Math.max(0, rect.top - clientY, clientY - rect.bottom);
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d < minDist) {
          minDist = d;
          closestField = f;
        }
      }

      if (closestField) {
        closestField.focus();
        requestAnimationFrame(() => {
          const sel = window.getSelection();
          if (!sel) return;
          let textNode = closestField!.firstChild;
          if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            textNode = document.createTextNode("\u200B");
            closestField!.innerHTML = "";
            closestField!.appendChild(textNode);
          }
          const range = document.createRange();
          range.setStart(textNode, textNode.textContent?.length || 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      // Only redirect if clicking on non-editable static text
      if (target.isContentEditable || target.closest("[contenteditable='true']")) return;

      const section = target.closest("section.docx") as HTMLElement;
      if (!section) return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      const allFields = Array.from(section.querySelectorAll(".legal-editable-field")) as HTMLElement[];
      let closestField: HTMLElement | null = null;
      let minDist = Infinity;

      for (const f of allFields) {
        const rect = f.getBoundingClientRect();
        const dx2 = Math.max(0, rect.left - clientX, clientX - rect.right);
        const dy2 = Math.max(0, rect.top - clientY, clientY - rect.bottom);
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d < minDist) {
          minDist = d;
          closestField = f;
        }
      }

      if (closestField) {
        closestField.focus();
        const sel = window.getSelection();
        if (sel) {
          let textNode = closestField.firstChild;
          if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
            textNode = document.createTextNode("\u200B");
            closestField.innerHTML = "";
            closestField.appendChild(textNode);
          }
          const range = document.createRange();
          range.setStart(textNode, textNode.textContent?.length || 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains("legal-editable-field")) {
        // Save state to undo stack before user begins editing
        saveToUndoStack();

        // Delay slightly so that the visual viewport has finished resizing from the keyboard popping up
        setTimeout(() => {
          scrollToElement(target);
        }, 150);
      }
    };

    container.addEventListener("input", handleInput);
    container.addEventListener("click", handleClick);
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });
    container.addEventListener("focusin", handleFocusIn);

    const cleanup = () => {
      container.removeEventListener("input", handleInput);
      container.removeEventListener("click", handleClick);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("focusin", handleFocusIn);
    };

    // ── GUARD: only fetch/render once per formId/customFile ──────────
    // Without this guard, changing isLoading or pageCount state would
    // re-trigger this effect and re-fetch the template from scratch,
    // causing repeated "Loading template…" flicker.
    if (hasRenderedRef.current) {
      return cleanup;
    }

    if (customFile) {
      hasRenderedRef.current = true;
      setIsLoading(true);
      
      // Delay parsing to allow screen transition animation to finish smoothly (300ms)
      setTimeout(() => {
        docx.renderAsync(customFile, docxRef.current!, undefined, {
          inWrapper: true, ignoreWidth: false, ignoreHeight: false,
          ignoreFonts: false, breakPages: true, useBase64URL: true,
          renderHeaders: false, renderFooters: false,
          className: "docx",
        })
      .then(() => {
        if (!docxRef.current) return;
        
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

            // Snapshot for Reset
            if (!hasSnapshottedRef.current) {
              originalHtmlRef.current = docxRef.current.innerHTML;
              hasSnapshottedRef.current = true;
            }

            setupEditorBehaviors();
            saveToUndoStack();
            setIsLoading(false);
          }
        };

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => setTimeout(doInject, 100));
        } else {
          setTimeout(doInject, 200);
        }
      })
      .catch(e => {
        console.error(e);
        toast.error("Could not load custom file.");
        setIsLoading(false);
      });
      }, 300); // end of setTimeout
      
      return cleanup;
    }

    if (!template?.filePath) { setIsLoading(false); return cleanup; }
    hasRenderedRef.current = true;
    setIsLoading(true);

    // Delay parsing to allow screen transition animation to finish smoothly (300ms)
    setTimeout(() => {
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

        if (initialContent) {
          // Opened from Drafts screen — restore the saved draft content
          docxRef.current.innerHTML = initialContent;
          setupEditorBehaviors();

          // Snapshot for Reset
          if (!hasSnapshottedRef.current) {
            originalHtmlRef.current = initialContent;
            hasSnapshottedRef.current = true;
          }
          
          // Re-calculate margins and page count
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
          saveToUndoStack();
          setIsLoading(false);
        } else {
          // Fresh template — inject editable fields then paginate
          const doInject = () => {
            if (docxRef.current) {
              injectAndWire(docxRef.current);
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

              // Snapshot for Reset
              if (!hasSnapshottedRef.current) {
                originalHtmlRef.current = docxRef.current.innerHTML;
                hasSnapshottedRef.current = true;
              }

              setupEditorBehaviors();
              saveToUndoStack();
              setIsLoading(false);
            }
          };

          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => setTimeout(doInject, 100));
          } else {
            setTimeout(doInject, 200);
          }
        }
      })
      .catch(e => {
        console.error(e);
        toast.error("Could not load template.");
        setIsLoading(false);
      });
    }, 300); // end of setTimeout

    return cleanup;
  // Only re-run when the actual template source changes, NOT when derived state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, customFile]);

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

    // 1. Reset formatting state variables
    setLineSpacing(null);
    setPerfectAlign(false);
    setIsTwoColumns(false);
    setShowRuler(true);
    setShowSpacingOptions(false);
    setGlobalAlign("");
    if (originalMarginsRef.current) {
      setLeftMargin(originalMarginsRef.current.left);
      setRightMargin(originalMarginsRef.current.right);
    } else {
      setLeftMargin(72);
      setRightMargin(72);
    }

    // 2. Restore original HTML snapshot directly — no re-fetch, no async
    //    Fresh template → restores blank template
    //    Opened from draft → restores the saved draft content (last save point)
    if (originalHtmlRef.current && container) {
      container.innerHTML = originalHtmlRef.current;
      injectAndWire(container);

      // Setup articles
      container.querySelectorAll("article").forEach(article => {
        const el = article as HTMLElement;
        el.contentEditable = "false";
        el.spellcheck = false;
        el.style.cursor = "default";
        el.style.outline = "none";
        el.style.caretColor = "transparent"; // hide caret on static article areas
        el.style.userSelect = "none";         // block text selection in static areas
        (el.style as any).webkitUserSelect = "none"; // iOS/Android Chrome
      });

      // Recalculate pages
      schedulePagination(container);
      const scale = Math.min(1, (window.innerWidth - 8) / A4_W);
      const x = (window.innerWidth - A4_W * scale) / 2;
      applyTransform(x, 0, scale);

      toast.success(initialContent ? "Draft reset to last saved state!" : "Document reset to original template!");
    } else {
      toast.error("Could not reset document layout.");
    }
  }, [formId, initialContent, applyTransform]);

  const createEmptyCell = () => {
    const td = document.createElement("td");
    td.style.padding = "8px 10px";
    td.style.border = "1px solid #1e293b";
    td.style.height = "2.2em";
    td.style.verticalAlign = "top";
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.style.minHeight = "1.5em";
    div.style.outline = "none";
    div.innerHTML = "&#8203;";
    td.appendChild(div);
    return td;
  };

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
        td.style.verticalAlign = "top";
        
        // Wrap the cell content in an explicit contentEditable div.
        // Android Gboard's backspace completely breaks if it's just typing directly into a <td>
        // that inherited contentEditable from a parent. This forces it to be recognized as a distinct text field.
        const div = document.createElement("div");
        div.contentEditable = "true";
        div.style.minHeight = "1.5em";
        div.style.outline = "none";
        div.innerHTML = "&#8203;"; // Zero-width space for anchor
        td.appendChild(div);

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

  const handlePaperSelect = async (size: PaperSize, pagesStr?: string) => {
    setShowPaperModal(false);
    handleSave();
    
    // Parse the page string into an array of 0-indexed numbers
    let pagesToExport: number[] | undefined = undefined;
    if (pagesStr && pagesStr.trim() !== "") {
      const parsed: number[] = [];
      const parts = pagesStr.split(",");
      parts.forEach(part => {
        const range = part.split("-").map(s => parseInt(s.trim(), 10));
        if (range.length === 1 && !isNaN(range[0])) {
          parsed.push(range[0] - 1);
        } else if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
          for (let i = range[0]; i <= range[1]; i++) {
            parsed.push(i - 1);
          }
        }
      });
      if (parsed.length > 0) {
        pagesToExport = Array.from(new Set(parsed)).sort((a, b) => a - b);
      }
    }

    const performExport = async () => {
      toast.info(`Generating ${size.toUpperCase()} PDF…`);
      setExportingPDF(true); // Show loader spinner during generation

      try {
        await generatePDF({
          elementId: "docx-print-target",
          filename: `${template?.name || "legal-document"}-${Date.now()}.pdf`,
          paperSize: size,
          pagesToExport,
          onSuccess: () => {
            savePDFExport(formId, template?.name || "Legal Document", "₹10");
            toast.success("PDF exported successfully!");
            setExportingPDF(false);
          },
          onError: (err: any) => {
            toast.error(`PDF failed: ${err?.message || String(err) || 'Unknown error'}`);
            setExportingPDF(false);
          },
        });
      } catch (err) {
        console.error("PDF generation failed:", err);
        toast.error("PDF failed. Try again.");
        setExportingPDF(false);
      }
    };

    if (onExportPDF) {
      onExportPDF(performExport);
    } else {
      await performExport();
    }
  };

  const previewScale = Math.min(1, (window.innerWidth - 16) / A4_W);


  const insertTable = () => {
    const rows = parseInt(tableRows, 10);
    const cols = parseInt(tableCols, 10);

    if (!rows || rows < 1) { toast.error("Rows must be at least 1"); return; }
    if (!cols || cols < 1) { toast.error("Columns must be at least 1"); return; }

    // Determine table-level styles based on tableFit selection
    let tableStyle = "border-collapse: collapse; ";
    let tdStyle = "border:1px solid #000; padding:8px; ";

    if (tableFit === "fixed") {
      // Fixed column width: equal columns, no shrinking
      const colPct = Math.floor(100 / cols);
      tableStyle += `width:100%; table-layout:fixed;`;
      tdStyle += `width:${colPct}%; overflow:hidden; word-break:break-word;`;
    } else if (tableFit === "content") {
      // AutoFit to content: table shrinks to fit its content
      tableStyle += `width:auto; table-layout:auto;`;
      tdStyle += `min-width:60px; white-space:nowrap;`;
    } else {
      // AutoFit to window: full width, auto layout
      tableStyle += `width:100%; table-layout:auto;`;
      tdStyle += `min-width:40px;`;
    }

    let html = `<table style='${tableStyle}'>`;

    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="${tdStyle}">&nbsp;</td>`;
      }
      html += "</tr>";
    }

    html += "</table><br/>";

    // Try to insert at saved cursor position, otherwise append to first article
    const sel = window.getSelection();
    if (savedRangeRef.current) {
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
      document.execCommand("insertHTML", false, html);
    } else if (docxRef.current) {
      const article = docxRef.current.querySelector("article");
      if (article) {
        const div = document.createElement("div");
        div.innerHTML = html;
        while (div.firstChild) article.appendChild(div.firstChild);
      }
    } else {
      document.execCommand("insertHTML", false, html);
    }

    setTimeout(() => {
      if (docxRef.current) schedulePagination(docxRef.current);
    }, 150);

    setShowTableModal(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      {exportingPDF && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(255,255,255,0.9)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <Loader2 size={48} className="animate-spin text-[#1e3a5f] mb-4" />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Generating High-Quality PDF...</h2>
          <p style={{ fontSize: 14, color: "#64748b" }}>Please wait, this may take a few seconds.</p>
        </div>
      )}

      <TopNavBar
        title={displayName}
        subtitle={displaySubtitle}
        onBack={onBack}
      />



      <div
        ref={viewportRef}
        style={{
          flex: 1, overflow: "hidden", background: "#cbd5e1",
          position: "relative", touchAction: "none",
        }}
        onTouchEnd={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target || !docxRef.current) return;
          const tableEl = target.closest("table") as HTMLTableElement | null;
          const tdEl = target.closest("td") as HTMLTableCellElement | null;
          if (tableEl && docxRef.current.contains(tableEl)) {
            setInTableNode(tableEl);
            setInTableCellNode(tdEl);
          } else {
            setInTableNode(null);
            setInTableCellNode(null);
          }
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
                  const baseLeft = originalMarginsRef.current?.left || 72;
                  // Allow negative margins so text can move into the page padding!
                  const relativeIndent = m - baseLeft;
                  selectedParaRef.current.style.marginLeft = `${relativeIndent}px`;
                  selectedParaRef.current.style.paddingLeft = "0"; // Reset any old padding
                } else {
                  // Apply to all pages if no paragraph is selected!
                  const sections = docxRef.current?.querySelectorAll(".docx-wrapper > section.docx, section.docx");
                  sections?.forEach(sec => {
                    (sec as HTMLElement).style.paddingLeft = `${m}px`;
                  });
                }
                setTimeout(() => {
                  if (docxRef.current) breakPagesDynamically(docxRef.current);
                }, 100);
              }}
              onRightMarginChange={(m) => {
                setRightMargin(m);
                if (selectedParaRef.current) {
                  const baseRight = originalMarginsRef.current?.right || 72;
                  const relativeIndent = m - baseRight;
                  selectedParaRef.current.style.marginRight = `${relativeIndent}px`;
                  selectedParaRef.current.style.paddingRight = "0";
                } else {
                  // Apply to all pages if no paragraph is selected!
                  const sections = docxRef.current?.querySelectorAll(".docx-wrapper > section.docx, section.docx");
                  sections?.forEach(sec => {
                    (sec as HTMLElement).style.paddingRight = `${m}px`;
                  });
                }
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
            onTouchEnd={(e) => {
              const target = e.target as HTMLElement | null;
              if (!target || !docxRef.current) return;
              const tableEl = target.closest("table") as HTMLTableElement | null;
              const tdEl = target.closest("td") as HTMLTableCellElement | null;
              if (tableEl && docxRef.current.contains(tableEl)) {
                setInTableNode(tableEl);
                setInTableCellNode(tdEl);
              } else {
                setInTableNode(null);
                setInTableCellNode(null);
              }
            }}
            className={`legal-doc-container ${perfectAlign ? "perfect-left-align" : ""} ${isTwoColumns ? "two-columns-layout" : ""} ${globalAlign ? `global-align-${globalAlign}` : ""} ${lineSpacing ? "has-custom-line-spacing" : ""}`}
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
        {showSpacingOptions && (
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
              {isHi ? "लाइन स्पेसिंग चुनें (1.5 - 2.0):" : "Select Line Spacing (1.5 - 2.0):"}
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
        <div
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
          {/* Undo Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              handleUndo();
            }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              background: "transparent", color: "#475569", border: "none", borderRadius: 8,
              minWidth: "46px", height: "44px", cursor: "pointer", transition: "all 0.15s",
            }}
            title="Undo"
          >
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Undo2 size={13} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "पूर्ववत" : "Undo"}</span>
          </button>

          {/* Tab Indent Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              const sel = window.getSelection();
              if (savedRangeRef.current) {
                sel?.removeAllRanges();
                sel?.addRange(savedRangeRef.current);
              }
              execFormatCommand("insertHTML", "\u00a0\u00a0\u00a0\u00a0");
              setTimeout(() => {
                if (docxRef.current) schedulePagination(docxRef.current);
              }, 100);
            }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              background: "transparent", color: "#475569", border: "none", borderRadius: 8,
              minWidth: "46px", height: "44px", cursor: "pointer", transition: "all 0.15s",
            }}
            title="Tab Indent"
          >
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>
              ⇥
            </div>
            <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "टैब" : "Tab"}</span>
          </button>

          <div style={{ width: 1, height: 28, background: "#cbd5e1", flexShrink: 0, margin: "0 4px" }} />

          {/* TABLE TOOLS: Always first when cursor is inside a table */}
          {inTableNode && (
            <>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  setShowTableEditMenu(true);
                }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  background: "#eff6ff", color: "#1e3a8a",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: 8, minWidth: "60px", height: "44px", cursor: "default",
                  flexShrink: 0,
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Table size={14} strokeWidth={2.5} color="#1e3a8a" />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#1e3a8a" }}>{isHi ? "तालिका टूल्स" : "Table Tools"}</span>
              </button>
              <div style={{ width: 1, height: 28, background: "#cbd5e1", flexShrink: 0 }} />
            </>
          )}

            {/* Bold Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                try {
                  execFormatCommand("bold");
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
              <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "बोल्ड" : "Bold"}</span>
            </button>

            {/* Underline Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                try {
                  execFormatCommand("underline");
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
              <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "रेखांकित" : "Underline"}</span>
            </button>

            <div style={{ width: 1, height: 24, background: "#cbd5e1", flexShrink: 0, margin: "0 2px" }} />

            {/* Alignment: Center */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                execFormatCommand("justifyCenter");
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
              <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "मध्य" : "Center"}</span>
            </button>

            {/* Alignment: Justify */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                execFormatCommand("justifyFull");
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
              <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "समान" : "Justify"}</span>
            </button>

            <div style={{ width: 1, height: 24, background: "#cbd5e1", flexShrink: 0, margin: "0 2px" }} />

            {/* Font Size Picker */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const current = getActiveFieldFontSize();
                    const next = Math.max(8, current - 1);
                    setFontSize(next);
                    if (focusedField) {
                      focusedField.style.fontSize = `${next}pt`;
                      setTimeout(() => {
                        if (docxRef.current) schedulePagination(docxRef.current);
                      }, 100);
                      return;
                    }
                    // Restore selection if lost due to button tap
                    const sel = window.getSelection();
                    if (savedRangeRef.current) { sel?.removeAllRanges(); sel?.addRange(savedRangeRef.current); }
                    const sel2 = window.getSelection();
                    if (!sel2 || sel2.rangeCount === 0) return;
                    const range = sel2.getRangeAt(0);
                    if (!range.collapsed) {
                      document.execCommand("fontSize", false, "7");
                      (document.querySelectorAll("font[size='7']") as NodeListOf<HTMLElement>).forEach(f => { f.removeAttribute("size"); f.style.fontSize = `${next}pt`; });
                    } else if (selectedParaRef.current && docxRef.current?.contains(selectedParaRef.current)) {
                      selectedParaRef.current.style.fontSize = `${next}pt`;
                      selectedParaRef.current.querySelectorAll('*').forEach((el: any) => {
                        if (el.style) el.style.fontSize = `${next}pt`;
                      });
                    } else {
                      const span = document.createElement("span");
                      span.style.fontSize = `${next}pt`;
                      span.appendChild(document.createTextNode("\u200b"));
                      range.insertNode(span);
                      const nr = document.createRange();
                      nr.setStart(span.firstChild!, 1);
                      nr.collapse(true);
                      sel2.removeAllRanges(); sel2.addRange(nr);
                      savedRangeRef.current = nr.cloneRange();
                    }
                    setTimeout(() => {
                      if (docxRef.current) schedulePagination(docxRef.current);
                    }, 100);
                  }}
                  style={{ width: 20, height: 20, border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc", color: "#374151", fontSize: 13, fontWeight: 700, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >−</button>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", minWidth: 22, textAlign: "center" }}>
                  {typeof fontSize === "number" ? fontSize : getActiveFieldFontSize()}
                </span>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const current = getActiveFieldFontSize();
                    const next = Math.min(36, current + 1);
                    setFontSize(next);
                    if (focusedField) {
                      focusedField.style.fontSize = `${next}pt`;
                      setTimeout(() => {
                        if (docxRef.current) schedulePagination(docxRef.current);
                      }, 100);
                      return;
                    }
                    const sel = window.getSelection();
                    if (savedRangeRef.current) { sel?.removeAllRanges(); sel?.addRange(savedRangeRef.current); }
                    const sel2 = window.getSelection();
                    if (!sel2 || sel2.rangeCount === 0) return;
                    const range = sel2.getRangeAt(0);
                    if (!range.collapsed) {
                      document.execCommand("fontSize", false, "7");
                      (document.querySelectorAll("font[size='7']") as NodeListOf<HTMLElement>).forEach(f => { f.removeAttribute("size"); f.style.fontSize = `${next}pt`; });
                    } else if (selectedParaRef.current && docxRef.current?.contains(selectedParaRef.current)) {
                      selectedParaRef.current.style.fontSize = `${next}pt`;
                      selectedParaRef.current.querySelectorAll('*').forEach((el: any) => {
                        if (el.style) el.style.fontSize = `${next}pt`;
                      });
                    } else {
                      const span = document.createElement("span");
                      span.style.fontSize = `${next}pt`;
                      span.appendChild(document.createTextNode("\u200b"));
                      range.insertNode(span);
                      const nr = document.createRange();
                      nr.setStart(span.firstChild!, 1);
                      nr.collapse(true);
                      sel2.removeAllRanges(); sel2.addRange(nr);
                      savedRangeRef.current = nr.cloneRange();
                    }
                    setTimeout(() => {
                      if (docxRef.current) schedulePagination(docxRef.current);
                    }, 100);
                  }}
                  style={{ width: 20, height: 20, border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc", color: "#374151", fontSize: 13, fontWeight: 700, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569" }}>{isHi ? "फ़ॉन्ट साइज़" : "Font Size"}</span>
            </div>

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
              <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "तालिका" : "Table"}</span>
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
              <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "अंतराल" : "Spacing"}</span>
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
              <span style={{ fontSize: 9, fontWeight: 700 }}>{isHi ? "रूलर" : "Ruler"}</span>
            </button>

          </div>

        {/* Secondary Row: Primary Operations Sub-bar (Preview & Export PDF) - Ultra-Compact Style */}
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 8,
            padding: "6px 12px 10px",
            borderTop: "1px solid #f1f5f9",
            background: "#ffffff",
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >

          {/* Reset Layout Button */}
          <button
            onClick={handleResetLayout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "#fff1f2",
              color: "#be123c",
              border: "1px solid #fecdd3",
              borderRadius: "10px",
              padding: "7px 12px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s, transform 0.1s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <RotateCcw size={14} /> {isHi ? "रीसेट" : "Reset"}
          </button>

          {/* Save as Draft Button */}
          <button
            onClick={() => {
              if (!docxRef.current) return;
              const templateName = displayName;
              const saved = saveDraft(formId, templateName, docxRef.current.innerHTML, currentDraftId);
              setCurrentDraftId(saved.id);
              toast.success("Draft saved!", { duration: 2000 });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "#f0fdf4",
              color: "#15803d",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              padding: "7px 12px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.15s, transform 0.1s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <Save size={14} /> {isHi ? "ड्राफ्ट सहेजें" : "Save Draft"}
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
              flexShrink: 0,
              transition: "background 0.15s, transform 0.1s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <Eye size={14} /> {isHi ? "पूर्वावलोकन" : "Preview"}
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
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(155,28,49,0.3)",
              opacity: exportingPDF ? 0.7 : 1,
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            {exportingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exportingPDF ? (isHi ? "तैयार हो रहा है..." : "Generating…") : (isHi ? "PDF निर्यात करें" : "Export PDF")}
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
                className={`legal-doc-container ${perfectAlign ? "perfect-left-align" : ""} ${isTwoColumns ? "two-columns-layout" : ""} ${globalAlign ? `global-align-${globalAlign}` : ""} ${lineSpacing ? "has-custom-line-spacing" : ""}`}
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
                min={0}
                value={tableCols}
                onChange={(e) => setTableCols(e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: "100%",
                  height: 38,
                  border: "1px solid #bfc5d2",
                  borderRadius: 4,
                  padding: "0 10px",
                  fontSize: 16,
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Number of rows:
              </label>

              <input
                type="number"
                min={0}
                value={tableRows}
                onChange={(e) => setTableRows(e.target.value)}
                onFocus={(e) => e.target.select()}
                style={{
                  width: "100%",
                  height: 38,
                  border: "1px solid #bfc5d2",
                  borderRadius: 4,
                  padding: "0 10px",
                  fontSize: 16,
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
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{isHi ? "तालिका जोड़ें" : "Insert Table"}</h3>
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{isHi ? "कॉलम की संख्या" : "Number of Columns"}</label>
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{isHi ? "पंक्तियों की संख्या" : "Number of Rows"}</label>
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
                  {isHi ? "रद्द करें" : "Cancel"}
                </button>
                <button
                  onClick={insertTableAtCursor}
                  style={{
                    flex: 1, height: 40, borderRadius: 10, border: "none",
                    background: "#0f766e", color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(15,110,105,0.2)"
                  }}
                >
                  {isHi ? "तालिका जोड़ें" : "Insert Table"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* TABLE EDIT OPTIONS MENU */}
        {showTableEditMenu && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              animation: "fadeIn 180ms ease-out",
            }}
            onClick={() => setShowTableEditMenu(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", background: "#ffffff",
                borderTopLeftRadius: 20, borderTopRightRadius: 20,
                padding: "16px 16px 32px",
                display: "flex", flexDirection: "column", gap: 8,
                boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
                transform: "translateY(0)",
                animation: "slideUp 220ms ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Table size={16} color="#1e3a8a" />
                  </div>
                  Table Tools
                </h3>
                <button onClick={() => setShowTableEditMenu(false)} style={{ background: "transparent", border: "none", color: "#64748b" }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => {
                    if (inTableCellNode && inTableCellNode.parentElement) {
                      const tr = inTableCellNode.parentElement as HTMLTableRowElement;
                      const newTr = document.createElement("tr");
                      Array.from(tr.children).forEach(() => newTr.appendChild(createEmptyCell()));
                      tr.insertAdjacentElement("afterend", newTr);
                      if (docxRef.current) schedulePagination(docxRef.current);
                    }
                    setShowTableEditMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f8fafc", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#1e293b", textAlign: "left" }}
                >
                  <Plus size={20} color="#16a34a" /> Insert Row Below
                </button>
                
                <button
                  onClick={() => {
                    if (inTableCellNode && inTableNode) {
                      const cellIndex = inTableCellNode.cellIndex;
                      Array.from(inTableNode.rows).forEach(row => row.insertBefore(createEmptyCell(), row.cells[cellIndex + 1] || null));
                      if (docxRef.current) schedulePagination(docxRef.current);
                    }
                    setShowTableEditMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f8fafc", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#1e293b", textAlign: "left" }}
                >
                  <Plus size={20} color="#2563eb" /> Insert Column Right
                </button>
                
                <button
                  onClick={() => {
                    if (inTableCellNode && inTableCellNode.parentElement) {
                      const tr = inTableCellNode.parentElement as HTMLTableRowElement;
                      tr.remove();
                      if (inTableNode.rows.length === 0) { inTableNode.remove(); setInTableNode(null); setInTableCellNode(null); }
                      if (docxRef.current) schedulePagination(docxRef.current);
                    }
                    setShowTableEditMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f8fafc", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#1e293b", textAlign: "left" }}
                >
                  <Minus size={20} color="#d97706" /> Delete Row
                </button>
                
                <button
                  onClick={() => {
                    if (inTableCellNode && inTableNode) {
                      const cellIndex = inTableCellNode.cellIndex;
                      Array.from(inTableNode.rows).forEach(row => { if (row.cells[cellIndex]) row.cells[cellIndex].remove(); });
                      if (inTableNode.rows.length > 0 && inTableNode.rows[0].cells.length === 0) { inTableNode.remove(); setInTableNode(null); setInTableCellNode(null); }
                      if (docxRef.current) schedulePagination(docxRef.current);
                    }
                    setShowTableEditMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f8fafc", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#1e293b", textAlign: "left" }}
                >
                  <Minus size={20} color="#9333ea" /> Delete Column
                </button>
                
                <button
                  onClick={() => {
                    if (inTableNode && inTableNode.parentNode) {
                      inTableNode.parentNode.removeChild(inTableNode);
                      setInTableNode(null); setInTableCellNode(null);
                      if (docxRef.current) schedulePagination(docxRef.current);
                    }
                    setShowTableEditMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fee2e2", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, color: "#b91c1c", textAlign: "left", marginTop: 8 }}
                >
                  <Trash size={20} color="#b91c1c" /> Delete Entire Table
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}