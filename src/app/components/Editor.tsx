import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Save, Download, Loader2, AlertCircle,
  FileText, X, Printer, Move, MousePointer
} from "lucide-react";
import { storage } from "../../lib/storage";
import { toast } from "sonner";
import { MESSAGES } from "../../lib/messages";
import { getTemplateById } from "../../lib/templateRegistry";
import { generatePDF, type PaperSize } from "../../lib/pdfGenerator";
import mammoth from "mammoth";

interface EditorProps {
  formId: string;
  onBack: () => void;
  onExportPDF: () => void;
}

// ── Types ──────────────────────────────────────────────────────────
interface DocBlock {
  id: string;
  html: string;
  x: number;   // px from left of page
  y: number;   // px from top of page
  width: number; // px width
}

// ── Replace placeholder patterns ──────────────────────────────────
function injectEditableFields(html: string): string {
  html = html.replace(
    /\[([^\]]{1,80})\]/g,
    `<span contenteditable="true" class="doc-placeholder" spellcheck="false">$1</span>`
  );
  html = html.replace(
    /_{4,}/g,
    `<span contenteditable="true" class="doc-blank" spellcheck="false">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`
  );
  html = html.replace(
    /\.{5,}/g,
    `<span contenteditable="true" class="doc-blank" spellcheck="false">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`
  );
  return html;
}

// Page dimensions (A4 at 96 DPI, with margins)
const PAGE_W = 794;
const PAGE_PADDING_X = 72;
const PAGE_PADDING_TOP = 72;
const BLOCK_DEFAULT_WIDTH = PAGE_W - PAGE_PADDING_X * 2;

// ── Parse HTML into positioned blocks ────────────────────────────
function parseIntoBlocks(html: string): DocBlock[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const children = Array.from(div.children);
  if (children.length === 0) {
    return [{
      id: "block-0", html,
      x: PAGE_PADDING_X, y: PAGE_PADDING_TOP,
      width: BLOCK_DEFAULT_WIDTH,
    }];
  }

  let y = PAGE_PADDING_TOP;
  return children.map((child, idx) => {
    // Estimate block height: roughly 1.8 * 14px per line
    const lineCount = Math.max(1, Math.ceil((child.textContent?.length || 0) / 80));
    const estimatedH = lineCount * 26 + 8;
    const block: DocBlock = {
      id: `block-${idx}`,
      html: child.outerHTML,
      x: PAGE_PADDING_X,
      y,
      width: BLOCK_DEFAULT_WIDTH,
    };
    y += estimatedH;
    return block;
  });
}

// ── Free-draggable block component ───────────────────────────────
function FreeBlock({
  block,
  onPositionChange,
  canvasMode,
}: {
  block: DocBlock;
  onPositionChange: (id: string, x: number, y: number) => void;
  canvasMode: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: block.x, y: block.y });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!canvasMode) return;
    e.stopPropagation();

    startPointer.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: block.x, y: block.y };

    // Long press: 200ms to start drag on mobile
    longPressTimer.current = setTimeout(() => {
      dragging.current = true;
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }, 200);
  }, [canvasMode, block.x, block.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.preventDefault();

    const dx = e.clientX - startPointer.current.x;
    const dy = e.clientY - startPointer.current.y;

    const newX = Math.max(0, Math.min(PAGE_W - block.width, startPos.current.x + dx));
    const newY = Math.max(0, startPos.current.y + dy);

    onPositionChange(block.id, newX, newY);
  }, [block.id, block.width, onPositionChange]);

  const onPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    dragging.current = false;
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.width,
        touchAction: canvasMode ? "none" : "auto",
        zIndex: isDragging ? 100 : 1,
        cursor: canvasMode
          ? isDragging ? "grabbing" : "grab"
          : "text",
        boxSizing: "border-box",
      }}
      className={`doc-free-block ${isDragging ? "doc-free-block--dragging" : ""} ${canvasMode ? "doc-free-block--canvas" : ""}`}
    >
      {/* Canvas mode: drag handle badge */}
      {canvasMode && (
        <div className="doc-free-handle">
          <Move className="w-3 h-3" />
        </div>
      )}

      {/* Content */}
      <div
        contentEditable={!canvasMode}
        suppressContentEditableWarning
        spellCheck={false}
        className="doc-block-content"
        onInput={(e) => {
          block.html = (e.target as HTMLElement).innerHTML;
        }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    </div>
  );
}

