// import { motion } from "motion/react";
// import { CreditCard, Smartphone, X, Loader2, Info } from "lucide-react";
// import { openRazorpayCheckout } from "../../lib/razorpay";
// import { useState } from "react";
// import { toast } from "sonner";
// import { MESSAGES } from "../../lib/messages";

// interface PaymentProps {
//   onClose: () => void;
//   onSuccess: (paymentId: string) => void;
//   userInfo?: {
//     name: string;
//     email: string;
//     contact: string;
//   };
// }

// export function Payment({ onClose, onSuccess, userInfo }: PaymentProps) {
//   const [loading, setLoading] = useState(false);
//   const [activeMode, setActiveMode] = useState<string | null>(null);

//   const handlePayment = async (label: string, method: string, provider?: string) => {
//     setLoading(true);
//     setActiveMode(label);

//     try {
//       await openRazorpayCheckout({
//         amount: 10,
//         currency: 'INR',
//         name: MESSAGES.payment.appName,
//         description: `${MESSAGES.payment.description} - ${label}`,
//         prefillMethod: method,
//         prefillProvider: provider,
//         onSuccess: (paymentId) => {
//           toast.success(MESSAGES.payment.successToast);
//           onSuccess(paymentId);
//         },
//         onFailure: (error) => {
//           console.error('Payment failed:', error);
//           toast.error(MESSAGES.payment.failedToast);
//           setLoading(false);
//           setActiveMode(null);
//         },
//         userInfo,
//       });
//     } catch (error) {
//       console.error('Payment error:', error);
//       toast.error(MESSAGES.payment.errorToast);
//       setLoading(false);
//       setActiveMode(null);
//     }
//   };

//   const isButtonLoading = (label: string) => loading && activeMode === label;

//   return (
//     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
//       {/* Background click handler to close */}
//       <div className="absolute inset-0" onClick={loading ? undefined : onClose} />

//       <motion.div
//         initial={{ y: "100%" }}
//         animate={{ y: 0 }}
//         exit={{ y: "100%" }}
//         transition={{ type: "spring", damping: 25, stiffness: 220 }}
//         className="bg-white rounded-t-[32px] shadow-2xl max-w-lg w-full p-6 pb-10 relative z-10 border-t border-gray-100 max-h-[90vh] overflow-y-auto"
//       >
//         {/* Drag handle line at top */}
//         <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

//         {/* Close Button */}
//         <button
//           onClick={onClose}
//           disabled={loading}
//           className="absolute top-5 right-5 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
//         >
//           <X className="w-5 h-5 text-gray-500" />
//         </button>

//         {/* Header */}
//         <h2 className="text-xl font-black text-[#1e3a5f] mb-1">{MESSAGES.payment.title}</h2>
//         <p className="text-sm text-gray-500 mb-6">{MESSAGES.payment.subtitle}</p>

//         {/* Premium Order Details Card */}
//         <div className="bg-gradient-to-r from-[#1e3a5f]/5 to-[#1e3a5f]/10 rounded-2xl p-4 mb-6 border border-[#1e3a5f]/10">
//           <div className="flex justify-between items-center mb-1">
//             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Summary</span>
//             <span className="text-[10px] bg-[#1e3a5f] text-white px-2 py-0.5 rounded-full font-bold">A4 PDF Export</span>
//           </div>
//           <div className="flex justify-between items-end">
//             <div>
//               <h3 className="font-bold text-[#1e3a5f] text-sm">Legal Document Maker</h3>
//               <p className="text-xs text-gray-400">Export premium legal grade format</p>
//             </div>
//             <div className="text-right">
//               <span className="text-xs text-gray-500 line-through mr-1.5">₹99</span>
//               <span className="text-2xl font-black text-[#1e3a5f]">{MESSAGES.payment.feeAmount}</span>
//             </div>
//           </div>
//         </div>

//         {/* Payment Methods Section */}
//         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3.5 pl-1">
//           Select Payment Method
//         </h3>

