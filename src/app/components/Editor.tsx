import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bold, Italic, Underline, Save, Download, Loader2, AlertCircle } from "lucide-react";
import { storage } from "../../lib/storage";
import { toast } from "sonner";
import { MESSAGES } from "../../lib/messages";
import { getTemplateById } from "../../lib/templateRegistry";
import mammoth from "mammoth";

interface EditorProps {
  formId: string;   // this is now the template registry ID
  onBack: () => void;
  onExportPDF: () => void;
}

export function Editor({ formId, onBack, onExportPDF }: EditorProps) {
  const [language, setLanguage] = useState<"english" | "hindi">("hindi");
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const template = getTemplateById(formId);

  // Load template .docx → HTML using mammoth, then apply saved draft on top
  useEffect(() => {
    let cancelled = false;
    setLoadingTemplate(true);
    setTemplateError("");

    async function loadContent() {
      // 1. Try to load a saved draft first
      const savedDraft = storage.loadDraft(formId);
      if (savedDraft) {
        if (editorRef.current && !cancelled) {
          editorRef.current.innerHTML = savedDraft;
        }
        setLoadingTemplate(false);
        return;
      }

      // 2. If no draft, load the .docx template file
      if (!template?.filePath) {
        if (!cancelled) {
          setTemplateError("Template file not found.");
          setLoadingTemplate(false);
        }
        return;
      }

      try {
        // Fetch the .docx binary from the Vite asset URL
        const response = await fetch(template.filePath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        // Convert .docx → HTML using mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer });

        if (editorRef.current && !cancelled) {
          editorRef.current.innerHTML = result.value || "<p>Start editing...</p>";
        }

        if (result.messages.length > 0) {
          console.info("[mammoth] conversion notes:", result.messages);
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

  const handleSave = () => {
    if (editorRef.current) {
      storage.saveDraft(formId, editorRef.current.innerHTML);
      toast.success(MESSAGES.editor.draftSaved);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#1e3a5f] hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{MESSAGES.editor.back}</span>
            </button>

            {/* Template name */}
            {template && (
              <div className="flex-1 min-w-0 text-center">
                <p className="text-sm font-semibold text-[#1e3a5f] truncate">
                  {template.name}
                </p>
                <p className="text-xs text-gray-400">{template.description}</p>
              </div>
            )}

            {/* Language toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage("hindi")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  language === "hindi"
                    ? "bg-[#1e3a5f] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {MESSAGES.editor.langHindi}
              </button>
              <button
                onClick={() => setLanguage("english")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  language === "english"
                    ? "bg-[#1e3a5f] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {MESSAGES.editor.langEnglish}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => applyFormatting("bold")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Bold"
            >
              <Bold className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => applyFormatting("italic")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Italic"
            >
              <Italic className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => applyFormatting("underline")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Underline"
            >
              <Underline className="w-5 h-5 text-gray-700" />
            </button>

            <div className="flex-1" />

            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-5 h-5" />
              <span className="hidden sm:inline">{MESSAGES.editor.saveDraft}</span>
            </button>

            <button
              onClick={onExportPDF}
              className="flex items-center gap-2 bg-[#9b1c31] hover:bg-[#7d1627] text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">{MESSAGES.editor.exportPDF}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 min-h-[600px] relative"
          >
            {/* Loading Overlay */}
            {loadingTemplate && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-2xl z-10">
                <div className="flex flex-col items-center gap-3 text-[#1e3a5f]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-medium">Loading template...</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {templateError && !loadingTemplate && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {templateError}
              </div>
            )}

            {/* Editable Content */}
            <div
              id="editor-content"
              ref={editorRef}
              contentEditable={!loadingTemplate}
              suppressContentEditableWarning
              className="min-h-[500px] outline-none prose prose-sm max-w-none"
              style={{
                fontFamily:
                  language === "hindi"
                    ? "Noto Sans Devanagari, sans-serif"
                    : "inherit",
              }}
            />

            {/* Signature & Stamp Footer */}
            {!loadingTemplate && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {MESSAGES.editor.signatureLabel}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center text-gray-400">
                      {MESSAGES.editor.signaturePrompt}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {MESSAGES.editor.stampLabel}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center text-gray-400">
                      {MESSAGES.editor.stampPrompt}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
