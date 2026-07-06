import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Crown, Loader2 } from "lucide-react";
import { openRazorpayCheckout } from "../../lib/razorpay";
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
    payLabel: "Select Payment Method",
    gpay: "Pay via Google Pay",
    phonepe: "Pay via PhonePe",
    other: "Other UPI / Card / Netbanking",
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
    payLabel: "भुगतान विधि चुनें",
    gpay: "Google Pay से भुगतान करें",
    phonepe: "PhonePe से भुगतान करें",
    other: "अन्य UPI / कार्ड / नेटबैंकिंग",
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

  const { userData } = storage.loadUserSession();

  const handleSubscribe = async (label: string, method: string, provider?: string) => {
    setLoading(true);
    setSelectedMethod(label);

    try {
      await openRazorpayCheckout({
        amount: 350,
        currency: 'INR',
        name: 'Legal Docs Maker',
        description: 'Premium 1-Month Subscription Plan',
        prefillMethod: method,
        prefillProvider: provider,
        userInfo: {
          name: userData?.displayName || 'Premium User',
          email: userData?.email || 'user@example.com',
          contact: userData?.mobile || '9999999999',
        },
        onSuccess: (paymentId) => {
          // Calculate expiry: 1 month from now
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);

          storage.saveSubscription(true, expiryDate.toISOString());
          toast.success(T.successToast);
          onSuccess();
        },
        onFailure: (error) => {
          console.error('Subscription payment failed:', error);
          toast.error(T.failToast);
          setLoading(false);
          setSelectedMethod(null);
        }
      });
    } catch (e) {
      console.error(e);
      toast.error(T.errorToast);
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
            {T.payLabel}
          </p>

          {/* Google Pay Button */}
          <button
            onClick={() => handleSubscribe("Google Pay", "upi", "google_pay")}
            disabled={loading}
            style={{
              width: "100%", height: 50, borderRadius: 16,
              background: "#1e3a5f", color: "white", border: "none",
              fontWeight: 800, fontSize: 15, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {loading && selectedMethod === "Google Pay" ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ marginRight: 6 }} />
            ) : (
              <span>{T.gpay}</span>
            )}
          </button>

          {/* PhonePe Button */}
          <button
            onClick={() => handleSubscribe("PhonePe", "upi", "phonepe")}
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

          {/* Cards / Netbanking */}
          <button
            onClick={() => handleSubscribe("Card / UPI / Netbanking", "card")}
            disabled={loading}
            style={{
              width: "100%", height: 50, borderRadius: 16,
              background: "white", color: "#1e293b", border: "2px solid #cbd5e1",
              fontWeight: 800, fontSize: 15, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8,
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {loading && selectedMethod === "Card / UPI / Netbanking" ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ marginRight: 6 }} />
            ) : (
              <span>{T.other}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
