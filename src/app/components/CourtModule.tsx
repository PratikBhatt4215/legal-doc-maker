import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ChevronRight, Search, X, FileText, Globe } from "lucide-react";
import { useState, useMemo } from "react";
import { courts } from "../../lib/legalData";
import {
  getTemplatesByCategory,
  getAvailableLanguages,
  getTemplatesForCourt,
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_DISPLAY_NAMES_HI,
  type Language,
  type TemplateFile,
} from "../../lib/templateRegistry";
import { storage } from "../../lib/storage";
import { MESSAGES, MESSAGES_HI } from "../../lib/messages";

// ── Category icon mapping ─────────────────────────────────────────────
import iconCivil from "../../assets/icons/civil_cases.png";
import iconCriminal from "../../assets/icons/criminal_case.png";
import iconClaims from "../../assets/icons/claims.png";
import iconAgreement from "../../assets/icons/agreement.png";
import iconGeneral from "../../assets/icons/general_format.png";
import iconMarriage from "../../assets/icons/marriage.png";
import iconRti from "../../assets/icons/rti.png";
import iconHighCourt from "../../assets/icons/high_court.png";

const CATEGORY_ICONS: Record<string, string> = {
  // English category keys
  'Civil Cases':           iconCivil,
  'Criminal Cases':        iconCriminal,
  'Claims':                iconClaims,
  'CIVIL':                 iconCivil,
  'CRIMINAL':              iconCriminal,
  'CLAIM':                 iconClaims,
  'Agreement Draft':       iconAgreement,
  'Agreements Drafts':     iconAgreement,
  'Agreements & Drafts':   iconAgreement,
  'General Formats':       iconGeneral,
  'General Forms':         iconGeneral,
  'formate':               iconGeneral,
  'Marriage':              iconMarriage,
  'marriage':              iconMarriage,
  'RTI':                   iconRti,
  'High Court':            iconHighCourt,
  // Hindi category keys
  'दीवानी मामले':           iconCivil,
  'आपराधिक मामले':          iconCriminal,
  'दावे':                   iconClaims,
  'विवाह':                  iconMarriage,
  'आरटीआई':                 iconRti,
  'दस्तावेज़ और समझौते':     iconAgreement,
  'सामान्य प्रारूप':         iconGeneral,
};

function getCategoryIcon(name: string): string | undefined {
  // Direct match
  if (CATEGORY_ICONS[name]) return CATEGORY_ICONS[name];
  // Partial/case-insensitive match
  const lname = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (lname.includes(key.toLowerCase()) || key.toLowerCase().includes(lname)) return val;
  }
  return undefined;
}

// ── Custom Court Logos ────────────────────────────────────────────────
import parentDistrictCourt from "../../assets/icons/parent_district_court.png";
import parentFamilyCourt from "../../assets/icons/parent_family_court.png";
import parentJuvenileCourt from "../../assets/icons/parent_juvenile_court.png";
import parentRevenueCourt from "../../assets/icons/parent_revenue_court.png";
import parentForumCourt from "../../assets/icons/parent_forum_court.png";
import parentRegistrar from "../../assets/icons/parent_registrar.png";

const COURT_LOGOS: Record<string, string> = {
  'high-court': iconHighCourt,
  'district-court': parentDistrictCourt,
  'family-court': parentFamilyCourt,
  'juvenile-court': parentJuvenileCourt,
  'revenue-court': parentRevenueCourt,
  'forum-court': parentForumCourt,
  'registrar': parentRegistrar,
  'file': iconGeneral,
};

interface CourtModuleProps {
  courtId: string;
  onBack: () => void;
  onSelectForm: (templateId: string) => void;
}

// ── Recursive Folder Node and View Rendering ──────────────────────────
interface FolderNode {
  name: string;
  subfolders: Record<string, FolderNode>;
  templates: TemplateFile[];
}

