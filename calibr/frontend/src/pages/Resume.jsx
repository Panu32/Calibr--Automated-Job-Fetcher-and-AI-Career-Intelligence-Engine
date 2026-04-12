import React, { useState } from "react";
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
  const [jdText,          setJdText]          = useState("");
  const [jdLoading,       setJdLoading]       = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // ── Handlers ──
  const handleFileSelect = async (file) => {
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
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div className="min-h-full p-8 md:p-16 max-w-5xl mx-auto space-y-16 relative">

      {/* ── Visual Meta Header ── */}
      <section className="animate-reveal">
        <div className="inline-flex items-center gap-3 mb-8 bg-indigo-500/5 border border-indigo-500/10 rounded-full px-4 py-2 hover:bg-indigo-500/10 transition-all cursor-default group">
          <Target size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-400/80">Strategy Implementation Module</span>
        </div>
        
        <h1 className="font-heading text-5xl md:text-6xl font-black text-white tracking-tighter leading-none text-balance">
          Gap <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 text-glow">Intelligence.</span>
        </h1>
        <p className="mt-8 text-slate-400 text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-balance">
          Visualise your professional trajectory. Calibr maps your current technical footprint against target job specifications to reveal strategic growth clusters.
        </p>
      </section>

      {/* ── Section 1: Neural Footprint (Resume) ── */}
      <section className="glass-card p-10 space-y-10 animate-reveal stagger-1 border-white/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg">
              <FileText size={22} className="text-indigo-400" />
            </div>
            <div>
               <h2 className="font-heading font-black text-white text-2xl tracking-tighter leading-none">
                 Verified Profile
               </h2>
               <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mt-2">Active Technical Footprint</p>
            </div>
          </div>
          
          {uploadSuccess && (
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-2.5 animate-reveal">
              <CheckCircle2 size={12} />
              Session Synchronised
            </div>
          )}
        </div>

        {(!resumeData || showUploadZone) && (
          <div className="pt-4">
            <UploadZone
              onFileSelect={handleFileSelect}
              isLoading={uploadLoading}
            />
          </div>
        )}

        {resumeData && !showUploadZone && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 p-8 rounded-3xl bg-white/[0.01] border border-white/[0.03] group hover:border-indigo-500/20 transition-all duration-700">
            <div className="flex items-center gap-6">
              <div className="relative group-hover:scale-105 transition-transform duration-500">
                <div className="absolute -inset-4 bg-indigo-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-16 h-16 rounded-2xl bg-[#050814] border border-white/5 flex items-center justify-center relative z-10 shadow-2xl">
                  <FileText size={32} className="text-indigo-500/40 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
              <div>
                <p className="font-black text-white text-xl tracking-tighter mb-2">
                  {resumeData.filename || "RESUME_PRIMARY.PDF"}
                </p>
                <div className="flex items-center gap-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
                    <Calendar size={12} className="opacity-50" />
                    {formatDate(resumeData.uploaded_at)}
                  </p>
                  <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/80">
                    {resumeData.skill_count ?? 0} NODES DETECTED
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowUploadZone(true)}
              className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border border-white/[0.05] hover:bg-white hover:text-black hover:scale-105 transition-all duration-500 flex items-center gap-3 active:scale-95"
            >
              <RotateCcw size={14} />
              Re-Initialise Session
            </button>
          </div>
        )}
      </section>

      {/* ── Section 2: Target Blueprint (JD) ── */}
      <section className="glass-card p-10 space-y-10 animate-reveal stagger-2 border-white/[0.03]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg">
            <ClipboardList size={22} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="font-heading font-black text-white text-2xl tracking-tighter leading-none">
              Target Blueprint
            </h2>
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mt-2">Semantic Extraction Engine</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-[26px] blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste technical role specifications here...&#10;&#10;Calibr will synthesise the requirements to build a comparative neural model."
            rows={8}
            className="w-full px-8 py-7 bg-[#050814]/50 border border-white/[0.03] rounded-[24px] resize-none font-medium text-[15px] leading-relaxed placeholder-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500/30 transition-all relative z-10"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSaveJD}
              disabled={!jdText.trim() || jdLoading || !resumeData}
              className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border border-white/[0.05] hover:bg-white/5 hover:text-white disabled:opacity-20 transition-all flex items-center gap-3 group"
            >
              {jdLoading ? <Loader2 size={16} className="animate-spin text-indigo-400" /> : <CheckCircle2 size={16} className="group-hover:text-indigo-400 transition-colors" />}
              {jdLoading ? "SAVING..." : "COMMIT BLUEPRINT"}
            </button>

            {!resumeData && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500/50 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                Awaiting Profile Sync
              </span>
            )}
          </div>

          <button
            onClick={handleAnalyse}
            disabled={(!jdData && !jdText.trim()) || analysisLoading || !resumeData}
            className="btn-primary px-10 py-4.5 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_15px_30px_rgba(79,70,229,0.3)] disabled:opacity-20 transition-all hover:scale-[1.02] active:scale-95 group"
          >
            {analysisLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />}
            {analysisLoading ? "EXECUTING NEURAL MAP..." : "DEPLOY ANALYSIS"}
          </button>
        </div>

        {jdData?.parsed_skills?.length > 0 && (
          <div className="space-y-6 pt-10 border-t border-white/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
              SYNTHESISED NODES ({jdData.skill_count})
            </p>
            <div className="flex flex-wrap gap-2.5 max-w-3xl">
              {jdData.parsed_skills.map((skill, i) => (
                <SkillTag key={i} skill={skill} showIcon={false} className="bg-white/[0.02] border-white/[0.03] text-slate-400 font-black px-4 py-2 rounded-xl" />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3: Strategic Outcome (Report) ── */}
      {skillGapResult && (
        <section className="animate-reveal stagger-3 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg">
              <Sparkles size={22} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="font-heading font-black text-white text-3xl tracking-tighter leading-none">
                Executive Assessment
              </h2>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mt-2">Neural Gap Synthesis Model</p>
            </div>
          </div>
          
          <div className="space-y-12">
             <SkillGapReport skillGapResult={skillGapResult} />
             
             {/* Dynamic CTA */}
             <div className="flex justify-center pt-8">
               <button 
                 onClick={() => {
                   document.getElementById('nav-chat')?.click();
                   // Wait for navigation
                   setTimeout(() => {
                     const textarea = document.querySelector('textarea');
                     if (textarea) {
                       textarea.value = "Tell me more about the analysis you just ran. What are my top priorities?";
                       textarea.focus();
                     }
                   }, 500);
                 }}
                 className="flex items-center gap-4 px-12 py-5 rounded-[24px] bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-white transition-all group hover:scale-[1.02] active:scale-95 shadow-2xl"
               >
                 <Sparkles size={20} className="text-indigo-400" />
                 <span className="text-xs font-black uppercase tracking-[0.3em]">Query Analysis with Assistant</span>
                 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </button>
             </div>
          </div>
        </section>
      )}
    </div>
  );
}

