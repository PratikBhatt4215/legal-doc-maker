import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Crown, Loader2 } from "lucide-react";
import { openRazorpayCheckout } from "../../lib/razorpay";
import { storage } from "../../lib/storage";
import { toast } from "sonner";

interface SubscriptionScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function SubscriptionScreen({ onBack, onSuccess }: SubscriptionScreenProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

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
          toast.success("Subscription activated successfully! Enjoy unlimited exports!");
          onSuccess();
        },
        onFailure: (error) => {
          console.error('Subscription payment failed:', error);
          toast.error("Subscription payment failed. Please try again.");
          setLoading(false);
          setSelectedMethod(null);
        }
      });
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during subscription setup.");
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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Premium Membership</h1>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.75, marginTop: 2 }}>Unlock unlimited features and PDF exports</p>
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
              Monthly Access
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Premium Plan</h2>
          <p style={{ margin: "6px 0 20px", fontSize: 14, opacity: 0.85, fontWeight: 500 }}>
            Enjoy exporting document PDFs without any per-document fees.
          </p>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 36, fontWeight: 900 }}>₹350</span>
            <span style={{ fontSize: 14, opacity: 0.8, fontWeight: 700 }}>/ Month</span>
          </div>
        </motion.div>

        {/* Plan Benefits Checklist */}
        <div style={{ background: "white", borderRadius: 24, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Included Benefits
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "Unlimited PDF Exports (No document charges)",
              "Save unlimited edit Drafts inside the application",
              "Access all Court formats and document styles",
              "Waving-hand quick voice dictation templates",
              "Ad-free premium interface experience",
              "Priority Customer & Gavel Editor Support"
            ].map((benefit, i) => (
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
            Select Payment Method
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
              <span>Pay via Google Pay</span>
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
              <span>Pay via PhonePe</span>
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
              <span>Other UPI / Card / Netbanking</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
