# Integration Guide - Legal Docs Maker

Complete guide for integrating Firebase, Razorpay, and deploying your app.

## 🔥 Firebase Setup (15 min)

### 1. Create Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project" → Name: "Legal Docs Maker"
3. Click "Create Project"

### 2. Enable Authentication
1. Click "Authentication" → "Get Started"
2. Enable "Email/Password"
3. Enable "Phone" (optional, for OTP)

### 3. Create Firestore
1. Click "Firestore Database" → "Create database"
2. Start in "production mode"
3. Select region → "Enable"

### 4. Get Credentials
1. Project Settings → "Your apps"  
2. Click Web icon (</>)
3. Register app: "Legal Docs Maker Web"
4. Copy config values to `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

## 💳 Razorpay Setup (10 min)

### 1. Create Account
1. Go to [Razorpay.com](https://razorpay.com)
2. Sign up → Verify email
3. Settings → API Keys
4. Generate "Test Key"

### 2. Add to Environment
```env
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXX
```

### 3. Test Cards
- **Card**: 4111 1111 1111 1111, CVV: 123, Expiry: 12/25
- **UPI**: success@razorpay

## 📄 PDF Setup (Already Installed)

Libraries are already installed. PDF export works automatically after payment.

## 🧪 Testing

### Test Authentication
1. Sign up with test@example.com
2. Check Firebase Console → Authentication
3. Login with same credentials

### Test Payment  
1. Create document → Click Export PDF
2. Use test card: 4111 1111 1111 1111
3. PDF should download

## 🚀 Deployment

### Vercel
```bash
npx vercel --prod
# Add env variables in dashboard
```

### Firebase Hosting
```bash
npm i -g firebase-tools
firebase login
firebase init hosting
pnpm run build
firebase deploy
```

## 📱 Mobile Conversion

### Capacitor (Easiest)
```bash
npx cap init "Legal Docs Maker" "com.legaldocs.maker"
npx cap add android
npx cap add ios
pnpm run build
npx cap sync
npx cap open android
```

---

For detailed instructions, see `SETUP.md`.
