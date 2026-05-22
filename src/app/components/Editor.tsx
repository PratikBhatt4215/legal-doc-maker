import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Bold, Italic, Underline, Save, Download,
  Loader2, AlertCircle, FileText, X, Printer
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
  onExportPDF: () => void; // kept for compatibility, we handle internally
}

// ── Placeholder patterns to replace with editable inputs ──────────
// Replaces [text], _____, ........... with clean inline inputs
function injectEditableFields(html: string): string {
  // 1. [placeholder text] → highlighted editable span
  html = html.replace(
    /\[([^\]]{1,80})\]/g,
    `<span
       contenteditable="true"
       class="doc-placeholder"
       data-placeholder="$1"
       spellcheck="false"
     >$1</span>`
  );

  // 2. Long underscore sequences → clean editable underline input
  html = html.replace(
    /_{4,}/g,
    `<span
       contenteditable="true"
       class="doc-blank"
       data-placeholder="&nbsp;"
       spellcheck="false"
     >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`
  );

  // 3. Long dot sequences (5+) → editable span
  html = html.replace(
    /\.{5,}/g,
    `<span
       contenteditable="true"
       class="doc-blank"
       data-placeholder="&nbsp;"
       spellcheck="false"
     >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`
  );

  return html;
}

// ── Paper Size Selection Modal ─────────────────────────────────────
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
            onClick={() => onSelect('a4')}
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
            onClick={() => onSelect('legal')}
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

// ── Main Editor Component ──────────────────────────────────────────
export function Editor({ formId, onBack }: EditorProps) {
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const template = getTemplateById(formId);

  // ── Load .docx → HTML with placeholder injection ────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingTemplate(true);
    setTemplateError("");

    async function loadContent() {
      // Load saved draft first
      const savedDraft = storage.loadDraft(formId);
      if (savedDraft) {
        if (editorRef.current && !cancelled) {
          editorRef.current.innerHTML = savedDraft;
        }
        setLoadingTemplate(false);
        return;
      }

      if (!template?.filePath) {
        if (!cancelled) {
          setTemplateError("Template file not found.");
          if (editorRef.current) {
            editorRef.current.innerHTML = "<p>Start typing your legal document here...</p>";
          }
          setLoadingTemplate(false);
        }
        return;
      }

      try {
        const response = await fetch(template.filePath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        // Convert .docx → HTML preserving alignment, bold, underline
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h2.doc-heading:fresh",
              "p[style-name='Heading 2'] => h3.doc-heading:fresh",
              "p[style-name='center'] => p.doc-center:fresh",
              "r[style-name='Strong'] => strong",
            ],
          }
        );

        // Post-process: replace placeholders with editable fields
        const processedHtml = injectEditableFields(result.value);

        if (editorRef.current && !cancelled) {
          editorRef.current.innerHTML = processedHtml || "<p>Start editing...</p>";
        }
      } catch (err: any) {
        console.error("[Editor] Failed to load template:", err);
        if (!cancelled) {
          setTemplateError("Could not load template. You can still type here.");
          if (editorRef.current) {
            editorRef.current.innerHTML = "<p>Start typing your legal document here...</p>";
          }
        }
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    }

    loadContent();
    return () => { cancelled = true; };
  }, [formId, template]);

  const applyFormatting = (format: string) => {
    document.execCommand(format, false);
    editorRef.current?.focus();
  };

  const handleSave = useCallback(() => {
    if (editorRef.current) {
      storage.saveDraft(formId, editorRef.current.innerHTML);
      toast.success(MESSAGES.editor.draftSaved);
    }
  }, [formId]);

  const handlePaperSelect = async (size: PaperSize) => {
    setShowPaperModal(false);
    setExportingPDF(true);
    toast.info(`Generating ${size.toUpperCase()} PDF...`);

    try {
      await generatePDF({
        elementId: 'doc-page',
        filename: `${template?.name || 'legal-document'}-${Date.now()}.pdf`,
        paperSize: size,
        onSuccess: () => toast.success("PDF downloaded successfully!"),
        onError: () => toast.error("Failed to generate PDF. Please try again."),
      });
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8ecf0] flex flex-col">

      {/* ── Top Toolbar ── */}
      <div className="bg-[#1e3a5f] text-white shadow-lg sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Back</span>
          </button>

          {/* Template name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{template?.name || "Document"}</p>
            <p className="text-xs text-blue-200">{template?.description}</p>
          </div>

          {/* Formatting buttons */}
          <div className="flex items-center gap-1 border-r border-white/20 pr-3">
            <button
              onClick={() => applyFormatting("bold")}
              title="Bold"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors font-bold text-sm"
            >B</button>
            <button
              onClick={() => applyFormatting("italic")}
              title="Italic"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors italic text-sm"
            >I</button>
            <button
              onClick={() => applyFormatting("underline")}
              title="Underline"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors underline text-sm"
            >U</button>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors text-sm"
          >
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
              : <Download className="w-4 h-4" />
            }
            <span className="hidden sm:inline">
              {exportingPDF ? "Generating..." : "Export PDF"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Document Page Area ── */}
      <div className="flex-1 overflow-auto py-8 px-4">
        <div className="flex justify-center">

          {/* Loading state */}
          {loadingTemplate && (
            <div className="flex flex-col items-center gap-3 text-gray-500 py-24">
              <Loader2 className="w-10 h-10 animate-spin text-[#1e3a5f]" />
              <p className="text-sm font-medium">Loading template...</p>
            </div>
          )}

          {/* The Document Page */}
          {!loadingTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
              style={{ maxWidth: '794px' }} /* A4 width at 96 DPI */
            >
              {/* Error banner */}
              {templateError && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {templateError}
                </div>
              )}

              {/*
                This is the actual "page" that gets captured for PDF.
                Styled to look exactly like an A4 legal document.
              */}
              <div
                id="doc-page"
                className="doc-page"
              >
                <div
                  id="editor-content"
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  className="doc-body"
                />
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                Tap any highlighted field to edit • Bold/Italic/Underline via toolbar
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Paper Size Modal ── */}
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
