import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, Plus, Edit, Trash2, Users, FileText, DollarSign } from "lucide-react";
import { storage } from "../../lib/storage";
import { getAllDrafts, deleteDraft } from "../../lib/draftStorage";
import { getAllPDFExports } from "../../lib/pdfStorage";
import { toast } from "sonner";

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const isHi = storage.loadLanguage() === "hi";
  const [activeTab, setActiveTab] = useState<"forms" | "users" | "payments">("forms");
  const [drafts, setDrafts] = useState(() => getAllDrafts());
  const exportsList = getAllPDFExports();
  const userSession = storage.loadUserSession();

  const activeUsers = userSession.userId ? [
    {
      id: userSession.userId,
      name: userSession.displayName || "Active User",
      email: userSession.email || "user@legaldoc.in",
      documents: drafts.length + exportsList.length
    }
  ] : [];

  const handleDeleteDraft = (id: string) => {
    deleteDraft(id);
    setDrafts(getAllDrafts());
    toast.success(isHi ? "फ़ॉर्म हटा दिया गया" : "Form deleted");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#1e3a5f] hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{isHi ? "प्रोफ़ाइल पर वापस जाएँ" : "Back to Profile"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">{isHi ? "व्यवस्थापक पैनल" : "Admin Panel"}</h1>
          <p className="text-gray-600">{isHi ? "फ़ॉर्म, उपयोगकर्ता और भुगतान प्रबंधित करें" : "Manage forms, users, and payments"}</p>
        </motion.div>

        <div className="flex gap-4 mb-6 bg-white rounded-xl p-2 shadow-sm">
          <button
            onClick={() => setActiveTab("forms")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
              activeTab === "forms"
                ? "bg-[#1e3a5f] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>{isHi ? "फ़ॉर्म" : "Forms"}</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
              activeTab === "users"
                ? "bg-[#1e3a5f] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users className="w-5 h-5" />
            <span>{isHi ? "उपयोगकर्ता" : "Users"}</span>
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
              activeTab === "payments"
                ? "bg-[#1e3a5f] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>{isHi ? "भुगतान" : "Payments"}</span>
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          {activeTab === "forms" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1e3a5f]">{isHi ? "फ़ॉर्म प्रबंधित करें" : "Manage Forms"}</h2>
                <span className="text-sm text-gray-500">{drafts.length} {isHi ? "सक्रिय ड्राफ्ट" : "active drafts"}</span>
              </div>
              <div className="space-y-4">
                {drafts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">{isHi ? "कोई फ़ॉर्म नहीं मिला" : "No active forms found"}</p>
                ) : (
                  drafts.map((form) => (
                    <div
                      key={form.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{form.templateName}</p>
                        <p className="text-sm text-gray-500">{new Date(form.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteDraft(form.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">{isHi ? "उपयोगकर्ता प्रबंधित करें" : "Manage Users"}</h2>
              <div className="space-y-4">
                {activeUsers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">{isHi ? "कोई उपयोगकर्ता नहीं मिला" : "No user logged in"}</p>
                ) : (
                  activeUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1e3a5f]">{user.documents} {isHi ? "दस्तावेज़" : "docs"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div>
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">{isHi ? "भुगतान प्रबंधित करें" : "Manage Payments"}</h2>
              <div className="space-y-4">
                {exportsList.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">{isHi ? "कोई भुगतान नहीं मिला" : "No payment records found"}</p>
                ) : (
                  exportsList.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{payment.templateName}</p>
                        <p className="text-sm text-gray-500">{new Date(payment.exportedAt).toLocaleDateString()} • ID: {payment.paymentId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1e3a5f]">{payment.amountPaid}</p>
                        <p className="text-sm text-green-600 font-semibold">
                          {payment.status || "Success"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
