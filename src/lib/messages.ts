/**
 * messages.ts
 * ─────────────────────────────────────────────────────────────
 * Central store for ALL user-facing strings in the application.
 * Edit text here — no need to touch any component files.
 * ─────────────────────────────────────────────────────────────
 */

export const MESSAGES = {

  // ── Firebase Auth Errors ──
  auth: {
    emailAlreadyInUse:   "This email is already registered. Please log in instead.",
    weakPassword:        "Password must be at least 6 characters.",
    invalidEmail:        "Please enter a valid email address.",
    userNotFound:        "No account found with this email. Please sign up.",
    invalidCredential:   "No account found with this email. Please sign up.",
    wrongPassword:       "Incorrect password. Please try again.",
    tooManyRequests:     "Too many failed attempts. Please try again later.",
    networkFailed:       "Network error. Please check your internet connection.",
    genericError:        "An error occurred. Please try again.",
    emailRequired:       "Please enter your email address above first.",
    passwordResetSent:   "Password reset email sent! Please check your inbox.",
    passwordResetFailed: "Failed to send password reset email. Please try again.",
  },

  // ── Login / Sign Up Screen ──
  loginScreen: {
    tabLogin:          "Login",
    tabSignUp:         "Sign Up",
    placeholderName:   "Full Name",
    placeholderMobile: "Mobile Number",
    placeholderEmail:  "Email Address",
    placeholderPass:   "Password",
    btnLogin:          "Login",
    btnSignUp:         "Create Account",
    btnLoading:        "Please wait...",
    forgotPassword:    "Forgot Password?",
    noAccount:         "Don't have an account?",
    haveAccount:       "Already have an account?",
    switchToSignUp:    "Sign Up",
    switchToLogin:     "Login",
    logoAlt:           "Legal Docs Maker",
  },

  // ── Dashboard Screen ──
  dashboard: {
    welcome:            "Welcome 👋",
    appTitle:           "Legal Docs Maker",
    profileFallback:    "Profile",
    searchPlaceholder:  "Search legal drafts, courts, documents...",
    searchBarTop:       "Search legal documents...",
    suggestionsLabel:   "Suggestions",
    recentLabel:        "Recent Searches",
    noMatchFound:       "No matching documents found",
    noCourtsFound:      "No courts found",
    noCourtsHint:       "Try searching for something else",
    recentSearches:     ["High Court Bail", "Divorce Petition", "Property Sale Deed"],
  },

  // ── Editor Screen ──
  editor: {
    back:               "Back",
    langEnglish:        "English",
    langHindi:          "हिंदी",
    saveDraft:          "Save Draft",
    exportPDF:          "Export PDF",
    editorPlaceholder:  "Start typing your legal document here...",
    signatureLabel:     "Advocate Signature",
    signaturePrompt:    "Click to add signature",
    stampLabel:         "Stamp",
    stampPrompt:        "Click to add stamp",
    draftSaved:         "Draft saved successfully!",
  },

  // ── Profile Screen ──
  profile: {
    backToDashboard:    "Back to Dashboard",
    logout:             "Logout",
    adminPanel:         "Admin Panel",
    defaultName:        "Advocate Name",
    defaultEmail:       "advocate@example.com",
    defaultMobile:      "+91 98765 43210",
    userAlt:            "User",
    documentsCreated:   "Documents Created",
    totalSpent:         "Total Spent",
    savedDrafts:        "Saved Drafts",
    paymentHistory:     "Payment History",
  },

  // ── Payment Screen ──
  payment: {
    title:              "Complete Payment",
    subtitle:           "Choose your payment method",
    btnUPI:             "Pay with UPI",
    btnGooglePay:       "Google Pay",
    btnPhonePe:         "PhonePe",
    btnCard:            "Credit/Debit Card",
    feeLabel:           "Document Export Fee",
    feeAmount:          "₹99",
    successToast:       "Payment successful!",
    failedToast:        "Payment cancelled or failed",
    errorToast:         "Payment system error",
    appName:            "Legal Docs Maker",
    description:        "Document Export Fee",
    googlePayAlt:       "Google Pay",
  },

  // ── General / Shared ──
  general: {
    genericError: "Something went wrong. Please try again.",
    networkError: "No internet connection. Please check your network.",
  },
};

/**
 * Resolve a Firebase Auth error code to a user-friendly message.
 */
export function getAuthErrorMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use":   MESSAGES.auth.emailAlreadyInUse,
    "auth/weak-password":          MESSAGES.auth.weakPassword,
    "auth/invalid-email":          MESSAGES.auth.invalidEmail,
    "auth/user-not-found":         MESSAGES.auth.userNotFound,
    "auth/invalid-credential":     MESSAGES.auth.invalidCredential,
    "auth/wrong-password":         MESSAGES.auth.wrongPassword,
    "auth/too-many-requests":      MESSAGES.auth.tooManyRequests,
    "auth/network-request-failed": MESSAGES.auth.networkFailed,
  };
  return map[code] ?? MESSAGES.auth.genericError;
}
