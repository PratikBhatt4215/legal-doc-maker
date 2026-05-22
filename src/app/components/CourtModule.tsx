import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, FileText, ChevronRight, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { courts, courtForms } from "../../lib/legalData";

interface CourtModuleProps {
  courtId: string;
  onBack: () => void;
  onSelectForm: (form: string) => void;
}

const courtTitles: Record<string, string> = {
  "high-court": "High Court",
  "district-court": "District Court",
  "family-court": "Family Court",
  "juvenile-court": "Juvenile Court",
  "revenue-court": "Revenue Court",
  "forum-court": "Forum Court"
};

export function CourtModule({ courtId, onBack, onSelectForm }: CourtModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const forms = courtForms[courtId] || [];
  const title = courtTitles[courtId] || "Court";

  const filteredForms = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return forms;
    return forms.filter(form =>
      form.name.toLowerCase().includes(query) ||
      form.description.toLowerCase().includes(query)
    );
  }, [searchQuery, forms]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#1e3a5f] bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all border border-gray-200 shadow-sm group whitespace-nowrap"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium hidden sm:inline">Dashboard</span>
          </button>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search in ${title}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          <div className="w-10 sm:w-24" /> {/* Spacer to balance the back button */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1e3a5f] mb-3 tracking-tight">
            {title} <span className="text-[#9b1c31]">Documents</span>
          </h1>
          <p className="text-gray-500 text-lg font-medium">Select a template to begin drafting</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredForms.map((form, index) => (
              <motion.div
                key={form.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{
                  y: -8,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectForm(form.id)}
                className="group bg-white rounded-3xl p-7 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(155,28,49,0.1)] transition-all cursor-pointer border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-6 h-6 text-[#9b1c31]" />
                </div>

                <div className="flex flex-col gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-[#9b1c31]/10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                    <FileText className="w-8 h-8 text-[#9b1c31]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-[#1e3a5f] mb-2 group-hover:text-[#9b1c31] transition-colors">
                      {form.name}
                    </h3>
                    <p className="text-gray-500 leading-relaxed font-medium">
                      {form.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredForms.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-[#1e3a5f]">No documents found</h3>
            <p className="text-gray-500">Try a different search term in this court</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}


