const fs = require('fs');

const engContent = fs.readFileSync('terms_en.txt', 'utf8');
const hiContent = fs.readFileSync('terms_hi.txt', 'utf8');

const i18nTemplate = `// Multilingual translations for the app

export const translations = {
  en: {
    // Splash Screen
    splash: {
      tagline: "Draft Smart. Draft Legal."
    },

    // Language Selection
    language: {
      title: "Choose Your Language",
      subtitle: "Select your preferred language",
      english: "English",
      hindi: "हिन्दी (Hindi)"
    },

    // Terms & Conditions
    terms: {
      title: "Terms & Conditions",
      subtitle: "Please read carefully before proceeding",
      acceptCheckbox: "I have read and agree to the Terms & Conditions",
      continueButton: "Continue",
      backButton: "Back",
      disclaimer: "Disclaimer: This App is a productivity tool and not a substitute for professional legal judgment.",
      content: \`
${engContent.replace(/`/g, '\\`')}
      \`
    },

    // Common
    common: {
      loading: "Loading...",
      error: "An error occurred",
      success: "Success",
      cancel: "Cancel",
      confirm: "Confirm"
    }
  },

  hi: {
    // Splash Screen
    splash: {
      tagline: "स्मार्ट ड्राफ्ट करें। कानूनी ड्राफ्ट करें।"
    },

    // Language Selection
    language: {
      title: "अपनी भाषा चुनें",
      subtitle: "अपनी पसंदीदा भाषा चुनें",
      english: "English (अंग्रेज़ी)",
      hindi: "हिन्दी"
    },

    // Terms & Conditions
    terms: {
      title: "नियम और शर्तें",
      subtitle: "कृपया आगे बढ़ने से पहले ध्यान से पढ़ें",
      acceptCheckbox: "मैंने नियम और शर्तें पढ़ ली हैं और उनसे सहमत हूं",
      continueButton: "जारी रखें",
      backButton: "वापस",
      disclaimer: "अस्वीकरण: यह ऐप एक उत्पादकता उपकरण है और पेशेवर कानूनी निर्णय का विकल्प नहीं है।",
      content: \`
${hiContent.replace(/`/g, '\\`')}
      \`
    },

    // Common
    common: {
      loading: "लोड हो रहा है...",
      error: "एक त्रुटि हुई",
      success: "सफलता",
      cancel: "रद्द करें",
      confirm: "पुष्टि करें"
    }
  }
};

export type Language = 'en' | 'hi';
export type TranslationKey = keyof typeof translations.en;

// Get translation function
export const t = (lang: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};
`;

fs.writeFileSync('src/lib/i18n.ts', i18nTemplate);
