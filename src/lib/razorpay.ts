// Razorpay Integration Helper
import { toast } from 'sonner';

export interface RazorpayOptions {
  amount: number;
  currency: string;
  name: string;
  description: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: any) => void;
  userInfo?: {
    name: string;
    email: string;
    contact: string;
  };
  prefillMethod?: string;
  prefillProvider?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const initRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const openRazorpayCheckout = async (options: RazorpayOptions) => {
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  // Demo mode
  if (!razorpayKey || !razorpayKey.startsWith('rzp_')) {
    console.warn('Razorpay not configured. Running in demo mode.');
    setTimeout(() => {
      const demoPaymentId = 'demo_pay_' + Date.now();
      toast.info('Demo Mode: Payment simulated successfully!', { duration: 5000 });
      options.onSuccess(demoPaymentId);
    }, 1500);
    return;
  }

  const res = await initRazorpay();
  if (!res) {
    alert('Payment gateway failed to load. Please check your internet connection.');
    options.onFailure({ message: 'Failed to load payment gateway' });
    return;
  }

  const razorpayOptions: any = {
    key: razorpayKey,
    amount: options.amount * 100, // Convert to paise
    currency: options.currency,
    name: options.name,
    description: options.description,
    image: '/src/imports/ChatGPT_Image_May_9__2026__05_04_50_PM.png',
    handler: function (response: any) {
      options.onSuccess(response.razorpay_payment_id);
    },
    prefill: {
      ...(options.userInfo || {
        name: 'User',
        email: 'user@example.com',
        contact: '9999999999',
      }),
      method: options.prefillMethod,
      provider: options.prefillProvider
    },
    theme: { color: '#1e3a5f' },
    modal: {
      ondismiss: function () {
        options.onFailure({ message: 'Payment cancelled by user' });
      },
    },
  };

  const paymentObject = new window.Razorpay(razorpayOptions);
  paymentObject.open();
};
