import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { SplashScreen } from "./components/SplashScreen";
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
import { generatePDF } from "../lib/pdfGenerator";
import { toast } from "sonner";
import { Language } from "../lib/i18n";
//hi pratik
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

// Helper: save navigation state so app resumes on reopen
const NAV_KEY = 'app_nav_state';
function saveNavState(screen: Screen, court: string, form: string) {
  // Don't persist transient screens
  if (screen === 'splash' || screen === 'language' || screen === 'terms' || screen === 'login') return;
  localStorage.setItem(NAV_KEY, JSON.stringify({ screen, court, form }));
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
  const [userData, setUserData] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('termsAccepted') === 'true';
    setTermsAccepted(accepted);

    const savedLanguage = storage.loadLanguage();
    if (savedLanguage) setSelectedLanguage(savedLanguage as Language);

    const { userId: savedUserId, userData: savedUserData } = storage.loadUserSession();

    if (savedUserId && savedUserData && accepted) {
      setUserId(savedUserId);
      setUserData(savedUserData);

      // ── Resume exactly where user left off ──
      const raw = localStorage.getItem(NAV_KEY);
      if (raw) {
        try {
          const nav = JSON.parse(raw) as { screen: Screen; court: string; form: string };
          setSelectedCourt(nav.court || '');
          setSelectedForm(nav.form || '');
          // Skip splash — go directly to saved screen
          setCurrentScreen(nav.screen);
          return; // don't show splash
        } catch { /* corrupted, fall through */ }
      }
      // Logged in but no saved nav → go to dashboard after splash
    }
  }, []);

  const handleSplashComplete = () => {
    // If terms not accepted, go to language selection
    if (!termsAccepted) {
      setCurrentScreen("language");
      return;
    }

    // If terms accepted, check for existing session
    const { userId: savedUserId } = storage.loadUserSession();
    if (savedUserId) {
      setCurrentScreen("dashboard");
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

  const handleTermsBack = () => {
    setCurrentScreen("language");
  };

  const handleLogin = (uid: string, uData: any) => {
    setUserId(uid);
    setUserData(uData);
    setCurrentScreen("dashboard");
  };

  const handleCourtSelect = (courtId: string) => {
    setSelectedCourt(courtId);
    setCurrentScreen("court");
    saveNavState('court', courtId, '');
  };

  const handleFormSelect = (formId: string) => {
    setSelectedForm(formId);
    setCurrentScreen("editor");
    saveNavState('editor', selectedCourt, formId);
  };

  const handleExportPDF = () => {
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowPayment(false);
    toast.success("Payment successful! Generating PDF...");

    try {
      await generatePDF({
        elementId: 'editor-content',
        filename: `legal-document-${selectedForm}-${Date.now()}.pdf`,
        onSuccess: () => {
          toast.success("PDF downloaded successfully!");
        },
        onError: (error) => {
          console.error('PDF error:', error);
          toast.error("Failed to generate PDF. Please try again.");
        }
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("PDF generation failed.");
    }
  };

  const handleLogout = () => {
    storage.clearUserSession();
    clearNavState();
    setUserId("");
    setUserData(null);
    setCurrentScreen("login");
  };

  // Save nav state whenever user goes back to dashboard
  const goToDashboard = () => {
    setCurrentScreen('dashboard');
    saveNavState('dashboard', '', '');
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
          onBack={handleTermsBack}
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
            saveNavState('court', selectedCourt, '');
          }}
          onExportPDF={handleExportPDF}
        />
      )}

      {currentScreen === "profile" && (
        <Profile
          onBack={() => setCurrentScreen("dashboard")}
          onLogout={handleLogout}
          onOpenAdmin={() => setCurrentScreen("admin")}
          isAdmin={true}
          userData={userData}
        />
      )}

      {currentScreen === "admin" && (
        <AdminPanel
          onBack={() => setCurrentScreen("profile")}
        />
      )}

      {showPayment && (
        <Payment
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
          userInfo={{
            name: userData?.displayName || 'User',
            email: userData?.email || 'user@example.com',
            contact: userData?.mobile || '9999999999'
          }}
        />
      )}
    </div>
  );
}