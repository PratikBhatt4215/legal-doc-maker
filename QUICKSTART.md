# Quick Start Guide - Test Without Credentials

The app is **ready to run immediately** in demo mode without any setup!

## 🚀 Run Right Now (No Setup Needed)

```bash
pnpm run dev
```

The app will automatically run in **demo mode** if Firebase/Razorpay credentials are not configured.

## 🎮 Demo Mode Features

### What Works in Demo Mode:
- ✅ **All 9 screens** fully functional
- ✅ **Authentication** - Sign up/login (local only, no Firebase needed)
- ✅ **Dashboard** - Browse all court categories
- ✅ **Editor** - Create and edit documents
- ✅ **Auto-save** - Drafts saved to browser localStorage
- ✅ **Payment** - Simulated payment (no real charges)
- ✅ **PDF Export** - Download documents as PDF
- ✅ **Profile** - View stats and history
- ✅ **Admin Panel** - Manage forms

### What's Different in Demo Mode:
- ⚠️ **Authentication** - Data stored locally (not synced to cloud)
- ⚠️ **Payment** - Simulated (no real money processed)
- ⚠️ **Database** - localStorage only (data lost on browser clear)

## 📱 Test the Full App Flow

### 1. Start the App
```bash
pnpm run dev
```

### 2. Go Through the Journey
1. **Splash Screen** → Wait 2 seconds
2. **Language Selection** → Click Hindi or English
3. **Sign Up** → Enter any email/password (demo mode)
4. **Dashboard** → Click any court card
5. **Select Form** → Choose a legal form
6. **Create Document** → Type in the editor
7. **Export PDF** → Click Export, simulated payment
8. **Download** → PDF downloads automatically

### 3. Test Features
- **Auto-save**: Type in editor, refresh page, content persists
- **Language**: Switch between Hindi/English typing
- **Formatting**: Try bold, italic, underline
- **Profile**: View user stats and payment history
- **Admin Panel**: Access from profile (all users are admin in demo)

## 🔧 Enable Real Features (Optional)

Want to enable **real authentication** and **payments**?

### Quick Setup (15 minutes)

1. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

2. **Add Firebase credentials** (see `SETUP.md`):
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create project → Get credentials
   - Add to `.env` file

3. **Add Razorpay key** (see `SETUP.md`):
   - Go to [Razorpay Dashboard](https://razorpay.com)
   - Generate test key
   - Add to `.env` file

4. **Restart app**:
   ```bash
   pnpm run dev
   ```

Now you have **real authentication** and **payment processing**!

## 🎯 What to Test

### Essential Flow
- [ ] Splash screen animation
- [ ] Language selection persists
- [ ] Sign up creates account
- [ ] Login works with same credentials
- [ ] Dashboard shows all 6 courts
- [ ] All court forms load correctly
- [ ] Editor allows typing
- [ ] Text formatting works
- [ ] Auto-save preserves drafts
- [ ] Payment completes (simulated)
- [ ] PDF downloads successfully
- [ ] Profile shows correct data
- [ ] Logout and login again works

### Mobile Testing
- [ ] Open on phone browser
- [ ] Touch interactions work
- [ ] Cards are tappable
- [ ] Text is readable
- [ ] Buttons are large enough
- [ ] Keyboard doesn't overlap inputs
- [ ] Scrolling is smooth

### PDF Testing
- [ ] PDF contains typed content
- [ ] Formatting is preserved
- [ ] Hindi text renders correctly
- [ ] File downloads properly
- [ ] Can open PDF in viewer

## 💡 Tips

### Clear Demo Data
```bash
# Open browser console and run:
localStorage.clear()
# Then refresh the page
```

### Test Different Scenarios
1. **New user**: Clear localStorage, sign up fresh
2. **Returning user**: Keep localStorage, test auto-login
3. **Multiple drafts**: Create docs in different courts
4. **Payment flow**: Complete payment multiple times
5. **PDF variations**: Try different content types

### Known Limitations (Demo Mode)
- Data stored in browser only (lost on clear)
- No multi-device sync
- No real payment processing
- No cloud backup

## 📚 Next Steps

### Want to Go Production?
1. Read `SETUP.md` for Firebase & Razorpay setup
2. Add credentials to `.env`
3. Test with real services
4. Deploy to Vercel/Firebase/Netlify

### Want to Customize?
- Edit court categories in `src/app/components/CourtModule.tsx`
- Add more forms to the forms array
- Customize colors in `src/styles/theme.css`
- Add your logo to splash screen

### Need Help?
- **Setup Issues**: See `SETUP.md`
- **Integration**: See `INTEGRATION_GUIDE.md`
- **Features**: See `PROJECT_SUMMARY.md`
- **Overview**: See `README.md`

---

## 🎉 You're Ready!

The app works **perfectly in demo mode** right now. No setup needed!

Just run `pnpm run dev` and start exploring all features.

When you're ready for production, follow `SETUP.md` to enable real authentication and payments.