// ── Paper size modal ──────────────────────────────────────────────
function PaperSizeModal({ onSelect, onCancel }: {
  onSelect: (s: PaperSize) => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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
              <p className="text-sm text-gray-500">210 × 297 mm (Standard)</p>
            </div>
          </button>
          <button onClick={() => onSelect("legal")}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#9b1c31] rounded-2xl transition-all group">
            <div className="w-10 h-16 border-2 border-gray-300 group-hover:border-[#9b1c31] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#9b1c31]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#9b1c31]">Legal Size</p>
              <p className="text-sm text-gray-500">216 × 356 mm (Legal paper)</p>
            </div>
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">Two paper sizes as per client requirement</p>
      </motion.div>
    </motion.div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────
export function Editor({ formId, onBack }: EditorProps) {
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [canvasMode, setCanvasMode] = useState(false); // false = edit text, true = drag freely

  const template = getTemplateById(formId);

  // ── Load template ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingTemplate(true);
    setTemplateError("");

    async function load() {
      const saved = storage.loadDraft(formId);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as DocBlock[];
          if (!cancelled) { setBlocks(parsed); setLoadingTemplate(false); }
          return;
        } catch { /* not JSON — old format, fall through */ }
      }

      if (!template?.filePath) {
        if (!cancelled) {
          setBlocks([{
            id: "block-0",
            html: "<p>Start typing here...</p>",
            x: PAGE_PADDING_X, y: PAGE_PADDING_TOP,
            width: BLOCK_DEFAULT_WIDTH,
          }]);
          setTemplateError("Template file not found.");
          setLoadingTemplate(false);
        }
        return;
      }

      try {
        const resp = await fetch(template.filePath);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        const processed = injectEditableFields(result.value);
        if (!cancelled) setBlocks(parseIntoBlocks(processed));
      } catch (err: any) {
        console.error("[Editor] load error:", err);
        if (!cancelled) {
          setTemplateError("Could not load template. You can still type here.");
          setBlocks([{
            id: "block-0",
            html: "<p>Start typing here...</p>",
            x: PAGE_PADDING_X, y: PAGE_PADDING_TOP,
            width: BLOCK_DEFAULT_WIDTH,
          }]);
        }
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [formId, template]);

  // ── Position update from drag ─────────────────────────────────
  const handlePositionChange = useCallback((id: string, x: number, y: number) => {
    setBlocks(prev =>
      prev.map(b => b.id === id ? { ...b, x, y } : b)
    );
  }, []);

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    storage.saveDraft(formId, JSON.stringify(blocks));
    toast.success(MESSAGES.editor.draftSaved);
  }, [blocks, formId]);

  // ── Calculate canvas height from block positions ───────────────
  const canvasHeight = Math.max(
    1123,
    ...blocks.map(b => b.y + 200)
  );

  // ── PDF export ─────────────────────────────────────────────────
  const handlePaperSelect = async (size: PaperSize) => {
    setShowPaperModal(false);
    setCanvasMode(false);
    handleSave();
    setExportingPDF(true);
    toast.info(`Generating ${size.toUpperCase()} PDF...`);
    await new Promise(r => setTimeout(r, 150));
    try {
      await generatePDF({
        elementId: "doc-page",
        filename: `${template?.name || "legal-document"}-${Date.now()}.pdf`,
        paperSize: size,
        onSuccess: () => toast.success("PDF downloaded successfully!"),
        onError: () => toast.error("Failed to generate PDF. Please try again."),
      });
    } finally {
      setExportingPDF(false);
    }
  };

  // ── Format commands ────────────────────────────────────────────
  const fmt = (cmd: string) => document.execCommand(cmd, false);

  return (
    <div className="min-h-screen bg-[#e8ecf0] flex flex-col">

      {/* ── Toolbar ── */}
      <div className="bg-[#1e3a5f] text-white shadow-lg sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={onBack}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Back</span>
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{template?.name || "Document"}</p>
            <p className="text-xs text-blue-200">{template?.description}</p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
            <button
              onClick={() => setCanvasMode(false)}
              title="Text edit mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !canvasMode ? "bg-white text-[#1e3a5f] shadow" : "text-white/70 hover:text-white"
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              Edit Text
            </button>
            <button
              onClick={() => setCanvasMode(true)}
              title="Canvas drag mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                canvasMode ? "bg-white text-[#1e3a5f] shadow" : "text-white/70 hover:text-white"
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              Move
            </button>
          </div>

          {/* Text format — only in edit mode */}
          {!canvasMode && (
            <div className="flex items-center gap-0.5 border-l border-white/20 pl-2">
              <button onClick={() => fmt("bold")} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg font-bold text-sm">B</button>
              <button onClick={() => fmt("italic")} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg italic text-sm">I</button>
              <button onClick={() => fmt("underline")} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg underline text-sm">U</button>
            </div>
          )}

          <button onClick={handleSave}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors text-sm">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={() => setShowPaperModal(true)}
            disabled={exportingPDF || loadingTemplate}
            className="flex items-center gap-2 bg-[#9b1c31] hover:bg-[#7d1627] disabled:opacity-50 px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
          >
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">{exportingPDF ? "Generating..." : "Export PDF"}</span>
          </button>
        </div>

        {/* Mode hint */}
        <div className={`px-4 pb-2 text-xs flex items-center gap-2 transition-colors ${canvasMode ? "text-amber-300" : "text-blue-200"}`}>
          {canvasMode
            ? <><Move className="w-3 h-3" /> Long-press any block and drag it anywhere on the page — left, right, up, down</>
            : <><MousePointer className="w-3 h-3" /> Tap any yellow field or text to edit • Switch to Move mode to reposition blocks</>
          }
        </div>
      </div>

      {/* ── Document Canvas ── */}
      <div className="flex-1 overflow-auto py-8 px-4">
        <div className="flex justify-center">

          {loadingTemplate && (
            <div className="flex flex-col items-center gap-3 text-gray-500 py-24">
              <Loader2 className="w-10 h-10 animate-spin text-[#1e3a5f]" />
              <p className="text-sm font-medium">Loading template...</p>
            </div>
          )}

          {!loadingTemplate && (
            <div className="w-full" style={{ maxWidth: `${PAGE_W}px` }}>
              {templateError && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {templateError}
                </div>
              )}

              {/*
                THE PAGE — position:relative so blocks can be placed freely inside.
                Width = 794px (A4). Height grows with content.
              */}
              <div
                id="doc-page"
                style={{
                  position: "relative",
                  width: PAGE_W,
                  minHeight: canvasHeight,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
                  borderRadius: 2,
                  overflow: "hidden",
                  // Scale down on small screens
                  transformOrigin: "top left",
                }}
              >
                {/* Grid helper lines in canvas mode */}
                {canvasMode && (
                  <div
                    style={{
                      position: "absolute", inset: 0, pointerEvents: "none",
                      backgroundImage:
                        "linear-gradient(rgba(30,58,95,0.04) 1px, transparent 1px)," +
                        "linear-gradient(90deg, rgba(30,58,95,0.04) 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />
                )}

                {/* Blocks — freely positioned */}
                {blocks.map(block => (
                  <FreeBlock
                    key={block.id}
                    block={block}
                    onPositionChange={handlePositionChange}
                    canvasMode={canvasMode}
                  />
                ))}
              </div>

              <p className="text-center text-xs text-gray-400 mt-4 pb-8">
                {canvasMode
                  ? "🖐 Long-press any block and drag it anywhere inside the page"
                  : "💡 Switch to Move mode to reposition • Tap yellow fields to fill"}
              </p>
            </div>
          )}
        </div>
      </div>

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
