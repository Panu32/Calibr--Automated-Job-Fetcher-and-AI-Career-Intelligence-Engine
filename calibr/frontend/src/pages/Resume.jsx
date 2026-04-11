/**
 * pages/Resume.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Resume & Job Description Page
 *
 * Section 1 – Resume Upload:
 *   No resume → show UploadZone
 *   Resume exists → show metadata card + "Update Resume" toggle
 *
 * Section 2 – Job Description:
 *   Textarea to paste JD + "Save JD" button
 *   Shows parsed skills as tags after save
 *   "Analyse Skill Gap" triggers Gemini analysis
 *   Renders SkillGapReport on result
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import {
  FileText,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ClipboardList,
} from "lucide-react";

import { useAppStore } from "../store/useAppStore";
import { uploadResume, uploadJD, analyzeSkillGap } from "../services/api";
import UploadZone    from "../components/UploadZone";
import SkillTag      from "../components/SkillTag";
import SkillGapReport from "../components/SkillGapReport";

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

  // ── Local UI state ───────────────────────────────────────────────────────
  const [uploadLoading,   setUploadLoading]   = useState(false);  // resume upload spinner
  const [uploadSuccess,   setUploadSuccess]   = useState(false);  // green tick after upload
  const [showUploadZone,  setShowUploadZone]  = useState(false);  // "Update Resume" toggle
  const [jdText,          setJdText]          = useState("");     // JD textarea value
  const [jdLoading,       setJdLoading]       = useState(false);  // JD save spinner
  const [analysisLoading, setAnalysisLoading] = useState(false);  // skill gap spinner

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Called by UploadZone when the user picks/drops a file */
  const handleFileSelect = async (file) => {
    setUploadLoading(true);
    setUploadSuccess(false);
    try {
      const data = await uploadResume(userId, file);     // POST /resume/upload
      setResumeData(data);                               // update store
      setUploadSuccess(true);
      setShowUploadZone(false);                          // hide zone after success
      setTimeout(() => setUploadSuccess(false), 4000);  // auto-hide tick after 4s
    } catch (err) {
      setError(err.message || "Resume upload failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  /** Save the pasted JD text → POST /resume/jd */
  const handleSaveJD = async () => {
    if (!jdText.trim()) return;
    setJdLoading(true);
    try {
      const data = await uploadJD(userId, jdText);  // POST /resume/jd
      setJdData(data);                              // { parsed_skills, skill_count }
    } catch (err) {
      setError(err.message || "Failed to save job description.");
    } finally {
      setJdLoading(false);
    }
  };

  /** Run Gemini skill gap analysis → POST /analysis/skill-gap */
  const handleAnalyse = async () => {
    setAnalysisLoading(true);
    try {
      const result = await analyzeSkillGap(userId, jdText || null);
      setSkillGapResult(result);
    } catch (err) {
      setError(err.message || "Skill gap analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ── Format date helper ────────────────────────────────────────────────────
  const formatDate = (iso) => {
    if (!iso) return "Unknown date";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div className="min-h-full p-8 md:p-12 max-w-4xl mx-auto space-y-12">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="animate-reveal">
        <div className="inline-flex items-center gap-2 mb-4 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 transition-colors cursor-default">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Sparkles size={10} className="text-white fill-white" />
          </div>
          <span className="text-[9px] uppercase font-black tracking-[0.2em] text-indigo-300">Strategy Module</span>
        </div>
        <h1 className="font-heading text-4xl font-black text-white tracking-tighter leading-none">
          Skill Gap <span className="text-indigo-400">Intelligence.</span>
        </h1>
        <p className="text-gray-400 text-lg mt-3 font-medium max-w-2xl">
          Visualise your professional trajectory. Sync your resume with a target job description to reveal mission-critical gaps.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — Resume Upload
      ══════════════════════════════════════════════════════════════════ */}
      <section className="glass-card p-8 space-y-6 animate-reveal stagger-1 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <FileText size={20} className="text-purple-400" />
            </div>
            <h2 className="font-heading font-black text-white text-xl tracking-tight">
              Verified Profile
            </h2>
          </div>
          
          {uploadSuccess && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
              <CheckCircle2 size={12} />
              Synced successfully
            </div>
          )}
        </div>

        {/* No resume OR "Update" toggled → show upload zone */}
        {(!resumeData || showUploadZone) && (
          <UploadZone
            onFileSelect={handleFileSelect}
            isLoading={uploadLoading}
          />
        )}

        {/* Resume exists + not in update mode → show metadata card */}
        {resumeData && !showUploadZone && (
          <div className="flex items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/10 group hover:bg-white/[0.05] transition-all duration-300">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={28} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-black text-white text-lg tracking-tight">
                  {resumeData.filename || "resume.pdf"}
                </p>
                <div className="flex items-center gap-4 mt-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <Calendar size={12} />
                    {formatDate(resumeData.uploaded_at)}
                  </p>
                  <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                    {resumeData.skill_count ?? resumeData.extracted_skills?.length ?? 0} Skills Detected
                  </p>
                </div>
              </div>
            </div>

            {/* Update resume button */}
            <button
              id="update-resume-btn"
              onClick={() => setShowUploadZone(true)}
              className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 border border-white/5 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
            >
              <RotateCcw size={12} />
              Re-Initialise
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — Job Description
      ══════════════════════════════════════════════════════════════════ */}
      <section className="glass-card p-8 space-y-6 animate-reveal stagger-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <ClipboardList size={20} className="text-violet-400" />
          </div>
          <h2 className="font-heading font-black text-white text-xl tracking-tight">
            Target Job Description
          </h2>
        </div>

        {/* JD Textarea */}
        <div className="relative group">
          <textarea
            id="jd-textarea"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste target job requirements here...&#10;&#10;Calibr will extract the exact technical stack and map it to your profile."
            rows={8}
            className="input-field w-full px-6 py-5 bg-white/[0.02] border-white/10 rounded-2xl resize-none font-medium text-sm leading-relaxed placeholder-gray-600 focus:bg-white/[0.04] transition-all"
            aria-label="Job description text"
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             {/* Save JD */}
            <button
              id="save-jd-btn"
              onClick={handleSaveJD}
              disabled={!jdText.trim() || jdLoading || !resumeData}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 border border-white/5 hover:bg-white/5 hover:text-white disabled:opacity-20 transition-all flex items-center gap-2.5"
            >
              {jdLoading ? <Loader2 size={14} className="animate-spin text-indigo-400" /> : <CheckCircle2 size={14} />}
              {jdLoading ? "Saving…" : "Save Blueprint"}
            </button>

            {/* Hint if no resume */}
            {!resumeData && (
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/70 ml-2">
                Sync profile first
              </span>
            )}
          </div>

          {/* Analyse Skill Gap */}
          <button
            id="analyse-skill-gap-btn"
            onClick={handleAnalyse}
            disabled={(!jdData && !jdText.trim()) || analysisLoading || !resumeData}
            className="btn-primary px-8 py-3.5 flex items-center gap-3 text-xs shadow-2xl shadow-indigo-500/20 disabled:opacity-20 transition-all"
          >
            {analysisLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="fill-white" />}
            {analysisLoading ? "Running Neural Analysis…" : "Generate Gap Model"}
          </button>
        </div>

        {/* Parsed JD skills (shown after Save JD) */}
        {jdData?.parsed_skills?.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
              Extracted Stack Requirements ({jdData.skill_count})
            </p>
            <div className="flex flex-wrap gap-2">
              {jdData.parsed_skills.map((skill, i) => (
                <SkillTag key={i} skill={skill} showIcon={false} className="bg-white/5 border-white/5 text-gray-300 font-bold" />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — Skill Gap Report (shown after analysis)
      ══════════════════════════════════════════════════════════════════ */}
      {skillGapResult && (
        <section className="animate-reveal stagger-3">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
              <Sparkles size={20} className="text-pink-400" />
            </div>
            <h2 className="font-heading font-black text-white text-2xl tracking-tight">
              Analysis Results
            </h2>
          </div>
          <SkillGapReport skillGapResult={skillGapResult} />
        </section>
      )}
    </div>
  );
}
