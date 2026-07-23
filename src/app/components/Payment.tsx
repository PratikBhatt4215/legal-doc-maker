import React, { useState } from 'react';
import { X, Smartphone, Loader2, Info } from 'lucide-react';

interface PaymentProps {
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const Payment: React.FC<PaymentProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  // Read Razorpay Key ID from your .env file
  const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE';

  const isButtonLoading = (buttonName: string) => {
    return loading && activeButton === buttonName;
  };

  const handleRazorpayPayment = (appName?: 'phonepe' | 'paytm' | 'google_pay') => {
    setLoading(true);
    if (appName) setActiveButton(appName);

    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load. Please check your internet connection.");
      setLoading(false);
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: 1000, // ₹10 in paise (1000 paise = ₹10)
      currency: 'INR',
      name: 'Legal Document Maker',
      description: 'A4 Legal Grade Document Export',
      theme: {
        color: '#1e3a5f'
      },
      // Configures UPI preferences
      config: {
        display: {
          blocks: {
            banks: {
              name: 'Pay via UPI App',
              instruments: [
                {
                  method: 'upi',
                  apps: appName ? [appName] : ['phonepe', 'paytm', 'google_pay']
                }
              ]
            }
          },
          sequence: ['block.banks'],
          preferences: {
            show_default_blocks: true
          }
        }
      },
      // 🔒 THIS CALLBACK ONLY FIRES AFTER THE BANK CONFIRMS PAYMENT SUCCESS
      handler: function (response: { razorpay_payment_id: string }) {
        setLoading(false);
        setActiveButton(null);
        // UNLOCKS PDF SAFELY WITH REAL PROOF OF PAYMENT
        onSuccess(response.razorpay_payment_id);
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
          setActiveButton(null);
        }
      }
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', function (response: any) {
      setLoading(false);
      setActiveButton(null);
      alert(`Payment Failed: ${response.error.description}`);
    });

    rzp.open();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="absolute inset-0" onClick={loading ? undefined : onClose} />

      <div className="bg-white rounded-t-[32px] shadow-2xl max-w-lg w-full p-6 pb-10 relative z-10 border-t border-gray-100">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className="text-xl font-black text-[#1e3a5f] mb-1">
          Choose Payment App
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Complete ₹10 payment to export document
        </p>

        {/* Order Summary */}
        <div className="bg-gradient-to-r from-[#1e3a5f]/5 to-[#1e3a5f]/10 rounded-2xl p-4 mb-6 border border-[#1e3a5f]/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Summary</span>
            <span className="text-[10px] bg-[#1e3a5f] text-white px-2 py-0.5 rounded-full font-bold">A4 PDF Export</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-bold text-[#1e3a5f] text-sm">Legal Document Maker</h3>
              <p className="text-xs text-gray-400">Export premium legal grade format</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 line-through mr-1.5">₹99</span>
              <span className="text-2xl font-black text-[#1e3a5f]">₹10</span>
            </div>
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="space-y-3">
          {/* PhonePe */}
          <button
            onClick={() => handleRazorpayPayment("phonepe")}
            disabled={loading}
            className="w-full bg-[#5f259f] text-white py-4 px-5 rounded-2xl font-bold flex items-center justify-between shadow-lg shadow-[#5f259f]/10 hover:bg-[#4a1d7d] transition-all disabled:opacity-50 active:scale-95"
          >
            <div className="flex items-center gap-3">
              {isButtonLoading("phonepe") ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-sm">
                  <Smartphone className="w-4 h-4" />
                </div>
              )}
              <div className="text-left">
                <span className="block text-sm font-extrabold leading-none mb-0.5">PhonePe</span>
                <span className="text-[10px] opacity-80 font-normal">Pay via PhonePe UPI</span>
              </div>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">POPULAR</span>
          </button>

          {/* Paytm */}
          <button
            onClick={() => handleRazorpayPayment("paytm")}
            disabled={loading}
            className="w-full bg-[#00baf2] text-white py-4 px-5 rounded-2xl font-bold flex items-center justify-between shadow-lg shadow-[#00baf2]/10 hover:bg-[#0099c8] transition-all disabled:opacity-50 active:scale-95"
          >
            <div className="flex items-center gap-3">
              {isButtonLoading("paytm") ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-xs">
                  PM
                </div>
              )}
              <div className="text-left">
                <span className="block text-sm font-extrabold leading-none mb-0.5">Paytm</span>
                <span className="text-[10px] opacity-80 font-normal">Pay via Paytm UPI</span>
              </div>
            </div>
          </button>

          {/* Google Pay */}
          <button
            onClick={() => handleRazorpayPayment("google_pay")}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 py-4 px-5 rounded-2xl font-bold flex items-center justify-between hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-all disabled:opacity-50 active:scale-95"
          >
            <div className="flex items-center gap-3">
              {isButtonLoading("google_pay") ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                  <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" alt="GPay" className="h-4" />
                </div>
              )}
              <div className="text-left">
                <span className="block text-sm font-extrabold leading-none mb-0.5 text-gray-800">Google Pay</span>
                <span className="text-[10px] text-gray-400 font-normal">Pay via Google Pay UPI</span>
              </div>
            </div>
            <span className="text-[10px] border border-emerald-500 text-emerald-600 px-2 py-0.5 rounded-full font-bold">SECURE</span>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Verified processing via Razorpay. PDF unblocks automatically upon payment.</span>
        </div>
      </div>
    </div>
  );
};