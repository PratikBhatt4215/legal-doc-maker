import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { SplashScreen } from "./components/SplashScreen";
import { SplashScreen as CapSplashScreen } from "@capacitor/splash-screen";
import { LanguageSelection } from "./components/LanguageSelection";
import { TermsAndConditions } from "./components/TermsAndConditions";
import { LoginSignup } from "./components/LoginSignup";
import { Dashboard } from "./components/Dashboard";
import { CourtModule } from "./components/CourtModule";
import { Editor } from "./components/Editor";
import { Payment } from "./components/Payment";
import { Profile } from "./components/Profile";
import { AdminPanel } from "./components/AdminPanel";
import { storage } from "../lib/storage";
import { toast } from "sonner";
import { Language } from "../lib/i18n";

type Screen =
  | "splash"
  | "language"
  | "terms"
  | "login"
  | "dashboard"
  | "court"
  | "editor"
  | "profile"
  | "admin";

/**
 * ─── HOW PROFESSIONAL APP NAVIGATION WORKS ─────────────────────
 *
 *  FRESH LAUNCH (opened after being killed from recents):
 *    → Show splash → then go to last known screen (or dashboard)
 *
 *  BACKGROUND RESUME (just minimized, not killed):
 *    → Skip splash → restore instantly to exact screen
 *
 *  CLEARED FROM RECENTS / FORCE STOPPED:
 *    → sessionStorage is wiped → treated as fresh launch
 *    → Show splash → dashboard
 *
 *  LOGGED OUT:
 *    → Clear all state → show login
 *
 *  KEY:
 *    localStorage  = persists forever (user data, nav state)
 *    sessionStorage = wiped when app is killed from recents
 * ─────────────────────────────────────────────────────────────────
 */

const NAV_KEY = "app_nav_state";          // localStorage — last screen
const SESSION_KEY = "app_session_alive";   // sessionStorage — alive flag

function saveNavState(screen: Screen, court = "", form = "") {
  if (["splash", "language", "terms", "login"].includes(screen)) return;
  localStorage.setItem(NAV_KEY, JSON.stringify({ screen, court, form }));
}

