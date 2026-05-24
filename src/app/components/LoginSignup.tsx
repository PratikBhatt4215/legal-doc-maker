import { motion } from "motion/react";
import { useState } from "react";
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { storage } from '../../lib/storage';
import { MESSAGES, getAuthErrorMessage } from '../../lib/messages';

interface LoginSignupProps {
  onLogin: (userId: string, userData: any) => void;
}

export function LoginSignup({ onLogin }: LoginSignupProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login with Firebase
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

        const userData = {
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          uid: userCredential.user.uid
        };

        storage.saveUserSession(userCredential.user.uid, userData);
        onLogin(userCredential.user.uid, userData);

      } else {
        // Sign Up with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

        // Set display name in Firebase Auth
        await updateProfile(userCredential.user, {
          displayName: formData.fullName
        });

        // Save user profile in Firestore (optional — does not block login if Firestore rules fail)
        if (db) {
          try {
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              fullName: formData.fullName,
              email: formData.email.trim(),
              mobile: formData.mobile,
              createdAt: new Date().toISOString(),
              isAdmin: false,
              documentsCreated: 0,
              totalSpent: 0
            });
          } catch (firestoreError: any) {
            // Firestore write failed (e.g. security rules) — log it but still let user in
            console.warn('Firestore profile save failed (non-critical):', firestoreError.code, firestoreError.message);
          }
        }

        const userData = {
          email: formData.email.trim(),
          displayName: formData.fullName,
          uid: userCredential.user.uid,
          mobile: formData.mobile
        };

        storage.saveUserSession(userCredential.user.uid, userData);
        onLogin(userCredential.user.uid, userData);
      }
    } catch (error: any) {
      console.error('Firebase Auth error:', error.code, error.message);
      const friendlyMsg = getAuthErrorMessage(error.code);
      // Show code alongside message so we can diagnose unknown errors
      const debugCode = error.code ? ` [${error.code}]` : '';
      setError(friendlyMsg + debugCode);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setError(MESSAGES.auth.emailRequired);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, formData.email.trim());
      alert(MESSAGES.auth.passwordResetSent);
    } catch (error: any) {
      console.error('Password reset error:', error.code, error.message);
      setError(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
  };

  const M = MESSAGES.loginScreen;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-8">
      

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Login / Sign Up Toggle */}
        <div className="flex mb-8 bg-gray-100 rounded-full p-1">
          <button
            onClick={() => { setIsLogin(true); setError(""); }}
            className={`flex-1 py-2 px-4 rounded-full transition-all font-medium ${
              isLogin ? "bg-[#1e3a5f] text-white shadow" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {M.tabLogin}
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); }}
            className={`flex-1 py-2 px-4 rounded-full transition-all font-medium ${
              !isLogin ? "bg-[#1e3a5f] text-white shadow" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {M.tabSignUp}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name — Sign Up only */}
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={M.placeholderName}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
                required
              />
            </div>
          )}

          {/* Mobile — Sign Up only */}
          {!isLogin && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder={M.placeholderMobile}
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
                required
              />
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder={M.placeholderEmail}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder={M.placeholderPass}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Forgot Password */}
          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-[#9b1c31] hover:underline disabled:opacity-50"
              >
                {M.forgotPassword}
              </button>
            </div>
          )}

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#2a4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? M.btnLoading : isLogin ? M.btnLogin : M.btnSignUp}
          </motion.button>
        </form>

        {/* Switch Mode */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? M.noAccount : M.haveAccount}{" "}
          <button
            onClick={switchMode}
            className="text-[#9b1c31] font-semibold hover:underline"
          >
            {isLogin ? M.switchToSignUp : M.switchToLogin}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
