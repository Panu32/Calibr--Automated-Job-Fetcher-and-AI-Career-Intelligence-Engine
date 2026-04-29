import React, { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Sparkles,
  ClipboardList,
  Target,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAppStore } from "../store/useAppStore";
import { uploadResume, uploadJD, analyzeSkillGap } from "../services/api";
import UploadZone    from "../components/UploadZone";
import SkillTag      from "../components/SkillTag";
import SkillGapReport from "../components/SkillGapReport";

/**
 * Resume & Strategy Module - The Professional Mapping Engine
 */
export default function Resume() {
  const {
    user,
    resumeData,
    jdData,
    skillGapResult,
    setResumeData,
    setJdData,
    setSkillGapResult,
    setError,
  } = useAppStore();

  const userId = user?._id || user?.id;

  // ── Local State ──
  const [uploadLoading,   setUploadLoading]   = useState(false);
  const [uploadSuccess,   setUploadSuccess]   = useState(false);
  const [showUploadZone,  setShowUploadZone]  = useState(false);
  const [jdText,          setJdText]          = useState(jdData?.jd_text || "");
  const [jdLoading,       setJdLoading]       = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Sync local jdText with jdData from store
  useEffect(() => {
    if (jdData?.jd_text && !jdText) {
      setJdText(jdData.jd_text);
    }
  }, [jdData, jdText]);

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

  const handleSaveJD = async () => {
    if (!jdText.trim()) return;
    setJdLoading(true);
    try {
      const data = await uploadJD(userId, jdText);
      setJdData(data);
    } catch (err) {
      setError(err.message || "Failed to synchronise target blueprint.");
    } finally {
      setJdLoading(false);
    }
  };

  const handleAnalyse = async () => {
    setAnalysisLoading(true);
    try {
      const result = await analyzeSkillGap(userId, jdText || null);
      setSkillGapResult(result);
    } catch (err) {
      setError(err.message || "Neural analysis encountered an anomaly.");
    } finally {
      setAnalysisLoading(false);
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
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Analysis Module</span>
        </div>
        
        <h1 className="font-heading text-5xl md:text-7xl font-semibold text-white tracking-tight leading-[1.1]">
          Strategic <br />
          <span className="text-indigo-500">Mapping.</span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl font-normal leading-relaxed tracking-tight opacity-80">
          Quantify your professional footprint against target requirements to reveal strategic growth clusters and priority learning nodes.
        </p>
      </motion.section>

      {/* ── Section 1: Professional Footprint (Resume) ── */}
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
                 Active Profile
               </h2>
               <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mt-1">Primary Professional Core</p>
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
                    {resumeData.filename || "RESUME_PRIMARY.PDF"}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <Calendar size={12} className="opacity-40" />
                      {formatDate(resumeData.uploaded_at)}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/80">
                      {resumeData.skill_count ?? 0} NODES DETECTED
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowUploadZone(true)}
                className="btn-secondary px-6 py-3 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2.5"
              >
                <RotateCcw size={14} />
                Refresh Profile
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ── Section 2: Target Blueprint (JD) ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-12 space-y-12 border-white/[0.05]"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
            <ClipboardList size={28} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="font-heading font-black text-white text-3xl tracking-tighter leading-none">
              Role Blueprint
            </h2>
            <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Target Semantic Mapping</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[32px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste role requirements or job description here...&#10;&#10;Our AI will synthesise the technical requirements to build a comparative trajectory model."
            rows={10}
            className="w-full px-10 py-8 bg-[#030712]/60 border border-white/[0.08] rounded-[32px] resize-none font-medium text-[16px] leading-relaxed placeholder-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500/40 transition-all relative z-10 shadow-inner tracking-tight"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 pt-4">
          <div className="flex items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveJD}
              disabled={!jdText.trim() || jdLoading || !resumeData}
              className="px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 border border-white/[0.08] hover:bg-white/[0.05] hover:text-white hover:border-white/20 disabled:opacity-20 transition-all flex items-center gap-3 group"
            >
              {jdLoading ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <CheckCircle2 size={18} className="group-hover:text-indigo-400 transition-colors" />}
              Commit Blueprint
            </motion.button>

            {!resumeData && (
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/70">Awaiting Profile Synchronisation</span>
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAnalyse}
            disabled={(!jdData && !jdText.trim()) || analysisLoading || !resumeData}
            className="btn-primary px-12 py-5 flex items-center gap-4 text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 disabled:opacity-20 transition-all group"
          >
            {analysisLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />}
            Execute Analysis
          </motion.button>
        </div>

        {jdData?.parsed_skills?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 pt-12 border-t border-white/[0.05]"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">
              SYNTHESISED NODES ({jdData.skill_count})
            </p>
            <div className="flex flex-wrap gap-3 max-w-6xl">
              {jdData.parsed_skills.map((skill, i) => (
                <SkillTag key={i} skill={skill} showIcon={false} className="bg-white/[0.03] border-white/[0.08] text-slate-400 font-black px-5 py-2.5 rounded-xl hover:border-indigo-500/30 hover:text-indigo-300 transition-all cursor-default" />
              ))}
            </div>
          </motion.div>
        )}
      </motion.section>

      {/* ── Section 3: Strategic Outcome (Report) ── */}
      <AnimatePresence>
        {skillGapResult && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 pb-20"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                <Sparkles size={28} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="font-heading font-black text-white text-4xl tracking-tighter leading-none">
                  Assessment
                </h2>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Neural Gap Synthesis Complete</p>
              </div>
            </div>
            
            <div className="space-y-16">
               <SkillGapReport skillGapResult={skillGapResult} />
               
               {/* Dynamic CTA */}
               <div className="flex justify-center pt-8">
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => {
                     document.getElementById('nav-chat')?.click();
                     setTimeout(() => {
                       const textarea = document.querySelector('textarea');
                       if (textarea) {
                         textarea.value = "Tell me more about the analysis you just ran. What are my top priorities for this role?";
                         textarea.focus();
                       }
                     }, 500);
                   }}
                   className="flex items-center gap-5 px-16 py-6 rounded-[32px] bg-slate-900 border border-white/[0.12] hover:border-indigo-500/50 text-white transition-all group shadow-2xl shadow-black"
                 >
                   <Sparkles size={24} className="text-indigo-400" />
                   <span className="text-sm font-black uppercase tracking-[0.3em]">Query Analysis Assistant</span>
                   <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                 </motion.button>
               </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

