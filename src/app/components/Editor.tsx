import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { ArrowLeft, Bold, Italic, Underline, Save, Download } from "lucide-react";
import { storage } from "../../lib/storage";
import { toast } from "sonner";

interface EditorProps {
  formId: string;
  onBack: () => void;
  onExportPDF: () => void;
}

export function Editor({ formId, onBack, onExportPDF }: EditorProps) {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<"english" | "hindi">("english");

  useEffect(() => {
    const savedDraft = storage.loadDraft(formId);
    if (savedDraft) {
      setContent(savedDraft);
      const editorEl = document.getElementById('editor-content');
      if (editorEl) {
        editorEl.innerHTML = savedDraft;
      }
    }
  }, [formId]);

  const applyFormatting = (format: string) => {
    document.execCommand(format, false);
  };

  const handleSave = () => {
    const editorEl = document.getElementById('editor-content');
    if (editorEl) {
      const content = editorEl.innerHTML;
      storage.saveDraft(formId, content);
      toast.success("Draft saved successfully!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#1e3a5f] hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage("english")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  language === "english"
                    ? "bg-[#1e3a5f] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("hindi")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  language === "hindi"
                    ? "bg-[#1e3a5f] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>
        </div>
      </div>

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
              <span className="hidden sm:inline">Save Draft</span>
            </button>

            <button
              onClick={onExportPDF}
              className="flex items-center gap-2 bg-[#9b1c31] hover:bg-[#7d1627] text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 min-h-[600px]"
          >
            <div
              id="editor-content"
              contentEditable
              onInput={(e) => setContent(e.currentTarget.innerHTML)}
              className="min-h-[500px] outline-none prose max-w-none"
              style={{
                fontFamily: language === "hindi" ? "Noto Sans Devanagari, sans-serif" : "inherit"
              }}
            >
              <p className="text-gray-400">Start typing your legal document here...</p>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Advocate Signature
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center text-gray-400">
                    Click to add signature
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Stamp
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center text-gray-400">
                    Click to add stamp
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
