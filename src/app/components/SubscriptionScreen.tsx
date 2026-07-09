import { motion } from "motion/react";
import { useState, useMemo } from "react";
import { ArrowLeft, CheckCircle2, Crown, Loader2 } from "lucide-react";
import { storage } from "../../lib/storage";
import { toast } from "sonner";

const S = {
  en: {
    backBtn: "Back",
    header: "Premium Membership",
    headerSub: "Unlock unlimited features and PDF exports",
    badge: "Monthly Access",
    planTitle: "Premium Plan",
    planDesc: "Enjoy exporting document PDFs without any per-document fees.",
    price: "₹350",
    perMonth: "/ Month",
    benefitsTitle: "Included Benefits",
    benefits: [
      "Unlimited PDF Exports (No document charges)",
      "Save unlimited edit Drafts inside the application",
      "Access all Court formats and document styles",
      "Voice dictation templates",
      "Ad-free premium interface experience",
      "Priority Customer & Gavel Editor Support"
    ],
    payLabel: "Select Payment App",
    phonepe: "Pay via PhonePe",
    paytm: "Pay via Paytm",
    successToast: "Subscription activated! Enjoy unlimited exports!",
    failToast: "Subscription payment failed. Please try again.",
    errorToast: "An error occurred during subscription setup."
  },
  hi: {
    backBtn: "वापस",
    header: "प्रीमियम सदस्यता",
    headerSub: "असीमित सुविधाएँ और PDF निर्यात अनलॉक करें",
    badge: "मासिक एक्सेस",
    planTitle: "प्रीमियम प्लान",
    planDesc: "प्रति-दस्तावेज़ शुल्क के बिना PDF निर्यात करें।",
    price: "₹350",
    perMonth: "/ माह",
    benefitsTitle: "शामिल लाभ",
    benefits: [
      "असीमित PDF निर्यात (कोई दस्तावेज़ शुल्क नहीं)",
      "ऐप के अंदर असीमित ड्राफ्ट सहेजें",
      "सभी न्यायालय प्रारूप और दस्तावेज़ शैलियाँ",
      "वॉयस डिक्टेशन टेम्पलेट",
      "विज्ञापन-मुक्त प्रीमियम अनुभव",
      "प्राथमिकता ग्राहक और संपादक सहायता"
    ],
    payLabel: "भुगतान ऐप चुनें",
    phonepe: "PhonePe से भुगतान करें",
    paytm: "Paytm से भुगतान करें",
    successToast: "सदस्यता सक्रिय हो गई! असीमित निर्यात का आनंद लें!",
    failToast: "सदस्यता भुगतान विफल। कृपया पुनः प्रयास करें।",
    errorToast: "सदस्यता सेटअप में त्रुटि हुई।"
  }
};