//         <div className="space-y-3">
//           {/* PhonePe */}
//           <motion.button
//             whileHover={{ scale: 1.01 }}
//             whileTap={{ scale: 0.99 }}
//             onClick={() => handlePayment("PhonePe", "upi", "phonepe")}
//             disabled={loading}
//             className="w-full bg-[#5f259f] text-white py-4 px-5 rounded-2xl font-bold flex items-center justify-between shadow-lg shadow-[#5f259f]/10 hover:bg-[#4a1d7d] transition-all disabled:opacity-50"
//           >
//             <div className="flex items-center gap-3">
//               {isButtonLoading("PhonePe") ? (
//                 <Loader2 className="w-5 h-5 animate-spin" />
//               ) : (
//                 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
//                   <Smartphone className="w-5 h-5" />
//                 </div>
//               )}
//               <div className="text-left">
//                 <span className="block text-sm font-extrabold leading-none mb-0.5">PhonePe</span>
//                 <span className="text-[10px] opacity-80 font-normal">Pay directly via PhonePe app</span>
//               </div>
//             </div>
//             <span className="text-xs bg-white/20 px-2 py-1 rounded-md font-bold">POPULAR</span>
//           </motion.button>

//           {/* Google Pay */}
//           <motion.button
//             whileHover={{ scale: 1.01 }}
//             whileTap={{ scale: 0.99 }}
//             onClick={() => handlePayment("Google Pay", "upi", "google_pay")}
//             disabled={loading}
//             className="w-full bg-white border-2 border-gray-200 text-gray-700 py-4 px-5 rounded-2xl font-bold flex items-center justify-between hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-all disabled:opacity-50"
//           >
//             <div className="flex items-center gap-3">
//               {isButtonLoading("Google Pay") ? (
//                 <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
//               ) : (
//                 <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
//                   <img src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg" alt="GPay" className="h-4" />
//                 </div>
//               )}
//               <div className="text-left">
//                 <span className="block text-sm font-extrabold leading-none mb-0.5 text-gray-800">Google Pay</span>
//                 <span className="text-[10px] text-gray-400 font-normal">Direct secure payment via GPay</span>
//               </div>
//             </div>
//             <span className="text-[10px] border border-emerald-500 text-emerald-600 px-2 py-0.5 rounded-full font-bold">SECURE</span>
//           </motion.button>

//           {/* Generic UPI Options */}
//           <motion.button
//             whileHover={{ scale: 1.01 }}
//             whileTap={{ scale: 0.99 }}
//             onClick={() => handlePayment("UPI", "upi")}
//             disabled={loading}
//             className="w-full bg-white border-2 border-[#1e3a5f]/20 text-[#1e3a5f] py-4 px-5 rounded-2xl font-bold flex items-center justify-between hover:bg-[#1e3a5f]/5 transition-all disabled:opacity-50"
//           >
//             <div className="flex items-center gap-3">
//               {isButtonLoading("UPI") ? (
//                 <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
//               ) : (
//                 <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/5 flex items-center justify-center">
//                   <Smartphone className="w-5 h-5 text-[#1e3a5f]" />
//                 </div>
//               )}
//               <div className="text-left">
//                 <span className="block text-sm font-extrabold leading-none mb-0.5">Other UPI Apps</span>
//                 <span className="text-[10px] text-gray-400 font-normal">Paytm, BHIM, CRED, or any UPI ID</span>
//               </div>
//             </div>
//             <span className="text-[10px] text-[#1e3a5f]/70 font-bold">UPI INTENT</span>
//           </motion.button>

//           {/* Credit/Debit Cards */}
//           <motion.button
//             whileHover={{ scale: 1.01 }}
//             whileTap={{ scale: 0.99 }}
//             onClick={() => handlePayment("Card", "card")}
//             disabled={loading}
//             className="w-full bg-[#1e3a5f] text-white py-4 px-5 rounded-2xl font-bold flex items-center justify-between hover:bg-[#142844] transition-all disabled:opacity-50 shadow-md shadow-[#1e3a5f]/15"
//           >
//             <div className="flex items-center gap-3">
//               {isButtonLoading("Card") ? (
//                 <Loader2 className="w-5 h-5 animate-spin" />
//               ) : (
//                 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
//                   <CreditCard className="w-5 h-5" />
//                 </div>
//               )}
//               <div className="text-left">
//                 <span className="block text-sm font-extrabold leading-none mb-0.5">Credit / Debit Card</span>
//                 <span className="text-[10px] opacity-80 font-normal">Visa, Mastercard, RuPay, Maestro</span>
//               </div>
//             </div>
//             <span className="text-xs bg-white/20 px-2 py-1 rounded-md font-bold">CARDS</span>
//           </motion.button>
//         </div>

