import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, Plus, Edit, Trash2, Users, FileText, DollarSign } from "lucide-react";
import { storage } from "../../lib/storage";

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const isHi = storage.loadLanguage() === "hi";
  const [activeTab, setActiveTab] = useState<"forms" | "users" | "payments">("forms");

  const mockForms = [
    { id: 1, name: "Writ Petition", court: "High Court", createdAt: "2026-05-01" },
    { id: 2, name: "Criminal Appeal", court: "High Court", createdAt: "2026-04-28" },
    { id: 3, name: "Divorce Petition", court: "Family Court", createdAt: "2026-04-25" }
  ];

  const mockUsers = [
    { id: 1, name: "Advocate A", email: "advocatea@example.com", documents: 15 },
    { id: 2, name: "Advocate B", email: "advocateb@example.com", documents: 8 },
    { id: 3, name: "Advocate C", email: "advocatec@example.com", documents: 23 }
  ];

  const mockPayments = [
    { id: 1, user: "Advocate A", amount: "₹99", date: "2026-05-08", status: "Success" },
    { id: 2, user: "Advocate B", amount: "₹99", date: "2026-05-07", status: "Success" },
    { id: 3, user: "Advocate C", amount: "₹99", date: "2026-05-06", status: "Pending" }
  ];

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
                <button className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2a4a6f] transition-colors">
                  <Plus className="w-5 h-5" />
                  {isHi ? "फ़ॉर्म जोड़ें" : "Add Form"}
                </button>
              </div>
              <div className="space-y-4">
                {mockForms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{form.name}</p>
                      <p className="text-sm text-gray-500">{form.court} • {form.createdAt}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-white rounded-lg transition-colors">
                        <Edit className="w-5 h-5 text-[#1e3a5f]" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">{isHi ? "उपयोगकर्ता प्रबंधित करें" : "Manage Users"}</h2>
              <div className="space-y-4">
                {mockUsers.map((user) => (
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
                ))}
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div>
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">{isHi ? "भुगतान प्रबंधित करें" : "Manage Payments"}</h2>
              <div className="space-y-4">
                {mockPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{payment.user}</p>
                      <p className="text-sm text-gray-500">{payment.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1e3a5f]">{payment.amount}</p>
                      <p className={`text-sm ${
                        payment.status === "Success" ? "text-green-600" : "text-yellow-600"
                      }`}>
                        {payment.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
