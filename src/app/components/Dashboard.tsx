import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Search, Mic, X, Clock, FileText, Home, Save, FolderOpen, History, Globe } from "lucide-react";
import { courts, courtForms } from "../../lib/legalData";
import { MESSAGES, MESSAGES_HI } from "../../lib/messages";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { storage } from "../../lib/storage";

// ── Custom Court Logos ────────────────────────────────────────────────
import parentHighCourt from "../../assets/icons/high_court.png";
import parentDistrictCourt from "../../assets/icons/parent_district_court.png";
import parentFamilyCourt from "../../assets/icons/parent_family_court.png";
import parentJuvenileCourt from "../../assets/icons/parent_juvenile_court.png";
import parentRevenueCourt from "../../assets/icons/parent_revenue_court.png";
import parentForumCourt from "../../assets/icons/parent_forum_court.png";
import parentRegistrar from "../../assets/icons/parent_registrar.png";
import parentGeneralFiles from "../../assets/icons/general_format.png";
import headerIllustration from "../../assets/header_illustration.png";

export const COURT_LOGOS: Record<string, string> = {
  'high-court': parentHighCourt,
  'district-court': parentDistrictCourt,
  'family-court': parentFamilyCourt,
  'juvenile-court': parentJuvenileCourt,
  'revenue-court': parentRevenueCourt,
  'forum-court': parentForumCourt,
  'registrar': parentRegistrar,
  'file': parentGeneralFiles,
};

interface DashboardProps {
  onSelectCourt: (court: string) => void;
  onSelectForm: (formId: string) => void;
  onOpenProfile: () => void;
  onOpenUploadedFiles: () => void;
  onOpenSavedPDFs: () => void;
  onOpenDrafts: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  userData: any;
}

