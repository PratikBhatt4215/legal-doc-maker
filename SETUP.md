# Setup Guide - Legal Docs Maker

Complete step-by-step setup instructions to get your Legal Docs Maker app running with Firebase and Razorpay.

## ✅ Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Firebase account (free)
- Razorpay account (free for testing)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example env file:
```bash
cp .env.example .env
```

### 3. Setup Firebase (15 minutes)

#### A. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Enter project name: `Legal Docs Maker`
4. Disable Google Analytics (optional)
5. Click "Create Project"

#### B. Enable Authentication

1. In Firebase Console, click "Authentication" → "Get Started"
2. Go to "Sign-in method" tab
3. Enable "Email/Password"
4. Enable "Phone" (for future OTP feature)

#### C. Create Firestore Database

1. Click "Firestore Database" → "Create database"
2. Choose "Start in production mode"
3. Select your region
4. Click "Enable"

#### D. Get Firebase Config

1. Click Project Settings (gear icon) → "Project settings"
2. Scroll to "Your apps" section
3. Click Web icon (</>) to add web app
4. Register app name: `Legal Docs Maker Web`
5. Copy the `firebaseConfig` object values
6. Update your `.env` file:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=legal-docs-maker.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=legal-docs-maker
VITE_FIREBASE_STORAGE_BUCKET=legal-docs-maker.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

#### E. Setup Firestore Security Rules

Go to Firestore → Rules tab and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    match /documents/{documentId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    match /payments/{paymentId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    match /forms/{formId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

Click "Publish" to save.

### 4. Setup Razorpay (10 minutes)

#### A. Create Account

1. Go to [Razorpay](https://razorpay.com)
2. Sign up for a business account
3. Complete email verification
4. Go to Settings → API Keys
5. Click "Generate Test Key"

#### B. Configure Keys

1. Copy the "Key ID" (starts with `rzp_test_`)
2. Update your `.env` file:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXX
```

**Important:** The Razorpay Key Secret should NEVER be in frontend code. Store it in your backend only.

### 5. Run the App

Start the development server:

```bash
pnpm run dev
```

Open the preview URL (provided by Figma Make) or `http://localhost:5173` in your browser.

## 🧪 Testing

### Test Firebase Authentication

1. Click through splash screen
2. Select language
3. Try signing up with a new email
4. Check Firebase Console → Authentication to see your test user
5. Try logging in with the same credentials

### Test Razorpay Payment (Test Mode)

1. Login to the app
2. Navigate to any court → select a form
3. Create a document in the editor
4. Click "Export PDF"
5. Choose any payment method
6. Use Razorpay test credentials:

**Test Card:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date
- Name: Any name

**Test UPI:**
- UPI ID: `success@razorpay`

### Test PDF Generation

1. After successful payment, PDF should download automatically
2. Check your downloads folder
3. Open the PDF to verify content

## 🔧 Troubleshooting

### Firebase Errors

**"Firebase: Error (auth/network-request-failed)"**
- App automatically falls back to demo mode
- Check your internet connection
- Verify Firebase config in `.env`

**"Firebase: Error (auth/invalid-api-key)"**
- Double-check your API key in `.env`
- Make sure there are no extra spaces
- Verify the key in Firebase Console

### Razorpay Errors

**"Razorpay SDK failed to load"**
- Check internet connection
- Verify the Razorpay script is loading (check browser console)
- Clear browser cache and reload

**"Invalid key_id"**
- Verify you're using the Test Key ID
- Check for typos in `.env`
- Make sure you copied the full key including `rzp_test_`

### PDF Generation Errors

**"Failed to generate PDF"**
- Ensure you have content in the editor
- Check browser console for specific errors
- Try with simpler content first
- Make sure html2canvas loaded correctly

## 📱 Mobile Testing

### Test on Real Mobile Devices

1. Get your local IP address:
   ```bash
   # On Mac/Linux
   ifconfig | grep inet
   
   # On Windows
   ipconfig
   ```

2. Update Vite config to allow network access (already configured)

3. Open `http://YOUR_IP:5173` on your mobile device

4. Test touch interactions, responsive design, scrolling

### Install as PWA

1. Open the app in Chrome (Android) or Safari (iOS)
2. Look for "Add to Home Screen" or "Install" option
3. Follow prompts to install
4. Launch from home screen like a native app

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub

2. Connect to Vercel:
   ```bash
   npx vercel --prod
   ```

3. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env`
   - Redeploy

### Deploy to Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login:
   ```bash
   firebase login
   ```

3. Initialize:
   ```bash
   firebase init hosting
   ```

4. Build and deploy:
   ```bash
   pnpm run build
   firebase deploy
   ```

### Deploy to Netlify

1. Connect GitHub repo to Netlify
2. Set build command: `pnpm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy

## 🔐 Security Best Practices

### Before Going Live

1. **Firebase:**
   - Review Firestore security rules
   - Enable App Check for DDoS protection
   - Set up Firebase Auth domain restrictions

2. **Razorpay:**
   - Switch from Test Keys to Live Keys
   - Enable webhook signature verification
   - Set up payment reconciliation

3. **Environment:**
   - Never commit `.env` file
   - Use production API URLs
   - Enable HTTPS only

4. **Code:**
   - Remove console.logs
   - Add error tracking (Sentry)
   - Enable rate limiting

## 📊 Production Checklist

- [ ] Firebase Authentication working
- [ ] Firestore database created
- [ ] Security rules configured
- [ ] Razorpay test payments working
- [ ] PDF generation working
- [ ] Mobile responsive design tested
- [ ] PWA install tested
- [ ] Cross-browser testing done
- [ ] Performance optimization
- [ ] SEO meta tags added
- [ ] Analytics integrated
- [ ] Error tracking setup
- [ ] Backup strategy defined
- [ ] Monitoring setup

## 🆘 Getting Help

### Documentation
- [Firebase Docs](https://firebase.google.com/docs)
- [Razorpay Docs](https://razorpay.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)

### Support
- Check `INTEGRATION_GUIDE.md` for detailed instructions
- Review browser console for errors
- Check Firebase Console for authentication logs
- Review Razorpay Dashboard for payment logs

## 🎉 Success!

Once all steps are complete, you should have:
- ✅ Working authentication system
- ✅ Functional payment gateway
- ✅ PDF export capability
- ✅ Mobile-responsive app
- ✅ Production-ready deployment

**Next Steps:**
- Customize form templates
- Add more legal document types
- Implement admin features
- Set up analytics
- Plan native mobile app conversion

---

**Need more help?** Check the detailed `INTEGRATION_GUIDE.md` for advanced configurations.
