import { motion } from "motion/react";
import { ArrowLeft, User, Mail, Phone, FileText, CreditCard, LogOut, Shield } from "lucide-react";
import { storage } from "../../lib/storage";

interface ProfileProps {
  onBack: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
  userData: any;
}

export function Profile({ onBack, onLogout, onOpenAdmin, isAdmin = false, userData }: ProfileProps) {
  const userInfo = {
    name: userData?.displayName || "Advocate Name",
    email: userData?.email || "advocate@example.com",
    mobile: userData?.mobile || "+91 98765 43210",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + (userData?.uid || 'LegalUser')
  };

  const paymentHistory = [
    { id: 1, date: "2026-05-08", amount: "₹99", status: "Success", document: "WP Document" },
    { id: 2, date: "2026-05-05", amount: "₹99", status: "Success", document: "CRA Document" },
    { id: 3, date: "2026-05-01", amount: "₹99", status: "Success", document: "Divorce Petition" }
  ];

  const handleLogout = () => {
    storage.clearUserSession();
    onLogout();
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
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <img
              src={userInfo.photo}
              alt="User"
              className="w-24 h-24 rounded-full border-4 border-[#1e3a5f]"
            />
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">{userInfo.name}</h2>
              <div className="space-y-1 text-gray-600">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Mail className="w-4 h-4" />
                  <span>{userInfo.email}</span>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Phone className="w-4 h-4" />
                  <span>{userInfo.mobile}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-6 py-3 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          {isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="w-full mb-6 flex items-center justify-center gap-2 bg-[#1e3a5f] text-white py-3 rounded-xl hover:bg-[#2a4a6f] transition-colors"
            >
              <Shield className="w-5 h-5" />
              <span>Admin Panel</span>
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <FileText className="w-8 h-8 text-[#1e3a5f] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#1e3a5f]">12</p>
              <p className="text-sm text-gray-600">Documents Created</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <CreditCard className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">₹1,188</p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">3</p>
              <p className="text-sm text-gray-600">Saved Drafts</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-lg p-8"
        >
          <h3 className="text-xl font-bold text-[#1e3a5f] mb-6">Payment History</h3>
          <div className="space-y-4">
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{payment.document}</p>
                  <p className="text-sm text-gray-500">{payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1e3a5f]">{payment.amount}</p>
                  <p className="text-sm text-green-600">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