function loadNavState(): { screen: Screen; court: string; form: string } | null {
  try {
    const raw = localStorage.getItem(NAV_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function clearNavState() {
  localStorage.removeItem(NAV_KEY);
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccessCallback, setPaymentSuccessCallback] = useState<(() => void) | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    // Hide the native splash screen to transition into our custom React splash screen
    CapSplashScreen.hide().catch(() => {});

    // ── 1. Load persisted preferences ──
    const accepted = localStorage.getItem("termsAccepted") === "true";
    setTermsAccepted(accepted);

    const savedLang = storage.loadLanguage();
    if (savedLang) setSelectedLanguage(savedLang as Language);

    // ── 2. Check login session ──
    const { userId: uid, userData: uData } = storage.loadUserSession();

    if (uid && uData && accepted) {
      setUserId(uid);
      setUserData(uData);

      // ── 3. Detect background resume vs fresh launch ──
      const isBackgroundResume = sessionStorage.getItem(SESSION_KEY) === "true";

      if (isBackgroundResume) {
        // App was just minimized (not killed) → restore instantly, NO splash
        const nav = loadNavState();
        if (nav) {
          setSelectedCourt(nav.court);
          setSelectedForm(nav.form);
          setCurrentScreen(nav.screen);
        } else {
          setCurrentScreen("dashboard");
        }
        // Don't fall through to splash
        return;
      }

      // Fresh launch (or killed from recents) → mark session alive, SHOW splash
      // handleSplashComplete will navigate to last screen after splash
    }

    // Mark session as alive now — so next time (if not killed) = background resume
    sessionStorage.setItem(SESSION_KEY, "true");
    // Stays on "splash" — handleSplashComplete takes over
  }, []);

  // ── Splash complete: navigate appropriately ──────────────────────
  const handleSplashComplete = () => {
    if (!termsAccepted) {
      setCurrentScreen("language");
      return;
    }
    const { userId: uid } = storage.loadUserSession();
    if (uid) {
      // Logged in: go to last known screen
      const nav = loadNavState();
      if (nav) {
        setSelectedCourt(nav.court);
        setSelectedForm(nav.form);
        setCurrentScreen(nav.screen);
      } else {
        setCurrentScreen("dashboard");
      }
    } else {
      setCurrentScreen("login");
    }
  };

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLanguage(lang);
    setCurrentScreen("terms");
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setCurrentScreen("login");
  };

  const handleLogin = (uid: string, uData: any) => {
    setUserId(uid);
    setUserData(uData);
    sessionStorage.setItem(SESSION_KEY, "true");
    setCurrentScreen("dashboard");
    saveNavState("dashboard");
  };

  const handleCourtSelect = (courtId: string) => {
    setSelectedCourt(courtId);
    setCurrentScreen("court");
    saveNavState("court", courtId, "");
  };

  const handleFormSelect = (formId: string) => {
    setSelectedForm(formId);
    setCurrentScreen("editor");
    saveNavState("editor", selectedCourt, formId);
  };

  const goToDashboard = () => {
    setCurrentScreen("dashboard");
    saveNavState("dashboard", "", "");
  };

  const handleExportPDF = (onSuccess: () => void) => {
    setPaymentSuccessCallback(() => onSuccess);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setShowPayment(false);
    toast.success("Payment successful! Generating PDF...");
    if (paymentSuccessCallback) {
      paymentSuccessCallback();
      setPaymentSuccessCallback(null);
    }
  };

  const handleLogout = () => {
    storage.clearUserSession();
    clearNavState();
    sessionStorage.removeItem(SESSION_KEY);
    setUserId("");
    setUserData(null);
    setCurrentScreen("login");
  };

  return (
    <div className="size-full">
      <Toaster position="top-center" richColors />

      {currentScreen === "splash" && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {currentScreen === "language" && (
        <LanguageSelection onSelectLanguage={handleLanguageSelect} />
      )}

      {currentScreen === "terms" && (
        <TermsAndConditions
          language={selectedLanguage}
          onAccept={handleTermsAccept}
          onBack={() => setCurrentScreen("language")}
        />
      )}

      {currentScreen === "login" && (
        <LoginSignup onLogin={handleLogin} />
      )}

      {currentScreen === "dashboard" && (
        <Dashboard
          onSelectCourt={handleCourtSelect}
          onSelectForm={handleFormSelect}
          onOpenProfile={() => setCurrentScreen("profile")}
          userData={userData}
        />
      )}

      {currentScreen === "court" && (
        <CourtModule
          courtId={selectedCourt}
          onBack={goToDashboard}
          onSelectForm={handleFormSelect}
        />
      )}

      {currentScreen === "editor" && (
        <Editor
          formId={selectedForm}
          onBack={() => {
            setCurrentScreen("court");
            saveNavState("court", selectedCourt, "");
          }}
          onExportPDF={handleExportPDF}
        />
      )}

      {currentScreen === "profile" && (
        <Profile
          onBack={goToDashboard}
          onLogout={handleLogout}
          onOpenAdmin={() => setCurrentScreen("admin")}
          isAdmin={true}
          userData={userData}
        />
      )}

      {currentScreen === "admin" && (
        <AdminPanel onBack={() => setCurrentScreen("profile")} />
      )}

      {showPayment && (
        <Payment
          onClose={() => {
            setShowPayment(false);
            setPaymentSuccessCallback(null);
          }}
          onSuccess={handlePaymentSuccess}
          userInfo={{
            name: userData?.displayName || "User",
            email: userData?.email || "user@example.com",
            contact: userData?.mobile || "9999999999",
          }}
        />
      )}
    </div>
  );
}