//         {/* Secure Transaction Footer Info */}
//         <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
//           <Info className="w-3.5 h-3.5" />
//           <span>Payments are processed securely via Razorpay 256-bit SSL encryption.</span>
//         </div>
//       </motion.div>
//     </div>
//   );
// }


import { X, Loader2, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MESSAGES } from "../../lib/messages";

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
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const URI_SCHEMES: Record<string, string> = {
    "PhonePe": "phonepe://pay",
    "Paytm": "paytmmp://pay"
  };

  const handleNativeUPIRedirect = async (label: "PhonePe" | "Paytm") => {
    setLoading(true);
    setActiveMode(label);

    const trackingTxnId = `TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const YOUR_UPI_ID = "8766372355@axl"; 

    const appName = MESSAGES?.payment?.appName || "Legal Doc Maker";
    const description = MESSAGES?.payment?.description || "PDF Export";
    const amount = "10.00"; 

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
          setActiveMode(null);
        } else {
          setLoading(false);
          setActiveMode(null);
          onSuccess(trackingTxnId);
        }
      }, 1200);

    } catch (error) {
      console.error("Native intent failure:", error);
      toast.error(`Could not launch ${label}.`);
      setLoading(false);
      setActiveMode(null);
    }
  };

  const isButtonLoading = (label: string) => loading && activeMode === label;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="absolute inset-0" onClick={loading ? undefined : onClose} />

      {/* Changed from motion.div to regular div */}
      <div className="bg-white rounded-t-[32px] shadow-2xl max-w-lg w-full p-6 pb-10 relative z-10 border-t border-gray-100 transform translate-y-0 transition-transform duration-300">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h2 className="text-xl font-black text-[#1e3a5f] mb-1">
          {MESSAGES?.payment?.title || "Choose Payment Method"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {MESSAGES?.payment?.subtitle || "Complete payment to safely export document"}
        </p>

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
              <span className="text-2xl font-black text-[#1e3a5f]">
                {MESSAGES?.payment?.feeAmount || "₹10"}
              </span>
            </div>
          </div>
        </div>

        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3.5 pl-1">
          Select Payment App
        </h3>

        <div className="space-y-3">
          {/* Changed from motion.button to regular button */}
          <button
            onClick={() => handleNativeUPIRedirect("PhonePe")}
            disabled={loading}
            className="w-full bg-[#5f259f] text-white py-4 px-5 rounded-2xl font-bold flex items-center justify-between shadow-lg shadow-[#5f259f]/10 hover:bg-[#4a1d7d] transition-all disabled:opacity-50 active:scale-95"
          >
            <div className="flex items-center gap-3">
              {isButtonLoading("PhonePe") ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-sm">
                  PP
                </div>
              )}
              <div className="text-left">
                <span className="block text-sm font-extrabold leading-none mb-0.5">PhonePe</span>
                <span className="text-[10px] opacity-80 font-normal">Pay directly via PhonePe App</span>
              </div>
            </div>
          </button>

          {/* Changed from motion.button to regular button */}
          <button
            onClick={() => handleNativeUPIRedirect("Paytm")}
            disabled={loading}
            className="w-full bg-[#00baf2] text-white py-4 px-5 rounded-2xl font-bold flex items-center justify-between shadow-lg shadow-[#00baf2]/10 hover:bg-[#0099c8] transition-all disabled:opacity-50 active:scale-95"
          >
            <div className="flex items-center gap-3">
              {isButtonLoading("Paytm") ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-xs">
                  PM
                </div>
              )}
              <div className="text-left">
                <span className="block text-sm font-extrabold leading-none mb-0.5">Paytm</span>
                <span className="text-[10px] opacity-80 font-normal">Pay directly via Paytm App</span>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Requires official application setup on device to process intents.</span>
        </div>
      </div>
    </div>
  );
}