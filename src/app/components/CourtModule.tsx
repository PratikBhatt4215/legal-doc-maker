import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, FileText, ChevronRight, Search, X, Globe } from "lucide-react";
import { useState, useMemo } from "react";
import { courts } from "../../lib/legalData";
import {
  getTemplatesByCategory,
  getAvailableLanguages,
  type Language,
  type TemplateFile,
} from "../../lib/templateRegistry";

interface CourtModuleProps {
  courtId: string;
  onBack: () => void;
  onSelectForm: (templateId: string) => void;
}

export function CourtModule({ courtId, onBack, onSelectForm }: CourtModuleProps) {
  const court = courts.find(c => c.id === courtId);
  const title = court?.title || "Court";

  const availableLangs = useMemo(() => getAvailableLanguages(courtId), [courtId]);
  const [language, setLanguage] = useState<Language>(
    availableLangs.includes('hi') ? 'hi' : 'en'
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Get all templates grouped by category for selected language
  const allCategories = useMemo(
    () => getTemplatesByCategory(courtId, language),
    [courtId, language]
  );

  // Filter by search query across all categories
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
    (acc, arr) => acc + arr.length, 0
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#1e3a5f] bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all border border-gray-200 shadow-sm group whitespace-nowrap"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium hidden sm:inline">Dashboard</span>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search in ${title}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9b1c31]/20 focus:border-[#9b1c31] transition-all text-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>

          {/* Language Toggle — only show if both Hindi and English exist */}
          {availableLangs.length > 1 && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
              <Globe className="w-4 h-4 text-gray-400 ml-1" />
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  language === 'hi'
                    ? 'bg-[#1e3a5f] text-white shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  language === 'en'
                    ? 'bg-[#1e3a5f] text-white shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                EN
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#1e3a5f] tracking-tight">
            {title} <span className="text-[#9b1c31]">Documents</span>
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            {totalCount} template{totalCount !== 1 ? 's' : ''} available
            {language === 'hi' ? ' (हिंदी)' : ' (English)'}
          </p>
        </motion.div>

        {/* No results */}
        {categoryKeys.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-[#1e3a5f]">No documents found</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery
                ? 'Try a different search term'
                : language === 'en'
                ? 'English templates coming soon!'
                : 'No templates in this court yet'}
            </p>
          </motion.div>
        )}

        {/* Categories */}
        <div className="space-y-4">
          {categoryKeys.map((category, catIdx) => {
            const templates = filteredCategories[category];
            const isExpanded = expandedCategory === category || searchQuery !== '';

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.04 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() =>
                    setExpandedCategory(isExpanded && !searchQuery ? null : category)
                  }
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#9b1c31]/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#9b1c31]" />
                    </div>
                    <div className="text-left">
                      <h2 className="font-bold text-[#1e3a5f] text-lg leading-tight">
                        {category}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {templates.length} document{templates.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Template List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-100"
                    >
                      <div className="divide-y divide-gray-50">
                        {templates.map((template, idx) => (
                          <motion.button
                            key={template.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => onSelectForm(template.id)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#9b1c31]/5 transition-colors text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-[#9b1c31]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                              <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#9b1c31] transition-colors" />
                            </div>
                            <span className="flex-1 text-[#1e3a5f] font-medium group-hover:text-[#9b1c31] transition-colors leading-snug">
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
      </div>
    </div>
  );
}
