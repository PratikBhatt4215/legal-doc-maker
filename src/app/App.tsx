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
import { DraftsScreen } from "./components/DraftsScreen";
import { SubscriptionScreen } from "./components/SubscriptionScreen";
import { storage } from "../lib/storage";
import { getDraftById, Draft } from "../lib/draftStorage";
import { toast } from "sonner";
import { Language } from "../lib/i18n";
import { SavedPDFs } from "./components/SavedPDFs";
import { App as CapacitorApp } from "@capacitor/app";
import { UploadedFiles } from "./components/UploadedFiles";
import { UploadedFileRecord } from "../lib/uploadedFileStorage";

type Screen =
  | "splash"
  | "language"
  | "terms"
  | "login"
  | "dashboard"
  | "court"
  | "editor"
  | "drafts"
  | "profile"
  | "savedpdfs"
  | "uploadedfiles"
  | "subscription"
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
  // Draft-related state
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(undefined);
  const [draftInitialContent, setDraftInitialContent] = useState<string | undefined>(undefined);
  // Custom file states
  const [customFile, setCustomFile] = useState<File | undefined>(undefined);
  const [customFileName, setCustomFileName] = useState<string>("");

  useEffect(() => {
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

  useEffect(() => {
    const listener = CapacitorApp.addListener("backButton", () => {
      if (showPayment) {
        setShowPayment(false);
        setPaymentSuccessCallback(null);
        return;
      }
      switch (currentScreen) {
        case "dashboard":
          CapacitorApp.exitApp();
          break;
        case "court":
          goToDashboard();
          break;
        case "editor": {
          const wasCustom = !!customFile;
          setCustomFile(undefined);
          setCustomFileName("");
          setActiveDraftId(undefined);
          setDraftInitialContent(undefined);
          if (activeDraftId) {
            setCurrentScreen("drafts");
          } else if (wasCustom) {
            setCurrentScreen("uploadedfiles");
          } else {
            setCurrentScreen("court");
            saveNavState("court", selectedCourt, "");
          }
          break;
        }
        case "drafts":
        case "profile":
        case "savedpdfs":
        case "uploadedfiles":
          goToDashboard();
          break;
        case "admin":
          setCurrentScreen("profile");
          break;
        case "terms":
          setCurrentScreen("language");
          break;
        case "language":
          setCurrentScreen("login");
          break;
        case "login":
          CapacitorApp.exitApp();
          break;
        default:
          goToDashboard();
      }
    });

    return () => {
      listener.remove();
    };
  }, [currentScreen, customFile, activeDraftId, selectedCourt, showPayment]);

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
    setActiveDraftId(undefined);
    setDraftInitialContent(undefined);
    setCurrentScreen("editor");
    saveNavState("editor", selectedCourt, formId);
  };

  const handleOpenDraft = (draft: Draft) => {
    setSelectedForm(draft.formId);
    setActiveDraftId(draft.id);
    setDraftInitialContent(draft.content);
    setCurrentScreen("editor");
    saveNavState("editor", "", draft.formId);
  };

  const base64ToBlob = (base64: string, mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document") => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const handleOpenFileRecord = (record: UploadedFileRecord) => {
    try {
      const blob = base64ToBlob(record.base64Data);
      const file = new File([blob], record.name, { type: blob.type });

      setCustomFile(file);
      setCustomFileName(record.name);
      setSelectedForm("custom_file");
      setActiveDraftId(undefined);
      setDraftInitialContent(undefined);
      setCurrentScreen("editor");
    } catch (err) {
      toast.error("Failed to decode and open custom document.");
      console.error(err);
    }
  };

  const goToDashboard = () => {
    setCurrentScreen("dashboard");
    saveNavState("dashboard", "", "");
  };

  const handleExportPDF = (onSuccess: () => void) => {
    const { active } = storage.loadSubscription();
    if (active) {
      toast.success("Premium Active! Generating PDF...");
      onSuccess();
      return;
    }
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
          onOpenUploadedFiles={() => setCurrentScreen("uploadedfiles")}
          onOpenSavedPDFs={() => setCurrentScreen("savedpdfs")}
          onOpenDrafts={() => setCurrentScreen("drafts")}
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
          initialContent={draftInitialContent}
          draftId={activeDraftId}
          customFile={customFile}
          customFileName={customFileName}
          onBack={() => {
            const wasCustom = !!customFile;
            setCustomFile(undefined);
            setCustomFileName("");
            setActiveDraftId(undefined);
            setDraftInitialContent(undefined);
            if (activeDraftId) {
              setCurrentScreen("drafts");
            } else if (wasCustom) {
              setCurrentScreen("uploadedfiles");
            } else {
              setCurrentScreen("court");
              saveNavState("court", selectedCourt, "");
            }
          }}
          onExportPDF={handleExportPDF}
        />
      )}

      {currentScreen === "drafts" && (
        <DraftsScreen
          onBack={goToDashboard}
          onOpenDraft={handleOpenDraft}
        />
      )}

      {currentScreen === "profile" && (
        <Profile
          onBack={goToDashboard}
          onLogout={handleLogout}
          onOpenAdmin={() => setCurrentScreen("admin")}
          onOpenSubscription={() => setCurrentScreen("subscription")}
          isAdmin={true}
          userData={userData}
        />
      )}

      {currentScreen === "subscription" && (
        <SubscriptionScreen
          onBack={() => setCurrentScreen("profile")}
          onSuccess={() => setCurrentScreen("profile")}
        />
      )}

      {currentScreen === "savedpdfs" && (
        <SavedPDFs
          onBack={goToDashboard}
        />
      )}

      {currentScreen === "uploadedfiles" && (
        <UploadedFiles
          onBack={goToDashboard}
          onOpenFileRecord={handleOpenFileRecord}
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