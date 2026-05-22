import { motion } from "motion/react";
import { Globe, Sparkles } from "lucide-react";
import { t, Language } from "../../lib/i18n";

interface LanguageSelectionProps {
  onSelectLanguage: (lang: Language) => void;
}

export function LanguageSelection({ onSelectLanguage }: LanguageSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-400/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="inline-block p-4 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl mb-6"
          >
            <Globe className="w-20 h-20 text-[#1e3a5f]" />
          </motion.div>

          <h1 className="text-4xl font-bold text-[#1e3a5f] mb-3 flex items-center justify-center gap-2">
            Choose Your Language
            <Sparkles className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-xl text-gray-700 font-medium">अपनी भाषा चुनें</p>
        </motion.div>

        <div className="space-y-5">
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectLanguage("en")}
            className="w-full bg-white/90 backdrop-blur-lg border-3 border-[#1e3a5f] text-[#1e3a5f] py-5 px-8 rounded-2xl font-bold text-xl shadow-2xl hover:bg-[#1e3a5f] hover:text-white transition-all duration-300 group"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-3xl">🇬🇧</span>
              <span>English</span>
              <motion.span
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ x: -10 }}
                whileHover={{ x: 0 }}
              >
                →
              </motion.span>
            </span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectLanguage("hi")}
            className="w-full bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] text-white py-5 px-8 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 group"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-3xl">🇮🇳</span>
              <span>हिन्दी (Hindi)</span>
              <motion.span
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ x: -10 }}
                whileHover={{ x: 0 }}
              >
                →
              </motion.span>
            </span>
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-600 mt-8 px-4"
        >
          Select your preferred language to continue
        </motion.p>
      </div>
    </div>
  );
}
