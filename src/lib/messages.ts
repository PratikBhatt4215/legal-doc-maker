import { translations } from "./i18n";

export const MESSAGES = translations.en as any;
export const MESSAGES_HI = translations.hi as any;

/**
 * Resolve a Firebase Auth error code to a user-friendly message.
 */
export function getAuthErrorMessage(code: string, language: string = "en"): string {
  const M = language === "hi" ? MESSAGES_HI.auth : MESSAGES.auth;
  const map: Record<string, string> = {
    "auth/email-already-in-use":   M.emailAlreadyInUse,
    "auth/weak-password":          M.weakPassword,
    "auth/invalid-email":          M.invalidEmail,
    "auth/user-not-found":         M.userNotFound,
    "auth/invalid-credential":     M.invalidCredential,
    "auth/wrong-password":         M.wrongPassword,
    "auth/too-many-requests":      M.tooManyRequests,
    "auth/network-request-failed": M.networkFailed,
  };
  return map[code] ?? M.genericError;
}
