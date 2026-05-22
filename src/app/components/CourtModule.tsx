import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, FileText, ChevronRight, Search, X, Globe, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { courts } from "../../lib/legalData";
import {
  getTemplatesByCategory,
  getAvailableLanguages,
  getTemplatesForCourt,
  type Language,
  type TemplateFile,
} from "../../lib/templateRegistry";

interface CourtModuleProps {
  courtId: string;
  onBack: () => void;
  onSelectForm: (templateId: string) => void;
}

// ── "English not available" popup ─────────────────────────────────
function EnglishComingSoonModal({ onClose, onConfirm }: { onClose: () => void; onConfirm?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Icon strip */}
        <div className="bg-amber-50 px-6 pt-6 pb-4 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
            <Globe className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 text-center">
            English Template Not Available
          </h2>
          <p className="text-sm text-gray-500 text-center mt-1">
            This document is currently available in Hindi only.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-3 bg-blue-50 rounded-2xl p-4">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 leading-relaxed">
              The English version is coming soon! For now, please use the <strong>हिंदी</strong> template.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            className="flex-1 bg-[#1e3a5f] text-white font-bold py-3 rounded-2xl text-sm hover:bg-[#16304f] transition-colors"
          >
            Use हिंदी Template
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Language badge pill ────────────────────────────────────────────
function LangBadge({ lang }: { lang: "hi" | "en" }) {
  if (lang === "hi") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#1e3a5f]/10 text-[#1e3a5f] leading-none tracking-wide">
        हिं
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 leading-none tracking-wide">
      EN
    </span>
  );
}

export function CourtModule({ courtId, onBack, onSelectForm }: CourtModuleProps) {
  const court = courts.find(c => c.id === courtId);
  const title = court?.title || "Court";

  const availableLangs = useMemo(() => getAvailableLanguages(courtId), [courtId]);
  const [language, setLanguage] = useState<Language>("hi");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showEnglishModal, setShowEnglishModal] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateFile | null>(null);

  // Check if English templates actually exist
  const hasEnglish = availableLangs.includes("en");

  // Switch language — always allowed now!
  const handleLangSwitch = (lang: Language) => {
    setLanguage(lang);
  };

  const handleTemplateClick = (template: TemplateFile) => {
    if (language === "en" && template.language === "hi") {
      setPendingTemplate(template);
      setShowEnglishModal(true);
      return;
    }
    onSelectForm(template.id);
  };

  const handleModalConfirm = () => {
    if (pendingTemplate) {
      onSelectForm(pendingTemplate.id);
      setPendingTemplate(null);
    }
  };

  const handleModalClose = () => {
    setShowEnglishModal(false);
    setPendingTemplate(null);
  };

  // Get all templates for the court
  const allTemplates = useMemo(() => getTemplatesForCourt(courtId), [courtId]);

  // Filter templates choosing the best language representation
  const displayedTemplates = useMemo(() => {
    const groups: Record<string, TemplateFile[]> = {};
    for (const t of allTemplates) {
      if (!groups[t.id]) groups[t.id] = [];
      groups[t.id].push(t);
    }

    const selected: TemplateFile[] = [];
    for (const [id, list] of Object.entries(groups)) {
      const hiVer = list.find(t => t.language === "hi");
      const enVer = list.find(t => t.language === "en");

      if (language === "en") {
        if (enVer) selected.push(enVer);
        else if (hiVer) selected.push(hiVer);
      } else {
        if (hiVer) selected.push(hiVer);
        else if (enVer) selected.push(enVer);
      }
    }
    return selected;
  }, [allTemplates, language]);

  // Group displayed templates by category
  const allCategories = useMemo(() => {
    const grouped: Record<string, TemplateFile[]> = {};
    for (const t of displayedTemplates) {
      if (!grouped[t.description]) grouped[t.description] = [];
      grouped[t.description].push(t);
    }
    return grouped;
  }, [displayedTemplates]);

  // Search filter
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return allCategories;

    const result: Record<string, TemplateFile[]> = {};
    for (const [cat, templates] of Object.entries(allCategories)) {
      const matched = templates.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          cat.toLowerCase().includes(query)
      );
      if (matched.length > 0) result[cat] = matched;
    }
    return result;
  }, [allCategories, searchQuery]);

  const categoryKeys = Object.keys(filteredCategories);
  const totalCount = Object.values(filteredCategories).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  return (
    <div className="min-h-screen bg-[#f4f6f9]">

      {/* ── Header ── */}
      <div className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#1e3a5f] hover:bg-gray-100 p-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search templates...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9b1c31]/20 focus:border-[#9b1c31] transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>

          {/* Language toggle — always visible */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 flex-shrink-0">
            <button
              onClick={() => handleLangSwitch("hi")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                language === "hi"
                  ? "bg-[#1e3a5f] text-white shadow"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              हिं
            </button>
            <button
              onClick={() => handleLangSwitch("en")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all relative ${
                language === "en"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Court title + stats bar */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <h1 className="text-base font-extrabold text-[#1e3a5f]">{title}</h1>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 font-medium">
            {totalCount} templates
          </span>
          <span className="text-xs text-gray-400">•</span>
          {/* Active language badge */}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            language === "hi"
              ? "bg-[#1e3a5f]/10 text-[#1e3a5f]"
              : "bg-emerald-100 text-emerald-700"
          }`}>
            {language === "hi" ? "हिंदी" : "English"}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-3">

        {/* No results */}
        {categoryKeys.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-[#1e3a5f]">No templates found</h3>
            <p className="text-gray-500 mt-1 text-sm">
              {searchQuery ? "Try a different search" : "No templates available"}
            </p>
          </motion.div>
        )}

        {/* Category accordion */}
        {categoryKeys.map((category, catIdx) => {
          const templates = filteredCategories[category];
          const isExpanded = expandedCategory === category || searchQuery !== "";

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIdx * 0.03 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded && !searchQuery ? null : category)
                }
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#9b1c31]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#9b1c31]" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-bold text-[#1e3a5f] text-sm leading-tight">
                      {category}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {templates.length} document{templates.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Templates list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="border-t border-gray-100"
                  >
                    <div className="divide-y divide-gray-50">
                      {templates.map((template, idx) => (
                        <motion.button
                          key={template.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.025 }}
                          onClick={() => handleTemplateClick(template)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#9b1c31]/5 transition-colors text-left group"
                        >
                          {/* Language badge */}
                          <LangBadge lang={template.language as "hi" | "en"} />

                          {/* Template name */}
                          <span className="flex-1 text-[#1e3a5f] text-sm font-medium group-hover:text-[#9b1c31] transition-colors leading-snug">
                            {template.name}
                          </span>

                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#9b1c31] flex-shrink-0 transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ── English not available modal ── */}
      <AnimatePresence>
        {showEnglishModal && (
          <EnglishComingSoonModal onClose={handleModalClose} onConfirm={handleModalConfirm} />
        )}
      </AnimatePresence>
    </div>
  );
}