interface SubscriptionScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function SubscriptionScreen({ onBack, onSuccess }: SubscriptionScreenProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const isHi = storage.loadLanguage() === "hi";
  const T = isHi ? S.hi : S.en;

  const subStatus = useMemo(() => storage.loadSubscription(), []);
  const daysLeft = useMemo(() => {
    if (!subStatus.active || !subStatus.expiresAt) return 0;
    const diffTime = new Date(subStatus.expiresAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [subStatus]);

  const URI_SCHEMES: Record<string, string> = {
    "PhonePe": "phonepe://pay",
    "Paytm": "paytmmp://pay"
  };

  const handleSubscribe = async (label: "PhonePe" | "Paytm") => {
    setLoading(true);
    setSelectedMethod(label);

    const trackingTxnId = `TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const YOUR_UPI_ID = "8766372355@axl"; 
    const appName = "Legal Doc Maker";
    const description = "Premium 1-Month Subscription";
    const amount = "350.00"; 

    const upiParams = new URLSearchParams({
      pa: YOUR_UPI_ID,
      pn: appName,
      am: amount,
      cu: "INR",
      tn: `${description} - ${trackingTxnId} - ${label}`,
    });

    const deepLinkUrl = `${URI_SCHEMES[label]}?${upiParams.toString()}`;

    try {
      toast.info(`Launching ${label}...`);

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = deepLinkUrl;

      let appOpened = false;
      const handleBlur = () => { appOpened = true; };

      window.addEventListener("blur", handleBlur);
      document.body.appendChild(iframe);

      setTimeout(() => {
        window.removeEventListener("blur", handleBlur);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);

        if (!appOpened) {
          toast.error(`${label} application is not installed.`);
          setLoading(false);
          setSelectedMethod(null);
        } else {
          setLoading(false);
          setSelectedMethod(null);

          // Calculate expiry: 1 month from now
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);

          storage.saveSubscription(true, expiryDate.toISOString());
          toast.success(T.successToast);
          onSuccess();
        }
      }, 1200);

    } catch (error) {
      console.error("Native intent failure:", error);
      toast.error(`Could not launch ${label}.`);
      setLoading(false);
      setSelectedMethod(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f4f6f9" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #031430 0%, #0c2b5e 100%)",
        color: "white",
        padding: "20px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        boxShadow: "0 10px 30px rgba(3,20,48,0.15)"
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 12,
            padding: 10,
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{T.header}</h1>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.75, marginTop: 2 }}>{T.headerSub}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* Active plan banner */}
        {subStatus.active && subStatus.expiresAt && (
          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 20,
            padding: "16px 20px",
            color: "#166534",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            boxShadow: "0 4px 12px rgba(22,101,52,0.05)"
          }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>{isHi ? "सक्रिय सदस्यता उपलब्ध है" : "Active Subscription Plan"}</span>
            </h4>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9, fontWeight: 500 }}>
              {isHi 
                ? `आपका प्रीमियम प्लान सक्रिय है। आपके ${daysLeft} दिन शेष हैं।`
                : `Your Premium Plan is active. You have ${daysLeft} days remaining.`
              }
            </p>
          </div>
        )}

        {/* Plan Spotlight Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "linear-gradient(135deg, #7e22ce 0%, #4c1d95 100%)",
            borderRadius: 28,
            padding: 24,
            color: "white",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 15px 35px rgba(126,34,206,0.3)"
          }}
        >
          {/* Subtle shine background elements */}
          <div style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            background: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
            filter: "blur(20px)"
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Crown size={24} color="#fcd34d" strokeWidth={2.5} />
            <span style={{ fontSize: 12, fontWeight: 800, background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 99, textTransform: "uppercase" }}>
              {T.badge}
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>{T.planTitle}</h2>
          <p style={{ margin: "6px 0 20px", fontSize: 14, opacity: 0.85, fontWeight: 500 }}>
            {T.planDesc}
          </p>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 36, fontWeight: 900 }}>{T.price}</span>
            <span style={{ fontSize: 14, opacity: 0.8, fontWeight: 700 }}>{T.perMonth}</span>
          </div>
        </motion.div>

        {/* Plan Benefits Checklist */}
        <div style={{ background: "white", borderRadius: 24, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {T.benefitsTitle}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {T.benefits.map((benefit, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium Swiggy style sliding bottom select buttons */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 700, textTransform: "uppercase" }}>
            {subStatus.active
              ? (isHi ? "सदस्यता नवीनीकृत करें (समय बढ़ाएं)" : "Renew Membership (Extend Plan)")
              : T.payLabel
            }
          </p>

          {/* PhonePe Button */}
          <button
            onClick={() => handleSubscribe("PhonePe")}
            disabled={loading}
            style={{
              width: "100%", height: 50, borderRadius: 16,
              background: "#581c87", color: "white", border: "none",
              fontWeight: 800, fontSize: 15, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {loading && selectedMethod === "PhonePe" ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ marginRight: 6 }} />
            ) : (
              <span>{T.phonepe}</span>
            )}
          </button>

          {/* Paytm Button */}
          <button
            onClick={() => handleSubscribe("Paytm")}
            disabled={loading}
            style={{
              width: "100%", height: 50, borderRadius: 16,
              background: "#00baf2", color: "white", border: "none",
              fontWeight: 800, fontSize: 15, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {loading && selectedMethod === "Paytm" ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ marginRight: 6 }} />
            ) : (
              <span>{T.paytm}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
