import { motion } from "motion/react";
import { CreditCard, Smartphone, X, Loader2 } from "lucide-react";
import { openRazorpayCheckout } from "../../lib/razorpay";
import { useState } from "react";
import { toast } from "sonner";

interface PaymentProps {
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  userInfo?: {
    name: string;
    email: string;
    contact: string;
  };
}

export function Payment({ onClose, onSuccess, userInfo }: PaymentProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async (method: string) => {
    setLoading(true);

    try {
      await openRazorpayCheckout({
        amount: 99,
        currency: 'INR',
        name: 'Legal Docs Maker',
        description: `Document Export Fee - ${method}`,
        onSuccess: (paymentId) => {
          toast.success("Payment successful!");
          onSuccess(paymentId);
        },
        onFailure: (error) => {
          console.error('Payment failed:', error);
          toast.error("Payment cancelled or failed");
          setLoading(false);
        },
        userInfo
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Payment system error");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2">Complete Payment</h2>
        <p className="text-gray-600 mb-8">Choose your payment method</p>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePayment("UPI")}
            disabled={loading}
            className="w-full bg-white border-2 border-[#1e3a5f] text-[#1e3a5f] py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-[#1e3a5f] hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Smartphone className="w-6 h-6" />}
            Pay with UPI
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePayment("Google Pay")}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" alt="Google Pay" className="h-6" />}
            Google Pay
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePayment("PhonePe")}
            disabled={loading}
            className="w-full bg-[#5f259f] text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-[#4a1d7d] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Smartphone className="w-6 h-6" />}
            PhonePe
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePayment("Card")}
            disabled={loading}
            className="w-full bg-[#9b1c31] text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-[#7d1627] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
            Credit/Debit Card
          </motion.button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Document Export Fee</span>
            <span className="text-2xl font-bold text-[#1e3a5f]">₹99</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
