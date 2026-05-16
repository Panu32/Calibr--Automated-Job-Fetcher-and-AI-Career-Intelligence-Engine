import React, { useState } from "react";
import {
  FileText,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAppStore } from "../store/useAppStore";
import { uploadResume } from "../services/api";
import UploadZone    from "../components/UploadZone";

/**
 * Professional Profile Module - The Identity Synchronization Engine
 */
export default function Resume() {
  const {
    user,
    resumeData,
    setResumeData,
    setError,
  } = useAppStore();

  const userId = user?._id || user?.id;

  // ── Local State ──
  const [uploadLoading,   setUploadLoading]   = useState(false);
  const [uploadSuccess,   setUploadSuccess]   = useState(false);
  const [showUploadZone,  setShowUploadZone]  = useState(false);

  // ── Handlers ──
  const handleFileSelect = async (file) => {
    if (!userId) {
      return setError("Session identity not found. Please refresh or log in again.");
    }
    setUploadLoading(true);
    setUploadSuccess(false);
    try {
      const data = await uploadResume(userId, file);
      setResumeData(data);
      setUploadSuccess(true);
      setShowUploadZone(false);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      setError(err.message || "Credential synchronisation failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "LIVE SESSION";
    return new Date(iso).toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div className="min-h-full px-8 md:px-12 lg:px-16 py-12 md:py-20 space-y-20 relative">

      {/* ── Visual Meta Header ── */}
      <motion.section 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-full px-3 py-1 cursor-default">
          <Target size={14} className="text-indigo-400" />
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Profile Module</span>
        </div>
        
        <h1 className="font-heading text-5xl md:text-7xl font-semibold text-white tracking-tight leading-[1.1]">
          Professional <br />
          <span className="text-indigo-500">Identity.</span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl font-normal leading-relaxed tracking-tight opacity-80">
          Maintain your professional footprint. Synchronize your latest credentials to power the AI matching and assistance engines.
        </p>
      </motion.section>

      {/* ── Section: Professional Footprint (Resume) ── */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-10 space-y-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
              <FileText size={22} className="text-indigo-400" />
            </div>
            <div>
               <h2 className="font-heading font-semibold text-white text-2xl tracking-tight">
                 Active Credentials
               </h2>
               <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mt-1">Primary Profile Core</p>
            </div>
          </div>
          
          <AnimatePresence>
            {uploadSuccess && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-4 py-2"
              >
                <CheckCircle2 size={14} />
                Synchronized
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {(!resumeData || showUploadZone) ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-2"
            >
              <UploadZone
                onFileSelect={handleFileSelect}
                isLoading={uploadLoading}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="data"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-8 p-8 rounded-2xl bg-white/[0.01] border border-white/[0.04] group hover:border-indigo-500/20 transition-all duration-500"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-xl bg-slate-950 border border-white/[0.06] flex items-center justify-center shadow-sm">
                  <FileText size={32} className="text-slate-600 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-white text-xl tracking-tight mb-2">
                    {resumeData.filename || "PROFILE_PRIMARY.PDF"}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <Calendar size={12} className="opacity-40" />
                      {formatDate(resumeData.uploaded_at)}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowUploadZone(true)}
                className="btn-secondary px-6 py-3 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2.5"
              >
                <RotateCcw size={14} />
                Update Profile
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}

