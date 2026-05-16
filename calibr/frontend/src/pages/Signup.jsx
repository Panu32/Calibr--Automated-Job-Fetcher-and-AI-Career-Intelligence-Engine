import React, { useState } from "react";
import { User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { signup as signupApi, loginWithGoogle } from "../services/api";
import { GoogleLogin } from "@react-oauth/google";
import logo from "../assets/logo.png";

export default function Signup({ onToggleMode }) {
  const { setAuth, setLoading, isLoading, setError } = useAppStore();
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password) {
      return setError("Please fill in all fields.");
    }

    setLoading(true);
    try {
      const data = await signupApi(formData);
      setAuth(data.user, data.access_token);
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const data = await loginWithGoogle(credentialResponse.credential);
      setAuth(data.user, data.access_token);
    } catch (err) {
      setError(err.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#020617] overflow-hidden relative">
      {/* Dynamic Background */}
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Logo/Title Area */}
        <div className="text-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center justify-center mb-8"
          >
            <img src={logo} alt="CalibrAI" className="w-24 h-auto object-contain" />
          </motion.div>
          <p className="text-slate-400 font-medium tracking-tight text-lg">
            Start your elite career journey today.
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />
          
          <div className="flex flex-col gap-8">
            {/* Google Auth Integration */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-full flex justify-center scale-110 origin-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google Signup Failed")}
                  theme="filled_black"
                  shape="pill"
                  text="signup_with"
                  width="100%"
                />
              </div>
              
              <div className="flex items-center gap-4 w-full px-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 whitespace-nowrap">Corporate SSO / Manual</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                Full Legal Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Johnathan Doe"
                  className="input-field pl-12"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                Professional Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="input-field pl-12"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                Secure Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="input-field pl-12"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4.5 text-base font-black uppercase tracking-[0.2em] mt-4"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="text-center mt-10">
            <p className="text-slate-500 text-[13px] font-medium">
              Already a member?{" "}
              <button
                onClick={onToggleMode}
                className="text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-widest ml-1 transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>

        <p className="text-center mt-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">
          Executive Career Intelligence v1.2
        </p>
      </motion.div>
    </div>
  );
}
