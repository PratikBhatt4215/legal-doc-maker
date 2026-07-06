import enUs from "../assets/locales/en_us.json";
import hiUs from "../assets/locales/hi_us.json";

export const translations = {
  en: enUs,
  hi: hiUs
};

export type Language = 'en' | 'hi';

/**
 * Get translation function.
 * Supports dot notation lookup (e.g. t(lang, "terms.title"))
 */
export const t = (lang: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[lang === 'hi' ? 'hi' : 'en'];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};
