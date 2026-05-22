import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, Shield } from "lucide-react";
import { storage } from "../../lib/storage";
import { t, Language } from "../../lib/i18n";
import ReactMarkdown from 'react-markdown';

interface TermsAndConditionsProps {
  language: Language;
  onAccept: () => void;
  onBack: () => void;
}

export function TermsAndConditions({ language, onAccept, onBack }: TermsAndConditionsProps) {
  const [accepted, setAccepted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (isBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (accepted) {
      storage.saveLanguage(language);
      localStorage.setItem('termsAccepted', 'true');
      localStorage.setItem('termsAcceptedDate', new Date().toISOString());
      onAccept();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#1e3a5f] hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t(language, 'terms.backButton')}</span>
          </button>
          <div className="flex items-center gap-2 text-[#1e3a5f]">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Legal Docs Maker</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl p-8 mb-6 border border-gray-200/50"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#1e3a5f]/10 rounded-2xl">
                <FileText className="w-8 h-8 text-[#1e3a5f]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a5f]">
                  {t(language, 'terms.title')}
                </h1>
                <p className="text-gray-600 mt-1">
                  {t(language, 'terms.subtitle')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Terms Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden mb-6"
          >
            <div
              onScroll={handleScroll}
              className="prose prose-slate max-w-none p-8 overflow-y-auto"
              style={{
                maxHeight: '60vh',
                fontFamily: language === 'hi' ? 'Noto Sans Devanagari, sans-serif' : 'inherit'
              }}
            >
              <ReactMarkdown>
                {t(language, 'terms.content')}
              </ReactMarkdown>
            </div>

            {/* Scroll Indicator */}
            {!hasScrolledToBottom && (
              <div className="bg-gradient-to-t from-white via-white to-transparent absolute bottom-0 left-0 right-0 h-20 flex items-end justify-center pb-4 pointer-events-none">
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-sm text-gray-500"
                >
                  ↓ Scroll to read more
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Acceptance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200/50 mb-6"
          >
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    accepted
                      ? 'bg-[#1e3a5f] border-[#1e3a5f]'
                      : 'bg-white border-gray-300 group-hover:border-[#1e3a5f]'
                  }`}
                >
                  {accepted && <CheckCircle2 className="w-5 h-5 text-white" />}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium leading-relaxed">
                  {t(language, 'terms.acceptCheckbox')}
                </p>
              </div>
            </label>

            <motion.button
              whileHover={{ scale: accepted ? 1.02 : 1 }}
              whileTap={{ scale: accepted ? 0.98 : 1 }}
              onClick={handleAccept}
              disabled={!accepted}
              className={`w-full mt-6 py-4 px-6 rounded-xl font-semibold text-lg shadow-lg transition-all ${
                accepted
                  ? 'bg-[#1e3a5f] text-white hover:bg-[#2a4a6f] cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t(language, 'terms.continueButton')}
            </motion.button>
          </motion.div>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center"
          >
            <p className="text-amber-800 text-sm font-medium leading-relaxed">
              {t(language, 'terms.disclaimer')}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
