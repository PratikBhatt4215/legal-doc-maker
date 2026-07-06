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
    welcome:            "Welcome to 👋",
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
    feeAmount:          "₹10",
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

export const MESSAGES_HI = {
  auth: {
    emailAlreadyInUse:   "यह ईमेल पहले से पंजीकृत है। कृपया इसके बजाय लॉग इन करें।",
    weakPassword:        "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
    invalidEmail:        "कृपया एक मान्य ईमेल पता दर्ज करें।",
    userNotFound:        "इस ईमेल से कोई खाता नहीं मिला। कृपया साइन अप करें।",
    invalidCredential:   "इस ईमेल से कोई खाता नहीं मिला। कृपया साइन अप करें।",
    wrongPassword:       "गलत पासवर्ड। कृपया पुनः प्रयास करें।",
    tooManyRequests:     "बहुत सारे विफल प्रयास। कृपया बाद में पुनः प्रयास करें।",
    networkFailed:       "नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।",
    genericError:        "एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
    emailRequired:       "कृपया पहले अपना ईमेल पता दर्ज करें।",
    passwordResetSent:   "पासवर्ड रीसेट ईमेल भेजा गया! कृपया अपना इनबॉक्स देखें।",
    passwordResetFailed: "पासवर्ड रीसेट ईमेल भेजने में विफल। कृपया पुनः प्रयास करें।",
  },
  loginScreen: {
    tabLogin:          "लॉग इन",
    tabSignUp:         "साइन अप",
    placeholderName:   "पूरा नाम",
    placeholderMobile: "मोबाइल नंबर",
    placeholderEmail:  "ईमेल पता",
    placeholderPass:   "पासवर्ड",
    btnLogin:          "लॉग इन करें",
    btnSignUp:         "खाता बनाएं",
    btnLoading:        "कृपया प्रतीक्षा करें...",
    forgotPassword:    "पासवर्ड भूल गए?",
    noAccount:         "खाता नहीं है?",
    haveAccount:       "क्या आपके पास पहले से खाता है?",
    switchToSignUp:    "साइन अप करें",
    switchToLogin:     "लॉग इन करें",
    logoAlt:           "लीगल डॉक्स मेकर",
  },
  dashboard: {
    welcome:            "नमस्ते 👋",
    appTitle:           "लीगल डॉक्स मेकर",
    profileFallback:    "प्रोफ़ाइल",
    searchPlaceholder:  "कानूनी ड्राफ्ट, न्यायालय, दस्तावेज़ खोजें...",
    searchBarTop:       "कानूनी दस्तावेज़ खोजें...",
    suggestionsLabel:   "सुझाव",
    recentLabel:        "हाल की खोजें",
    noMatchFound:       "कोई मेल खाने वाला दस्तावेज़ नहीं मिला",
    noCourtsFound:      "कोई न्यायालय नहीं मिला",
    noCourtsHint:       "कुछ और खोजने का प्रयास करें",
    recentSearches:     ["हाई कोर्ट जमानत", "तलाक याचिका", "संपत्ति बिक्री विलेख"],
  },
  editor: {
    back:               "वापस",
    langEnglish:        "English",
    langHindi:          "हिंदी",
    saveDraft:          "ड्राफ्ट सहेजें",
    exportPDF:          "पीडीएफ निर्यात करें",
    editorPlaceholder:  "अपना कानूनी दस्तावेज़ यहाँ टाइप करना शुरू करें...",
    signatureLabel:     "अधिवक्ता के हस्ताक्षर",
    signaturePrompt:    "हस्ताक्षर जोड़ने के लिए क्लिक करें",
    stampLabel:         "मोहर",
    stampPrompt:        "मोहर जोड़ने के लिए क्लिक करें",
    draftSaved:         "ड्राफ्ट सफलतापूर्वक सहेजा गया!",
  },
  profile: {
    backToDashboard:    "डैशबोर्ड पर वापस जाएँ",
    logout:             "लॉग आउट",
    adminPanel:         "व्यवस्थापक पैनल",
    defaultName:        "अधिवक्ता का नाम",
    defaultEmail:       "advocate@example.com",
    defaultMobile:      "+91 98765 43210",
    userAlt:            "उपयोगकर्ता",
    documentsCreated:   "बनाए गए दस्तावेज़",
    totalSpent:         "कुल खर्च",
    savedDrafts:        "सहेजे गए ड्राफ्ट",
    paymentHistory:     "भुगतान इतिहास",
  },
  payment: {
    title:              "भुगतान पूरा करें",
    subtitle:           "अपनी भुगतान विधि चुनें",
    btnUPI:             "UPI से भुगतान करें",
    btnGooglePay:       "Google Pay",
    btnPhonePe:         "PhonePe",
    btnCard:            "क्रेडिट/डेबिट कार्ड",
    feeLabel:           "दस्तावेज़ निर्यात शुल्क",
    feeAmount:          "₹10",
    successToast:       "भुगतान सफल!",
    failedToast:        "भुगतान रद्द या विफल हो गया",
    errorToast:         "भुगतान सिस्टम त्रुटि",
    appName:            "लीगल डॉक्स मेकर",
    description:        "दस्तावेज़ निर्यात शुल्क",
    googlePayAlt:       "Google Pay",
  },
  general: {
    genericError: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
    networkError: "कोई इंटरनेट कनेक्शन नहीं। कृपया अपना नेटवर्क जांचें।",
  },
};
