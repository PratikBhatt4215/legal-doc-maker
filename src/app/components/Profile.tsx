import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  CreditCard,
  LogOut,
  Shield,
  Clock,
  Save,
  Bell,
  Check,
  Edit2,
  Crown,
  Globe,
  ChevronRight
} from "lucide-react";
import { storage } from "../../lib/storage";
import { MESSAGES, MESSAGES_HI } from "../../lib/messages";
import { getAllDrafts } from "../../lib/draftStorage";
import { getAllPDFExports, getTotalSpentAmount, getPDFExportsCount } from "../../lib/pdfStorage";
import { toast } from "sonner";

interface ProfileProps {
  onBack: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onOpenSubscription: () => void;
  isAdmin?: boolean;
  userData: any;
}

export function Profile({ onBack, onLogout, onOpenAdmin, onOpenSubscription, isAdmin = false, userData }: ProfileProps) {
  const language = storage.loadLanguage() === "hi" ? "hi" : "en";
  const [subStatus, setSubStatus] = useState(() => storage.loadSubscription());
  const M = language === "hi" ? MESSAGES_HI.profile : MESSAGES.profile;

  const userInfo = {
    name: userData?.displayName || M.defaultName,
    email: userData?.email || M.defaultEmail,
    mobile: userData?.mobile || M.defaultMobile,
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + (userData?.uid || 'LegalUser')
  };

  const draftsCount = getAllDrafts().length;
  const exportsCount = getPDFExportsCount();
  const totalSpent = getTotalSpentAmount();
  const rawPaymentHistory = getAllPDFExports();

  const paymentHistory = rawPaymentHistory.map((item) => ({
    id: item.id,
    date: new Date(item.exportedAt).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }),
    amount: item.amountPaid,
    status: "Success",
    document: item.templateName
  }));

  const handleLogout = () => {
    storage.clearUserSession();
    onLogout();
  };

  const handleLanguageToggle = () => {
    const newLang = language === "hi" ? "en" : "hi";
    storage.saveLanguage(newLang);
    window.location.reload();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f4f6f9" }}>
      {/* Native-feeling Dark Blue Header */}
      <div style={{
        background: "linear-gradient(180deg, #031430 0%, #0c2b5e 100%)",
        color: "white",
        padding: "20px 16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        boxShadow: "0 10px 30px rgba(3,20,48,0.15)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              backdropFilter: "blur(4px)"
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
              {language === "hi" ? "मेरी प्रोफ़ाइल" : "My Profile"}
            </h1>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.75, marginTop: 2 }}>
              {language === "hi" ? "अपना खाता और लेन-देन प्रबंधित करें" : "Manage your account and transactions"}
            </p>
          </div>
        </div>
        
        {/* Notification Bell */}
        <div style={{ position: "relative", cursor: "pointer", padding: 6 }}>
          <Bell size={22} color="white" />
          <span style={{
            position: "absolute",
            top: 5,
            right: 5,
            width: 8,
            height: 8,
            background: "#ef4444",
            borderRadius: "50%",
            border: "2px solid #031430"
          }} />
        </div>
      </div>

      {/* Content area with Scroll */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }}>
        
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "white",
            borderRadius: 24,
            boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
            border: "1px solid #f1f5f9",
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 18
          }}
        >
          {/* Avatar on Left */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 86,
              height: 86,
              borderRadius: "50%",
              border: "3.5px solid #2563eb",
              padding: 2,
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <img
                src={userInfo.photo}
                alt={M.userAlt}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover"
                }}
              />
            </div>
            
            {/* Edit Icon Overlay */}
            <div style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#2563eb",
              border: "2.5px solid white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.15)"
            }}>
              <Edit2 size={11} color="white" strokeWidth={3} />
            </div>
          </div>

          {/* Details on Right */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a" }}>
                {userInfo.name}
              </h2>
              {/* Verified Badge */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "#eff6ff",
                color: "#2563eb",
                padding: "2px 8px",
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                border: "1px solid #bfdbfe"
              }}>
                <Check size={10} strokeWidth={3.5} />
                <span>Verified User</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, color: "#475569", fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Mail size={14} color="#64748b" />
                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {userInfo.email}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={14} color="#64748b" />
                <span>{userInfo.mobile}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Admin Panel Button */}
        {isAdmin && onOpenAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onOpenAdmin}
            style={{
              background: "#0c2b5e",
              borderRadius: 20,
              padding: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(12,43,94,0.12)",
              border: "1px solid rgba(255,255,255,0.05)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Shield size={20} color="white" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "white" }}>
                  Admin Panel
                </h4>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                  Access your admin dashboard
                </p>
              </div>
            </div>
            <ChevronRight size={18} color="white" style={{ opacity: 0.8 }} />
          </motion.div>
        )}

        {/* Subscription Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onOpenSubscription}
          style={{
            background: "white",
            borderRadius: 24,
            borderLeft: subStatus.active ? "5px solid #7e22ce" : "5px solid #64748b",
            boxShadow: "0 10px 25px rgba(0,0,0,0.03)",
            borderTop: "1px solid #f1f5f9",
            borderRight: "1px solid #f1f5f9",
            borderBottom: "1px solid #f1f5f9",
            padding: 20,
            cursor: "pointer"
          }}
        >
          {/* Header row: Plan Info + Active Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: subStatus.active ? "#faf5ff" : "#f1f5f9",
                border: subStatus.active ? "1px solid #f3e8ff" : "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Crown size={20} color={subStatus.active ? "#7e22ce" : "#64748b"} strokeWidth={2.5} />
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Subscription Plan
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: subStatus.active ? "#7e22ce" : "#1e293b" }}>
                  {subStatus.active ? "Premium Plan" : "Free / Demo Plan"}
                </h3>
              </div>
            </div>
            
            {/* Active/Inactive Capsule Badge */}
            <span style={{
              background: subStatus.active ? "#f3e8ff" : "#f1f5f9",
              color: subStatus.active ? "#7e22ce" : "#64748b",
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: "9999px"
            }}>
              {subStatus.active ? "Active" : "Get Premium"}
            </span>
          </div>

          {/* Description and Price */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5, maxWidth: "65%" }}>
              {subStatus.active
                ? "Unlimited drafts, priority support and advanced features"
                : "Unlock unlimited PDF exports and all draft templates for a month."}
            </p>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
                ₹350
              </span>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
                per month
              </p>
            </div>
          </div>

          <div style={{ height: 1, background: "#f1f5f9", margin: "0 -20px 14px" }} />

          {/* Footer of plan card: valid info + Manage link */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
              <Clock size={13} />
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                {subStatus.active && subStatus.expiresAt
                  ? `Valid till ${new Date(subStatus.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                  : "No active membership"}
              </span>
            </div>
            
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#7e22ce",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 2
              }}
            >
              <span>{subStatus.active ? "Manage Plan" : "Upgrade Plan"}</span>
              <ChevronRight size={13} strokeWidth={3} />
            </span>
          </div>
        </motion.div>

        {/* Overview Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
            Overview
          </h3>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast.info("Stats are up to date.");
            }}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0c2b5e",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 2
            }}
          >
            <span>View All</span>
            <ChevronRight size={13} strokeWidth={3} />
          </a>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {/* Documents Created */}
          <div style={{
            background: "white",
            borderRadius: 20,
            border: "1px solid #f1f5f9",
            padding: "16px 8px 14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8
            }}>
              <FileText size={18} color="#2563eb" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#1e293b", marginBottom: 2 }}>
              {exportsCount}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textAlign: "center", lineHeight: 1.2 }}>
              {M.documentsCreated}
            </span>
            {/* Bottom blue bar */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#2563eb" }} />
          </div>

          {/* Total Spent */}
          <div style={{
            background: "white",
            borderRadius: 20,
            border: "1px solid #f1f5f9",
            padding: "16px 8px 14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8
            }}>
              <CreditCard size={18} color="#16a34a" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#16a34a", marginBottom: 2 }}>
              ₹{totalSpent}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textAlign: "center", lineHeight: 1.2 }}>
              {M.totalSpent}
            </span>
            {/* Bottom green bar */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#16a34a" }} />
          </div>

          {/* Saved Drafts */}
          <div style={{
            background: "white",
            borderRadius: 20,
            border: "1px solid #f1f5f9",
            padding: "16px 8px 14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#faf5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8
            }}>
              <Save size={18} color="#7e22ce" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#7e22ce", marginBottom: 2 }}>
              {draftsCount}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textAlign: "center", lineHeight: 1.2 }}>
              {M.savedDrafts}
            </span>
            {/* Bottom purple bar */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#7e22ce" }} />
          </div>
        </div>

        {/* Menu Options List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          
          {/* Payment History Row */}
          <div
            onClick={() => {
              toast.info("Payment transactions are listed below.");
            }}
            style={{
              background: "white",
              borderRadius: 16,
              padding: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              border: "1px solid #f1f5f9",
              boxShadow: "0 2px 8px rgba(0,0,0,0.01)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Clock size={18} color="#2563eb" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Payment History
                </h4>
                <p style={{ margin: 0, fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  View your all transaction history
                </p>
              </div>
            </div>
            <ChevronRight size={16} color="#94a3b8" />
          </div>

          {/* Language Selection Row */}
          <div
            onClick={handleLanguageToggle}
            style={{
              background: "white",
              borderRadius: 16,
              padding: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              border: "1px solid #f1f5f9",
              boxShadow: "0 2px 8px rgba(0,0,0,0.01)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Globe size={18} color="#475569" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Language / भाषा
                </h4>
                <p style={{ margin: 0, fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Change app language / भाषा बदलें
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>
                {language === "hi" ? "English में बदलें" : "हिंदी में बदलें"}
              </span>
              <ChevronRight size={16} color="#94a3b8" />
            </div>
          </div>

          {/* Logout Row */}
          <div
            onClick={handleLogout}
            style={{
              background: "#fef2f2",
              borderRadius: 16,
              padding: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              border: "1px solid #fee2e2"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <LogOut size={18} color="#ef4444" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ef4444" }}>
                  Logout
                </h4>
                <p style={{ margin: 0, fontSize: 11, color: "#ef4444", opacity: 0.8, marginTop: 2 }}>
                  Securely logout from your account
                </p>
              </div>
            </div>
            <ChevronRight size={16} color="#fca5a5" />
          </div>

        </div>

        {/* Transaction History Section if transactions exist */}
        {paymentHistory.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              Recent Transactions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    background: "white",
                    borderRadius: 16,
                    border: "1px solid #f1f5f9"
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {payment.document}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                      {payment.date}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 800, color: "#0a2b5e" }}>
                      ₹{payment.amount}
                    </p>
                    <span style={{ fontSize: 10, color: "#16a34a", background: "#f0fdf4", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
