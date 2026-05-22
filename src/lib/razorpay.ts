// Razorpay Integration Helper

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
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const initRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const openRazorpayCheckout = async (options: RazorpayOptions) => {
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  // Check if Razorpay is configured
  if (!razorpayKey || !razorpayKey.startsWith('rzp_')) {
    console.warn('Razorpay not configured. Running in demo mode.');
    // Simulate payment in demo mode
    setTimeout(() => {
      const demoPaymentId = 'demo_pay_' + Date.now();
      alert('Demo Mode: Payment simulated successfully!\n\nPayment ID: ' + demoPaymentId + '\n\nTo enable real payments, add VITE_RAZORPAY_KEY_ID to .env file.');
      options.onSuccess(demoPaymentId);
    }, 1500);
    return;
  }

  const res = await initRazorpay();

  if (!res) {
    alert('Razorpay SDK failed to load. Please check your internet connection.');
    options.onFailure({ message: 'Failed to load payment gateway' });
    return;
  }

  const razorpayOptions = {
    key: razorpayKey,
    amount: options.amount * 100, // Convert to paise
    currency: options.currency,
    name: options.name,
    description: options.description,
    image: '/src/imports/ChatGPT_Image_May_9__2026__05_04_50_PM.png',
    handler: function (response: any) {
      options.onSuccess(response.razorpay_payment_id);
    },
    prefill: options.userInfo || {
      name: 'User',
      email: 'user@example.com',
      contact: '9999999999'
    },
    theme: {
      color: '#1e3a5f'
    },
    modal: {
      ondismiss: function() {
        options.onFailure({ message: 'Payment cancelled by user' });
      }
    }
  };

  const paymentObject = new window.Razorpay(razorpayOptions);
  paymentObject.open();
};