function FolderView({
  node,
  level = 0,
  onSelectTemplate,
  language,
  searchActive,
}: {
  node: FolderNode;
  level?: number;
  onSelectTemplate: (t: TemplateFile) => void;
  language: Language;
  searchActive: boolean;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  const subfolders = Object.entries(node.subfolders);
  const templates = node.templates;

  return (
    <div className="flex flex-col w-full">
      {/* Subfolders */}
      {subfolders.map(([folderKey, subNode]) => {
        const isFolderExpanded = expandedFolders[folderKey] || searchActive;
        const icon = getCategoryIcon(subNode.name) || getCategoryIcon(folderKey);
        return (
          <div key={folderKey} className="w-full flex flex-col">
            <button
              onClick={() => toggleFolder(folderKey)}
              style={{ paddingLeft: `${(level * 16) + 16}px` }}
              className="w-full flex items-center justify-between py-3.5 pr-4 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-amber-50">
                  {icon
                    ? <img src={icon} alt={subNode.name} className="w-9 h-9 object-cover rounded-xl" />
                    : <span className="text-amber-500 text-xl">📁</span>
                  }
                </div>
                <span className="text-gray-700 text-sm font-semibold leading-none">
                  {subNode.name}
                </span>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                  isFolderExpanded ? "rotate-90" : ""
                }`}
              />
            </button>
            
            <AnimatePresence>
              {isFolderExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full overflow-hidden border-l-2 border-gray-100/50"
                >
                  <FolderView
                    node={subNode}
                    level={level + 1}
                    onSelectTemplate={onSelectTemplate}
                    language={language}
                    searchActive={searchActive}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Templates */}
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelectTemplate(template)}
          style={{ paddingLeft: `${(level * 16) + 16}px` }}
          className="w-full flex items-center gap-3 py-3.5 pr-4 hover:bg-[#9b1c31]/5 text-left border-b border-gray-50 group transition-colors"
        >
          {/* File/Document Icon */}
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#9b1c31]/10 transition-colors">
            <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#9b1c31] transition-colors" />
          </div>

          {/* Template name */}
          <span className="flex-1 text-[#1e3a5f] text-sm font-medium group-hover:text-[#9b1c31] transition-colors leading-snug">
            {template.name}
          </span>

          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#9b1c31] flex-shrink-0 transition-colors" />
        </button>
      ))}
    </div>
  );
}

export function CourtModule({ courtId, onBack, onSelectForm }: CourtModuleProps) {
  const court = courts.find(c => c.id === courtId);
  const availableLangs = useMemo(() => getAvailableLanguages(courtId), [courtId]);
  const [language, setLanguage] = useState<Language>(() => {
    return (storage.loadLanguage() as Language) || "hi";
  });

  const title = language === "hi" ? (court?.titleHi || court?.title || "Court") : (court?.title || "Court");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Navigation path stack: e.g. ["Civil Cases", "for plaintiff"]
  const [navPath, setNavPath] = useState<string[]>([]);

  // Switch language
  const handleLangSwitch = (lang: Language) => {
    setLanguage(lang);
    storage.saveLanguage(lang);
    setNavPath([]); // reset path on language switch
  };

  const handleTemplateClick = (template: TemplateFile) => {
    onSelectForm(template.id);
  };

  // Get all templates for the court
  const allTemplates = useMemo(() => getTemplatesForCourt(courtId), [courtId]);

  // Filter templates choosing the best language representation
  const displayedTemplates = useMemo(() => {
    return allTemplates.filter(t => t.language === language);
  }, [allTemplates, language]);

  // Search filter at the template level
  const filteredTemplates = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return displayedTemplates;

    return displayedTemplates.filter(t => {
      if (t.name.toLowerCase().includes(query)) return true;
      if (t.category.toLowerCase().includes(query)) return true;
      if (t.description.toLowerCase().includes(query)) return true;
      if (t.subPath && t.subPath.some(folder => folder.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [displayedTemplates, searchQuery]);

  // Group filtered templates by recursive category trees
  const categoryTrees = useMemo(() => {
    const trees: Record<string, FolderNode> = {};

    for (const t of filteredTemplates) {
      // Find or create top-level category node
      const catUpper = t.category.toUpperCase();
      const topCatName = language === "hi" 
        ? (CATEGORY_DISPLAY_NAMES_HI[catUpper] || CATEGORY_DISPLAY_NAMES[catUpper] || t.category)
        : (CATEGORY_DISPLAY_NAMES[catUpper] || t.category);
      if (!trees[topCatName]) {
        trees[topCatName] = {
          name: topCatName,
          subfolders: {},
          templates: [],
        };
      }

      // Navigate down subPath
      let currentNode = trees[topCatName];
      if (t.subPath) {
        for (const s of t.subPath) {
          if (!currentNode.subfolders[s]) {
            const sUpper = s.toUpperCase();
            const folderDisplayName = language === "hi" 
              ? (CATEGORY_DISPLAY_NAMES_HI[sUpper] || CATEGORY_DISPLAY_NAMES[sUpper] || s)
              : (CATEGORY_DISPLAY_NAMES[sUpper] || s);
            currentNode.subfolders[s] = {
              name: folderDisplayName,
              subfolders: {},
              templates: [],
            };
          }
          currentNode = currentNode.subfolders[s];
        }
      }
      currentNode.templates.push(t);
    }
    return trees;
  }, [filteredTemplates, language]);

  // Count total templates in all trees
  const totalCount = useMemo(() => {
    const countTemplates = (node: FolderNode): number => {
      let count = node.templates.length;
      for (const sub of Object.values(node.subfolders)) {
        count += countTemplates(sub);
      }
      return count;
    };
    return Object.values(categoryTrees).reduce((acc, node) => acc + countTemplates(node), 0);
  }, [categoryTrees]);

  // Resolve the currently active folder node based on navPath
  const activeNode = useMemo(() => {
    if (navPath.length === 0) {
      return {
        name: title,
        subfolders: categoryTrees,
        templates: [],
      };
    }

    let current: FolderNode | undefined = categoryTrees[navPath[0]];
    for (let i = 1; i < navPath.length; i++) {
      if (!current) break;
      current = current.subfolders[navPath[i]];
    }
    return current;
  }, [categoryTrees, navPath, title]);

  const handleBack = () => {
    if (navPath.length > 0) {
      setNavPath(prev => prev.slice(0, -1)); // go up one folder level
    } else {
      onBack(); // go back to court selection
    }
  };

  const countTemplatesRecursively = (node: FolderNode): number => {
    let count = node.templates.length;
    for (const sub of Object.values(node.subfolders)) {
      count += countTemplatesRecursively(sub);
    }
    return count;
  };

  // Helper to jump to a specific breadcrumb index
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setNavPath([]);
    } else {
      setNavPath(navPath.slice(0, index + 1));
    }
  };

  const currentSubfolders = activeNode ? Object.entries(activeNode.subfolders) : [];
  const currentTemplates = activeNode ? activeNode.templates : [];

  return (
    <div className="min-h-screen bg-[#f4f6f9]">

      {/* ── Header ── */}
      <div className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[#1e3a5f] hover:bg-gray-100 p-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={language === "hi" ? "दस्तावेज़ खोजें..." : "Search templates..."}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (e.target.value !== "") {
                  setNavPath([]); // reset navigation path when searching to search globally
                }
              }}
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
        </div>

        {/* Court title + stats bar */}
        <div className="px-4 pb-3 flex items-center gap-3">
          {court && COURT_LOGOS[court.id] && (
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-gray-50 border border-gray-100">
              <img
                src={COURT_LOGOS[court.id]}
                alt={title}
                className="w-8 h-8 object-cover rounded-xl"
              />
            </div>
          )}
          <h1 className="text-base font-extrabold text-[#1e3a5f]">{title}</h1>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 font-medium">
            {totalCount} {language === "hi" ? "टेम्पलेट्स" : "templates"}
          </span>
          <span className="text-xs text-gray-400">•</span>
          {/* Language toggle */}
          <button
            onClick={() => handleLangSwitch(language === "hi" ? "en" : "hi")}
            className="flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-all border border-emerald-200 shadow-sm cursor-pointer"
          >
            <Globe className="w-3 h-3 text-emerald-600" />
            <span>{language === "hi" ? "हिंदी" : "English"}</span>
          </button>
        </div>

        {/* Breadcrumbs Navigation Bar */}
        <div className="bg-gray-50/80 backdrop-blur border-t border-gray-100 px-4 py-2 flex items-center gap-1 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className="text-gray-500 hover:text-[#9b1c31] font-medium"
          >
            {title}
          </button>
          {navPath.map((folder, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`font-semibold ${
                  idx === navPath.length - 1 ? "text-[#9b1c31]" : "text-gray-500 hover:text-[#9b1c31]"
                }`}
              >
                {folder}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Directory Content Explorer ── */}
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Empty Search Result */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-[#1e3a5f]">
              {language === "hi" ? MESSAGES_HI.dashboard.noMatchFound : MESSAGES.dashboard.noMatchFound}
            </h3>
            <p className="text-gray-500 mt-1 text-sm">
              {language === "hi" ? "कोई मैचिंग फाइल नहीं मिली" : "No matching files found"}
            </p>
          </div>
        )}

        {/* Folders & Files Wrapper */}
        {filteredTemplates.length > 0 && activeNode && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            
            {/* 📁 LIST SUBFOLDERS */}
            {currentSubfolders.map(([folderKey, subNode]) => {
              const subTemplatesCount = countTemplatesRecursively(subNode);
              const icon = getCategoryIcon(subNode.name) || getCategoryIcon(folderKey);
              
              return (
                <button
                  key={folderKey}
                  onClick={() => setNavPath(prev => [...prev, folderKey])}
                  className="w-full flex items-center justify-between py-4 px-4 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-amber-50 group-hover:bg-amber-100 transition-colors">
                      {icon
                        ? <img src={icon} alt={subNode.name} className="w-11 h-11 object-cover rounded-xl" />
                        : <span className="text-2xl">📁</span>
                      }
                    </div>
                    <div className="text-left">
                      <span className="text-gray-800 text-sm font-bold leading-tight group-hover:text-[#9b1c31] transition-colors">
                        {subNode.name}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {subTemplatesCount} {language === "hi" ? "दस्तावेज़" : "documents"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#9b1c31] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })}

            {/* 📄 LIST TEMPLATE FILES */}
            {currentTemplates.map((template, idx) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={`w-full flex items-center gap-3 py-4 px-4 hover:bg-[#9b1c31]/5 text-left group transition-colors ${
                  idx !== currentTemplates.length - 1 || currentSubfolders.length > 0 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#9b1c31]/10 transition-colors">
                  <FileText className="w-5 h-5 text-blue-500 group-hover:text-[#9b1c31] transition-colors" />
                </div>
                <div className="flex-1">
                  <span className="text-[#1e3a5f] text-sm font-bold group-hover:text-[#9b1c31] transition-colors leading-tight">
                    {template.name}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#9b1c31] flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
