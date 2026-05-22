# Test Onboarding Flow - Quick Guide

## 🚀 Quick Test (30 seconds)

### Test First-Time User Experience

1. **Clear Data** (opens browser console with F12):
   ```javascript
   localStorage.clear()
   ```

2. **Refresh the page**

3. **Watch the flow:**
   - ✨ **Splash Screen** appears (animated logo, 2.5s)
   - 🌍 **Language Selection** appears
   - Click **English** or **हिन्दी**
   - 📄 **Terms & Conditions** opens in selected language
   - Scroll through the terms
   - Check the ✓ "I agree" checkbox
   - Click **Continue** button
   - 🔐 **Login screen** appears

**✅ Success!** You've completed the onboarding flow.

---

## 🔄 Test Returning User

1. **Complete onboarding** (follow steps above + login)

2. **Refresh the page**

3. **Expected behavior:**
   - ✨ Splash screen (2.5s)
   - 🎯 Direct to Dashboard (skips language & terms)

**Why?** Terms already accepted + you're logged in.

---

## 🌍 Test Language Switching

### Test English Version

1. Clear localStorage
2. Refresh page
3. Select **English**
4. Verify Terms appear in English
5. Check all UI text is English

### Test Hindi Version

1. Clear localStorage
2. Refresh page
3. Select **हिन्दी (Hindi)**
4. Verify Terms appear in Hindi (हिन्दी में)
5. Check all UI text is Hindi

---

## 🎨 Visual Features to Test

### Splash Screen
- [ ] Animated logo appears
- [ ] Gradient blue/purple background
- [ ] Pulsing animations
- [ ] "Draft Smart. Draft Legal." tagline
- [ ] Hindi tagline below
- [ ] Loading dots at bottom
- [ ] Auto-navigates after 2.5s

### Language Selection
- [ ] Gradient animated background
- [ ] Two large language buttons
- [ ] Flag emojis (🇬🇧 🇮🇳)
- [ ] Buttons scale on hover
- [ ] Arrow appears on hover (→)
- [ ] Smooth animations

### Terms & Conditions
- [ ] Back button (top left)
- [ ] Logo/brand (top right)
- [ ] Large title card with icon
- [ ] Scrollable terms content
- [ ] "Scroll to read more" indicator
- [ ] Checkbox with custom styling
- [ ] Disabled Continue button (gray)
- [ ] Enabled Continue button (blue)
- [ ] Yellow disclaimer at bottom
- [ ] Proper Hindi font if Hindi selected

---

## 📱 Mobile Testing

### Test on Mobile Device

1. Open app on phone browser
2. Test touch interactions:
   - [ ] Language buttons large enough
   - [ ] Terms scrolls smoothly
   - [ ] Checkbox easy to tap
   - [ ] Continue button accessible
   - [ ] Text readable on small screen

---

## 🔐 Test Terms Enforcement

### Cannot Skip Terms

1. Clear localStorage
2. Refresh page
3. Go through splash → language selection
4. Try to bypass terms screen
5. **Expected:** Can only proceed by accepting

### Continue Button Disabled

1. Reach Terms screen
2. Try clicking Continue without checkbox
3. **Expected:** Button is gray and nothing happens
4. Check the checkbox
5. **Expected:** Button turns blue and works

---

## 🐛 Troubleshooting Tests

### If Stuck on Splash

**Test:**
1. Open browser console (F12)
2. Look for errors
3. Check if timer is firing

**Fix:**
```javascript
// Force navigate past splash
localStorage.setItem('termsAccepted', 'true')
```

### If Terms Not Showing

**Test:**
```javascript
// Check current state
console.log('Terms accepted:', localStorage.getItem('termsAccepted'))
console.log('Language:', localStorage.getItem('preferred_language'))
```

**Reset:**
```javascript
localStorage.clear()
```

### If Wrong Language

**Check:**
```javascript
localStorage.getItem('preferred_language')
// Should be 'en' or 'hi'
```

**Fix:**
```javascript
localStorage.setItem('preferred_language', 'en') // or 'hi'
```

---

## ✅ Acceptance Criteria

### User Experience
- [x] Splash screen shows for 2-3 seconds
- [x] Language selection has 2 clear options
- [x] Terms appear immediately after language selection
- [x] Terms are in the selected language
- [x] Cannot proceed without accepting terms
- [x] Continue button disabled until checkbox checked
- [x] Back button returns to language selection
- [x] After acceptance, user proceeds to login
- [x] Returning users skip onboarding

### Visual Design
- [x] Professional, premium appearance
- [x] Smooth animations throughout
- [x] Mobile-responsive design
- [x] High-quality typography
- [x] Proper Hindi font rendering
- [x] Consistent color scheme

### Functionality
- [x] Terms acceptance stored in localStorage
- [x] Language preference persisted
- [x] App enforces terms acceptance
- [x] Bilingual support works correctly
- [x] Navigation flow is logical

---

## 🎯 Test Checklist

### Complete Test Suite

#### First-Time User
- [ ] Splash screen animation
- [ ] Language selection appears
- [ ] Select English → Terms in English
- [ ] Select Hindi → Terms in Hindi
- [ ] Checkbox required
- [ ] Continue button behavior
- [ ] Disclaimer visible
- [ ] Proceeds to login after accept

#### Returning User
- [ ] Auto-login to dashboard
- [ ] Terms not shown again
- [ ] Language preference remembered

#### Edge Cases
- [ ] Back button works
- [ ] Refresh during onboarding
- [ ] Clear cache mid-flow
- [ ] Multiple language switches

---

## 📊 Expected Results

### localStorage After Completion

```javascript
// Check what's stored
console.log({
  termsAccepted: localStorage.getItem('termsAccepted'),
  termsAcceptedDate: localStorage.getItem('termsAcceptedDate'),
  language: localStorage.getItem('preferred_language')
})

// Should show:
// {
//   termsAccepted: "true",
//   termsAcceptedDate: "2026-05-14T...",
//   language: "en" or "hi"
// }
```

---

## 🚀 Quick Reset Commands

### Complete Reset (Start Fresh)
```javascript
localStorage.clear()
location.reload()
```

### Reset Only Terms
```javascript
localStorage.removeItem('termsAccepted')
localStorage.removeItem('termsAcceptedDate')
location.reload()
```

### Change Language
```javascript
localStorage.setItem('preferred_language', 'hi') // or 'en'
location.reload()
```

---

## 📸 Screenshot Checklist

For documentation/App Store:
- [ ] Splash screen with animations
- [ ] Language selection screen
- [ ] Terms & Conditions (English)
- [ ] Terms & Conditions (Hindi)
- [ ] Checkbox checked state
- [ ] Continue button (disabled)
- [ ] Continue button (enabled)
- [ ] Mobile view of each screen

---

## ⏱️ Performance Expectations

- **Splash duration:** 2.5 seconds
- **Language selection:** Instant response
- **Terms loading:** < 100ms
- **Animations:** 60 FPS smooth
- **Total onboarding:** < 30 seconds

---

**Last Updated:** May 14, 2026
**Status:** Ready for Testing ✅
