import { motion } from "motion/react";
import logo from "../../imports/logo.png";
import { useState, useEffect } from "react";
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
sendPasswordResetEmail,
updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../../lib/firebase';
import { storage } from '../../lib/storage';

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
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
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
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        await updateProfile(userCredential.user, {
          displayName: formData.fullName
        });

        if (db) {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            fullName: formData.fullName,
            email: formData.email,
            mobile: formData.mobile,
            createdAt: new Date().toISOString(),
            isAdmin: false,
            documentsCreated: 0,
            totalSpent: 0
          });
        }

        const userData = {
          email: formData.email,
          displayName: formData.fullName,
          uid: userCredential.user.uid,
          mobile: formData.mobile
        };

        storage.saveUserSession(userCredential.user.uid, userData);
        onLogin(userCredential.user.uid, userData);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMessage = "An error occurred. Please try again.";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email already in use. Please login instead.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found. Please sign up.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else {
        errorMessage = error.code + " : " + error.message;
        alert(errorMessage);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, formData.email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setError("No account found with this email.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <img
          src={logo}
          alt="Legal Docs Maker"
          className="w-80 max-w-full h-auto mx-auto mb-2 object-contain drop-shadow-lg"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="flex mb-8 bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-full transition-all ${
              isLogin ? "bg-[#1e3a5f] text-white" : "text-gray-600"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-full transition-all ${
              !isLogin ? "bg-[#1e3a5f] text-white" : "text-gray-600"
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
                required={!isLogin}
              />
            </div>
          )}

          {!isLogin && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
                required={!isLogin}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e3a5f] focus:outline-none transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#9b1c31] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-[#2a4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </motion.button>
        </form>

        {isLogin && (
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{" "}
            <button
              onClick={() => setIsLogin(false)}
              className="text-[#9b1c31] font-semibold hover:underline"
            >
              Sign Up
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
