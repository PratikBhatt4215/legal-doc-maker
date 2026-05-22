import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowLeft, Bold, Italic, Underline, Save, Download,
  Loader2, AlertCircle, FileText, X, Printer, GripVertical
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
}

// ── Replace placeholder patterns with editable fields ─────────────
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

// ── Split HTML into draggable blocks ──────────────────────────────
function parseIntoBlocks(html: string): DocBlock[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const children = Array.from(div.children);

  if (children.length === 0) {
    return [{ id: "block-0", html }];
  }

  return children.map((child, idx) => ({
    id: `block-${idx}`,
    html: child.outerHTML,
  }));
}

// ── Serialise blocks back to HTML ─────────────────────────────────
function serializeBlocks(blocks: DocBlock[]): string {
  return blocks.map(b => b.html).join("\n");
}

// ── Sortable Block Component ───────────────────────────────────────
function SortableBlock({
  block,
  isDragging,
  editMode,
}: {
  block: DocBlock;
  isDragging: boolean;
  editMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSelfDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSelfDragging ? 0.3 : 1,
  };

  // Update block.html when contenteditable content changes
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = block.html;
    }
  }, [block.id]); // Only on mount

  const handleInput = () => {
    if (contentRef.current) {
      block.html = contentRef.current.innerHTML;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`doc-block group relative ${isDragging ? "cursor-grabbing" : ""}`}
    >
      {/* Drag handle — only visible in edit mode */}
      {editMode && (
        <div
          {...attributes}
          {...listeners}
          className="doc-drag-handle absolute left-[-32px] top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Block content — contenteditable */}
      <div
        ref={contentRef}
        contentEditable={!isDragging}
        suppressContentEditableWarning
        onInput={handleInput}
        spellCheck={false}
        className="doc-block-content outline-none"
      />
    </div>
  );
}

// ── Paper Size Modal ───────────────────────────────────────────────
function PaperSizeModal({
  onSelect,
  onCancel,
}: {
  onSelect: (size: PaperSize) => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
          <button
            onClick={() => onSelect("a4")}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#1e3a5f] rounded-2xl transition-all group"
          >
            <div className="w-10 h-14 border-2 border-gray-300 group-hover:border-[#1e3a5f] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <Printer className="w-5 h-5 text-gray-400 group-hover:text-[#1e3a5f]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#1e3a5f]">A4 Size</p>
              <p className="text-sm text-gray-500">210 × 297 mm (Standard)</p>
            </div>
          </button>

          <button
            onClick={() => onSelect("legal")}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-[#9b1c31] rounded-2xl transition-all group"
          >
            <div className="w-10 h-16 border-2 border-gray-300 group-hover:border-[#9b1c31] rounded flex items-center justify-center bg-gray-50 flex-shrink-0">
              <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#9b1c31]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#9b1c31]">Legal Size</p>
              <p className="text-sm text-gray-500">216 × 356 mm (Legal paper)</p>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          As per client requirement — two paper sizes supported
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Main Editor ────────────────────────────────────────────────────
export function Editor({ formId, onBack }: EditorProps) {
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const pageRef = useRef<HTMLDivElement>(null);

  const template = getTemplateById(formId);

  // DnD sensors — supports both mouse and touch (Android)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // require 8px movement before drag
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 }, // long-press to drag on mobile
    })
  );

  // ── Load template ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingTemplate(true);
    setTemplateError("");

    async function load() {
      const savedDraft = storage.loadDraft(formId);
      if (savedDraft) {
        if (!cancelled) {
          setBlocks(parseIntoBlocks(savedDraft));
          setLoadingTemplate(false);
        }
        return;
      }

      if (!template?.filePath) {
        if (!cancelled) {
          setTemplateError("Template file not found.");
          setBlocks([{ id: "block-0", html: "<p>Start typing here...</p>" }]);
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

        if (!cancelled) {
          setBlocks(parseIntoBlocks(processed));
        }
      } catch (err: any) {
        console.error("[Editor] load error:", err);
        if (!cancelled) {
          setTemplateError("Could not load template. You can still type here.");
          setBlocks([{ id: "block-0", html: "<p>Start typing here...</p>" }]);
        }
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [formId, template]);

  // ── DnD handlers ───────────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const activeBlock = useMemo(
    () => blocks.find(b => b.id === activeId),
    [blocks, activeId]
  );

  // ── Format ──────────────────────────────────────────────────────
  const applyFormatting = (cmd: string) => {
    document.execCommand(cmd, false);
  };

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const html = serializeBlocks(blocks);
    storage.saveDraft(formId, html);
    toast.success(MESSAGES.editor.draftSaved);
  }, [blocks, formId]);

  // ── PDF export ──────────────────────────────────────────────────
  const handlePaperSelect = async (size: PaperSize) => {
    setShowPaperModal(false);
    setEditMode(false); // temporarily hide drag handles for clean capture

    // Save current state first
    handleSave();

    setExportingPDF(true);
    toast.info(`Generating ${size.toUpperCase()} PDF...`);

    // Small delay for handles to hide before capture
    await new Promise(r => setTimeout(r, 200));

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
      setEditMode(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8ecf0] flex flex-col">

      {/* ── Toolbar ── */}
      <div className="bg-[#1e3a5f] text-white shadow-lg sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Back</span>
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{template?.name || "Document"}</p>
            <p className="text-xs text-blue-200">{template?.description}</p>
          </div>

          {/* Format buttons */}
          <div className="flex items-center gap-1 border-r border-white/20 pr-2">
            <button onClick={() => applyFormatting("bold")} title="Bold"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors font-bold text-sm w-8 h-8 flex items-center justify-center">B</button>
            <button onClick={() => applyFormatting("italic")} title="Italic"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors italic text-sm w-8 h-8 flex items-center justify-center">I</button>
            <button onClick={() => applyFormatting("underline")} title="Underline"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors underline text-sm w-8 h-8 flex items-center justify-center">U</button>
          </div>

          {/* Drag mode toggle */}
          <button
            onClick={() => setEditMode(prev => !prev)}
            title={editMode ? "Drag mode ON — long press block to drag" : "Drag mode OFF"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm border ${
              editMode
                ? "bg-white/20 border-white/30"
                : "border-white/10 hover:bg-white/10"
            }`}
          >
            <GripVertical className="w-4 h-4" />
            <span className="hidden sm:inline">{editMode ? "Drag ON" : "Drag OFF"}</span>
          </button>

          {/* Save */}
          <button onClick={handleSave}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors text-sm">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={() => setShowPaperModal(true)}
            disabled={exportingPDF || loadingTemplate}
            className="flex items-center gap-2 bg-[#9b1c31] hover:bg-[#7d1627] disabled:opacity-50 px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
          >
            {exportingPDF
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {exportingPDF ? "Generating..." : "Export PDF"}
            </span>
          </button>
        </div>

        {/* Hint bar when drag is enabled */}
        {editMode && !loadingTemplate && (
          <div className="px-4 pb-2 text-xs text-blue-200 flex items-center gap-2">
            <GripVertical className="w-3 h-3" />
            Long-press any paragraph to drag and reorder • Tap text to edit
          </div>
        )}
      </div>

      {/* ── Document Area ── */}
      <div className="flex-1 overflow-auto py-8 px-4">
        <div className="flex justify-center">

          {loadingTemplate && (
            <div className="flex flex-col items-center gap-3 text-gray-500 py-24">
              <Loader2 className="w-10 h-10 animate-spin text-[#1e3a5f]" />
              <p className="text-sm font-medium">Loading template...</p>
            </div>
          )}

          {!loadingTemplate && (
            <div className="w-full" style={{ maxWidth: "794px" }}>
              {templateError && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {templateError}
                </div>
              )}

              {/* The document page */}
              <div id="doc-page" ref={pageRef} className="doc-page">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={blocks.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {blocks.map(block => (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        isDragging={activeId !== null}
                        editMode={editMode}
                      />
                    ))}
                  </SortableContext>

                  {/* Drag overlay — ghost while dragging */}
                  <DragOverlay>
                    {activeBlock && (
                      <div
                        className="doc-block doc-drag-ghost opacity-90 shadow-2xl"
                        dangerouslySetInnerHTML={{ __html: activeBlock.html }}
                      />
                    )}
                  </DragOverlay>
                </DndContext>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                💡 Long-press any block to drag • Tap yellow fields to fill
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Paper Size Modal */}
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
