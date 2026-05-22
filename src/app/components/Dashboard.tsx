import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Search, Mic, X, Clock, FileText } from "lucide-react";
//import { courts, courtForms } from "../lib/legalData";
import { courts, courtForms } from "../../lib/legalData";
import logo from "../../imports/logo.png";


interface DashboardProps {
  onSelectCourt: (court: string) => void;
  onSelectForm: (formId: string) => void;
  onOpenProfile: () => void;
  userData: any;
}

export function Dashboard({
  onSelectCourt,
  onSelectForm,
  onOpenProfile,
  userData,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches] = useState([
    "High Court Bail",
    "Divorce Petition",
    "Property Sale Deed",
  ]);

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
      // Check court title/description
      const courtMatch =
        court.title.toLowerCase().includes(query) ||
        court.description.toLowerCase().includes(query);
      if (courtMatch) return true;

      // Check forms within this court
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
      <div className="bg-[#0f4ba8] backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          

          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search legal documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9b1c31]/20 focus:border-[#9b1c31] transition-all text-sm font-medium"
              />
            </div>
          </div>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onOpenProfile}
            className="flex items-center gap-2 text-[#1e3a5f] bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all border border-gray-200 shadow-sm flex-shrink-0"
          >
            <User className="w-5 h-5 text-[#9b1c31]" />
            <span className="hidden sm:inline font-medium">
              {userData?.displayName || "Profile"}
            </span>
          </motion.button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-[#1e3a5f] mb-6">
          <p className="text-2xl">Welcome 👋</p>

          <h1 className="text-4xl font-bold">Legal Docs Maker</h1>
        </div>
       

        {/* Modern Search Bar */}
        <div className="max-w-2xl mx-auto mb-12 relative z-20">
          <motion.div
            animate={{
              scale: isFocused ? 1.02 : 1,
              boxShadow: isFocused
                ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
            className={`
              relative flex items-center bg-white/70 backdrop-blur-xl rounded-2xl p-1 transition-all duration-300
              border-2 ${isFocused ? "border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-gray-100"}
              group
            `}
          >
            <div className="pl-4 pr-2">
              <Search
                className={`w-5 h-5 transition-colors duration-300 ${isFocused ? "text-[#9b1c31]" : "text-gray-400"}`}
              />
            </div>
            <input
              type="text"
              placeholder="Search legal drafts, courts, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              className="w-full py-3 bg-transparent border-none focus:ring-0 text-[#1e3a5f] placeholder-gray-400 font-medium"
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

          {/* Border glow effects */}
          {isFocused && (
            <>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-[#9b1c31] rounded-2xl blur opacity-20 -z-10 animate-pulse" />
            </>
          )}

          {/* Recent Searches Dropdown */}
          <AnimatePresence>
            {isFocused && (searchQuery || recentSearches.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
              >
                <div className="p-4">
                  {searchQuery ? (
                    <>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                        Suggestions
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
                            No matching documents found
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                        Recent Searches
                      </h4>
                      <div className="space-y-1">
                        {recentSearches.map((term, i) => (
                          <button
                            key={i}
                            onClick={() => setSearchQuery(term)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                          >
                            <Clock className="w-4 h-4 text-gray-300 group-hover:text-[#9b1c31]" />
                            <span className="text-gray-600 font-medium">
                              {term}
                            </span>
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
        <div className="grid grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredCourts.map((court, index) => (
              <motion.div
                key={court.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                whileHover={{
                  y: -8,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectCourt(court.id)}
                                // className="group bg-white rounded-3xl p-7 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(155,28,49,0.1)] transition-all cursor-pointer border border-gray-100 relative overflow-hidden"

                className="group bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(155,28,49,0.1)] transition-all cursor-pointer border border-gray-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#9b1c31]" />
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
                    style={{ backgroundColor: `${court.color}10` }}
                  >
                    <court.icon
                      className="w-8 h-8"
                      style={{ color: court.color }}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-[#1e3a5f] mb-2 group-hover:text-[#9b1c31] transition-colors">
                      {court.title}
                    </h3>
                    <p className="text-gray-500 leading-relaxed font-medium">
                      {court.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

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
              No courts found
            </h3>
            <p className="text-gray-500">Try searching for something else</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