export function Dashboard({
  onSelectCourt,
  onSelectForm,
  onOpenProfile,
  onOpenUploadedFiles,
  onOpenSavedPDFs,
  onOpenDrafts,
  userData,
}: DashboardProps) {
  const [language] = useState<"en" | "hi">(() => {
    return (storage.loadLanguage() as "en" | "hi") || "hi";
  });
  const M = language === "hi" ? MESSAGES_HI.dashboard : MESSAGES.dashboard;

  const handleLanguageToggle = () => {
    const newLang = language === "hi" ? "en" : "hi";
    storage.saveLanguage(newLang);
    window.location.reload();
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches] = useState(MESSAGES.dashboard.recentSearches);

 const startVoiceSearch = async () => {
  try {
    const permission = await SpeechRecognition.requestPermissions();

    if (!permission.speechRecognition) {
      alert("Microphone permission denied");
      return;
    }

    const available = await SpeechRecognition.available();

    if (!available.available) {
      alert("Speech recognition not available");
      return;
    }

    const result = await SpeechRecognition.start({
      language: "en-IN",
      maxResults: 1,
      prompt: "Speak now",
      partialResults: false,
    });

    if (result.matches && result.matches.length > 0) {
      setSearchQuery(result.matches[0]);
    }
  } catch (error) {
    console.error("Speech recognition error:", error);
  }
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
    let visibleCourts = courts.filter(court => court.id !== "registrar" && court.id !== "file");
    if (!query) return visibleCourts;

    return visibleCourts.filter((court) => {
      const courtTitle = language === "hi" ? (court.titleHi || court.title) : court.title;
      const courtMatch =
        courtTitle.toLowerCase().includes(query) ||
        court.description.toLowerCase().includes(query);
      if (courtMatch) return true;

      const forms = courtForms[court.id] || [];
      return forms.some(
        (form) =>
          form.name.toLowerCase().includes(query) ||
          form.description.toLowerCase().includes(query),
      );
    });
  }, [searchQuery, language]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      
      {/* ─── WELCOME HEADER ─────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden text-white"
        style={{
          background: "linear-gradient(135deg, #001252 0%, #0033aa 60%, #0040cc 100%)",
          paddingBottom: "72px",
          minHeight: "180px"
        }}
      >
        {/* Background Illustration – right half, blended with gradient */}
        <img
          src={headerIllustration}
          alt=""
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            height: "100%",
            width: "55%",
            objectFit: "cover",
            objectPosition: "left center",
            pointerEvents: "none",
            opacity: 0.92,
            zIndex: 1,
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,1) 60%)",
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,1) 60%)"
          }}
        />

        {/* Profile button – top-right corner, above everything */}
        <button
          onClick={onOpenProfile}
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            zIndex: 30,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#2a6ef5",
            border: "2px solid rgba(255,255,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
          }}
        >
          <User style={{ width: 22, height: 22, color: "white" }} />
        </button>



        {/* Text content – left side, starts below status bar */}
        <div style={{ position: "relative", zIndex: 10, padding: "0px 20px 8px" }}>
          {/* Spacer to push text below the status bar + profile button row */}
          <div style={{ height: 60 }} />
          <p style={{ margin: 0, fontSize: 17, fontWeight: 400, opacity: 0.9 }}>
            {M.welcome}
          </p>
          <h2 style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>
            {M.appTitle}
          </h2>
        </div>
      </div>

      {/* ─── SEARCH BAR ─────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-5 relative z-20" style={{ marginTop: "-24px" }}>
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
            <Search className={`w-5 h-5 transition-colors ${isFocused ? 'text-[#9b1c31]' : 'text-[#0f4ba8]/60'}`} />
          </div>
          <input
            type="text"
            placeholder={M.searchPlaceholder}
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
            <button
                    onClick={startVoiceSearch}
                    className="p-2 hover:bg-blue-50 text-blue-500 rounded-full transition-colors"
>              <Mic className="w-5 h-5" />
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
                      {M.suggestionsLabel}
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
                          {M.noMatchFound}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-5 pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      {M.recentLabel}
                    </div>
                    <div className="px-2 flex flex-wrap gap-2">
                      {M.recentSearches.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => setSearchQuery(term)}
                          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm transition-colors flex items-center gap-2 border border-gray-100"
                        >
                          <Search className="w-3 h-3 text-gray-400" />
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
                  <div
                    className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 duration-300 bg-gray-50 border border-gray-100"
                  >
                    <img
                      src={COURT_LOGOS[court.id] || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=128&auto=format&fit=crop&q=60"}
                      alt={court.title}
                      className="w-14 h-14 object-cover rounded-2xl"
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-[#1e3a5f] mb-1 group-hover:text-[#9b1c31] transition-colors leading-snug">
                      {language === "hi" ? (court.titleHi || court.title) : court.title}
                    </h3>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed">
                      {language === "hi" ? (court.descriptionHi || court.description) : court.description}
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
            <div className="bg-white/80 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">{M.noCourtsFound}</h3>
            <p className="text-gray-500 font-medium">{M.noCourtsHint}</p>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button for New File */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelectCourt('file')}
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#0f4ba8] text-white rounded-2xl shadow-lg shadow-[#0f4ba8]/30 flex items-center justify-center z-40 border border-white/20"
      >
        <div className="flex flex-col items-center">
          <FileText className="w-6 h-6 mb-0.5" />
          <span className="text-[10px] font-bold leading-none">{language === "hi" ? "नई फ़ाइल" : "New File"}</span>
        </div>
      </motion.button>

      {/* Bottom Navigation Menu */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-100 flex items-center justify-around px-6 z-40 pb-safe">
        
        <button className="flex flex-col items-center text-[#0f4ba8]">
          <Home className="w-6 h-6" />
          <span className="text-[11px] mt-1 font-bold">{language === "hi" ? "होम" : "Home"}</span>
        </button>

        <button
          onClick={onOpenSavedPDFs}
          className="flex flex-col items-center text-gray-500 hover:text-[#0f4ba8] transition-colors"
        >
          <Save className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-medium">{language === "hi" ? "सेव्ड पीडीएफ" : "Saved PDFs"}</span>
        </button>

        <button onClick={onOpenDrafts} className="flex flex-col items-center text-gray-500">
          <History className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-medium">{language === "hi" ? "ड्राफ्ट्स" : "Drafts"}</span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center text-gray-500 hover:text-[#0f4ba8] transition-colors"
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] mt-1 font-medium">{language === "hi" ? "प्रोफ़ाइल" : "Profile"}</span>
        </button>

      </div>
    </div>
  );
}