import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
// import { User, Search, Mic, X, Clock, FileText } from "lucide-react";
import { User, Search, Mic, X, Clock, FileText, Home, LayoutGrid, Save } from "lucide-react";
import { courts, courtForms } from "../../lib/legalData";
import { MESSAGES } from "../../lib/messages";

interface DashboardProps {
  onSelectCourt: (court: string) => void;
  onSelectForm: (formId: string) => void;
  onOpenProfile: () => void;
  onOpenTemplates: () => void;
  onOpenSavedPDFs: () => void;
  userData: any;
}

export function Dashboard({
  onSelectCourt,
  onSelectForm,
  onOpenProfile,
  onOpenTemplates,
  onOpenSavedPDFs,
  userData,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches] = useState(MESSAGES.dashboard.recentSearches);

  const startVoiceSearch = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice search is not supported on this device.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    setSearchQuery(transcript);
  };

  recognition.onerror = (event: any) => {
    console.error("Speech recognition error:", event.error);
  };
};

  const courtTitles = useMemo(
    () => Object.fromEntries(courts.map((c) => [c.id, c.title])),
    [],
  );

  const allMatchingForms = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return [];

    const results: Array<{
      courtId: string;
      form: { id: string; name: string; description: string };
    }> = [];
    Object.entries(courtForms).forEach(([courtId, forms]) => {
      forms.forEach((form) => {
        if (
          form.name.toLowerCase().includes(query) ||
          form.description.toLowerCase().includes(query)
        ) {
          results.push({ courtId, form });
        }
      });
    });
    return results;
  }, [searchQuery]);

  const filteredCourts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return courts;

    return courts.filter((court) => {
      const courtMatch =
        court.title.toLowerCase().includes(query) ||
        court.description.toLowerCase().includes(query);
      if (courtMatch) return true;

      const forms = courtForms[court.id] || [];
      return forms.some(
        (form) =>
          form.name.toLowerCase().includes(query) ||
          form.description.toLowerCase().includes(query),
      );
    });
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      
     
      <div 
        className="bg-[#0f4ba8] text-white pb-28 relative w-full"
        style={{
          clipPath: "ellipse(105% 100% at 50% 0%)"
        }}
      >
        {/* Top App Bar */}
        <div className="h-16 flex items-center justify-between px-4">
          <div className="w-8" />
          <h1 className="text-2xl font-medium tracking-wide">Legal Docs Maker</h1>
          <div className="w-8" />
        </div>

        {/* Welcome Section */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div>
            <p className="text-2xl mb-1 opacity-90">Welcome </p>
            <h2 className="text-2xl font-bold">Legal Docs Maker</h2>
          </div>

          <button
            onClick={onOpenProfile}
            className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10"
          >
            <User className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 relative z-20 -mt-16">
        <motion.div
          animate={{
            scale: isFocused ? 1.01 : 1,
            boxShadow: isFocused
              ? "0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.04)"
              : "0 10px 20px -3px rgb(0 0 0 / 0.03)",
          }}
          className={`
            relative flex items-center bg-white rounded-2xl p-1 transition-all duration-300
            border-2 ${isFocused ? "border-blue-400/30" : "border-transparent"}
          `}
        >
          <div className="pl-4 pr-2">
            <Search
              className={`w-5 h-5 transition-colors duration-300 ${isFocused ? "text-[#9b1c31]" : "text-gray-400"}`}
            />
          </div>
          <input
            type="text"
            placeholder={MESSAGES.dashboard.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full py-3 bg-transparent border-none focus:ring-0 text-[#1e3a5f] placeholder-gray-400 font-medium outline-none"
          />
          <div className="flex items-center gap-1 pr-2">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <div className="w-[1px] h-6 bg-gray-200 mx-1" />
            <button className="p-2 hover:bg-blue-50 text-blue-500 rounded-full transition-colors">
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Recent Searches Dropdown */}
        <AnimatePresence>
          {isFocused && (searchQuery || recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mx-5 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30"
            >
              <div className="p-4">
                {searchQuery ? (
                  <>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                      {MESSAGES.dashboard.suggestionsLabel}
                    </h4>
                    <div className="space-y-1">
                      {allMatchingForms.length > 0 ? (
                        allMatchingForms
                          .slice(0, 5)
                          .map(({ courtId, form }) => (
                            <button
                              key={form.id}
                              onClick={() => onSelectForm(form.id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[#9b1c31]/5 flex items-center justify-center group-hover:bg-[#9b1c31]/10 transition-colors">
                                <FileText className="w-4 h-4 text-[#9b1c31]" />
                              </div>
                              <div>
                                <span className="text-[#1e3a5f] font-semibold block leading-tight">
                                  {form.name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {courtTitles[courtId] || courtId}
                                </span>
                              </div>
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          {MESSAGES.dashboard.noMatchFound}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                      {MESSAGES.dashboard.recentLabel}
                    </h4>
                    <div className="space-y-1">
                      {recentSearches.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => setSearchQuery(term)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                        >
                          <Clock className="w-4 h-4 text-gray-300 group-hover:text-[#9b1c31]" />
                          <span className="text-gray-600 font-medium">{term}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 pt-10 pb-24 relative z-10 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCourts.map((court) => (
              <motion.div
                key={court.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectCourt(court.id)}
                className="group bg-white rounded-3xl p-5 shadow-[0_10px_25px_rgba(0,0,0,0.015)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)] transition-all cursor-pointer border border-gray-100/60 flex flex-col justify-between min-h-[185px]"
              >
                <div className="flex flex-col gap-4">
                  {/* Icon With Proper Tint */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300"
                    style={{ backgroundColor: `${court.color}12` }}
                  >
                    <court.icon
                      className="w-7 h-7"
                      style={{ color: court.color }}
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-[#1e3a5f] mb-1 group-hover:text-[#9b1c31] transition-colors leading-snug">
                      {court.title}
                    </h3>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed">
                      {court.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredCourts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-[#1e3a5f]">
              {MESSAGES.dashboard.noCourtsFound}
            </h3>
            <p className="text-gray-500">{MESSAGES.dashboard.noCourtsHint}</p>
          </motion.div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-2 py-2 flex justify-around items-center z-50">

        <button className="flex flex-col items-center text-[#0f4ba8]">
          <Home className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-medium">Home</span>
        </button>

        <button
  onClick={onOpenTemplates}
  className="flex flex-col items-center text-gray-500"
>
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-medium">Templates</span>
        </button>

        <button
  onClick={onOpenSavedPDFs}
  className="flex flex-col items-center text-gray-500"
>
          <Save className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-medium">Saved PDFs</span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center text-gray-500"
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-medium">Profile</span>
        </button>

      </div>
    </div>
  );
}