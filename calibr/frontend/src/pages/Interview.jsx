import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Send,
  Star,
  Trophy,
  ArrowLeft,
  Mic,
  Clock,
  Target,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAppStore } from "../store/useAppStore";
import { startInterview, submitInterviewAnswer } from "../services/api";

// ─── Phase config (must match backend PHASES list) ───────────────────────────
const PHASES = [
  { id: "introduction",       label: "Introduction",             icon: "👋" },
  { id: "project_deep_dive",  label: "Project Deep Dive",        icon: "🔍" },
  { id: "technical_round",    label: "Core Technical",           icon: "⚙️" },
  { id: "ai_ml_round",        label: "AI / ML Round",            icon: "🤖" },
  { id: "practical_thinking", label: "Practical Thinking",       icon: "🏗️" },
  { id: "behavioral",         label: "Behavioral",               icon: "🤝" },
  { id: "hr_closing",         label: "HR & Closing",             icon: "✅" },
];

// ─── Score badge color ────────────────────────────────────────────────────────
function getScoreColor(score) {
  if (score >= 8) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (score >= 6) return "text-indigo-400 bg-indigo-500/10 border-indigo-500/30";
  if (score >= 4) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  return "text-red-400 bg-red-500/10 border-red-500/30";
}

// ─── Typing text animation ────────────────────────────────────────────────────
function TypewriterText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-5 bg-indigo-400 ml-0.5 animate-pulse" />}
    </span>
  );
}

// ─── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ score }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${getScoreColor(score)}`}
    >
      <Star size={11} fill="currentColor" />
      {score}/10
    </motion.div>
  );
}

// ─── Phase sidebar item ───────────────────────────────────────────────────────
function PhaseItem({ phase, isActive, isDone, isSkipped }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all ${
      isActive  ? "bg-indigo-600/20 border border-indigo-500/30" :
      isDone    ? "opacity-50" :
      isSkipped ? "opacity-25" :
                  "opacity-30"
    }`}>
      <span className="text-base">{phase.icon}</span>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold truncate ${isActive ? "text-indigo-300" : "text-slate-400"}`}>
          {phase.label}
        </p>
        {isDone && <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Complete</p>}
        {isActive && <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider animate-pulse">Active</p>}
      </div>
      {isDone && <CheckCircle2 size={14} className="text-emerald-500 ml-auto flex-shrink-0" />}
      {isActive && <ChevronRight size={14} className="text-indigo-400 ml-auto flex-shrink-0" />}
    </div>
  );
}

// ─── Final Report Panel ───────────────────────────────────────────────────────
function FinalReport({ report, totalScore, answersGiven, job, onRestart }) {
  const avg = answersGiven > 0 ? Math.round((totalScore / answersGiven) * 10) / 10 : 0;
  const grade = avg >= 8 ? "Excellent" : avg >= 6 ? "Good" : avg >= 4 ? "Needs Work" : "Keep Practicing";
  const gradeColor = avg >= 8 ? "text-emerald-400" : avg >= 6 ? "text-indigo-400" : avg >= 4 ? "text-amber-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center space-y-8 px-8"
    >
      {/* Trophy */}
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center"
      >
        <Trophy size={48} className="text-amber-400" />
      </motion.div>

      <div>
        <h2 className="text-4xl font-bold text-white tracking-tight">Interview Complete</h2>
        <p className="text-slate-500 mt-2">{job?.title || "Position"} at {job?.company || "Company"}</p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-5xl font-black text-white">{avg}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Avg Score</p>
        </div>
        <div className="w-px h-12 bg-white/10" />
        <div className="text-center">
          <p className={`text-2xl font-black ${gradeColor}`}>{grade}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Overall Grade</p>
        </div>
        <div className="w-px h-12 bg-white/10" />
        <div className="text-center">
          <p className="text-3xl font-black text-white">{answersGiven}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Questions</p>
        </div>
      </div>

      {/* Report text */}
      <div className="max-w-lg bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-left">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
          <Sparkles size={12} /> AI Assessment
        </p>
        <p className="text-slate-300 text-sm leading-relaxed">
          {report?.split("\n").filter(l => l && !l.startsWith("INTERVIEW COMPLETE") && !l.startsWith("Role:") && !l.startsWith("Questions") && !l.startsWith("Average") && !l.startsWith("Total")).join(" ")}
        </p>
      </div>

      <button
        onClick={onRestart}
        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold uppercase tracking-wider transition-all"
      >
        <ArrowLeft size={14} />
        Back to Jobs
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Interview Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Interview() {
  const {
    user,
    selectedJob,
    interviewSession,
    setInterviewSession,
    setActiveTab,
    setError,
  } = useAppStore();

  const userId = user?._id || user?.id;

  const [loading,      setLoading]      = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [answer,       setAnswer]       = useState("");
  const [lastEval,     setLastEval]     = useState(null);
  const [question,     setQuestion]     = useState("");
  const [phase,        setPhase]        = useState("introduction");
  const [phaseIndex,   setPhaseIndex]   = useState(0);
  const [isComplete,   setIsComplete]   = useState(false);
  const [finalData,    setFinalData]    = useState(null);
  const [totalScore,   setTotalScore]   = useState(0);
  const [answersGiven, setAnswersGiven] = useState(0);
  const [isAiRole,     setIsAiRole]     = useState(false);
  const [timer,        setTimer]        = useState(0);
  const [sessionError, setSessionError] = useState(null); // holds error message when session dies

  const textareaRef = useRef(null);
  const timerRef    = useRef(null);

  // ── Start session when page loads ──
  useEffect(() => {
    if (!selectedJob || !userId) return;
    if (interviewSession?.session_id) {
      // Resume existing session
      setQuestion(interviewSession.question || "");
      setPhase(interviewSession.phase || "introduction");
      setPhaseIndex(interviewSession.phase_index || 0);
      setIsComplete(interviewSession.is_complete || false);
      setTotalScore(interviewSession.total_score || 0);
      setAnswersGiven(interviewSession.answers_given || 0);
      setIsAiRole(interviewSession.is_ai_role || false);
      return;
    }
    initSession();
  }, [selectedJob, userId]);

  // ── Per-question timer ──
  useEffect(() => {
    if (isComplete) return;
    setTimer(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [question, isComplete]);

  const formatTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  async function initSession() {
    setLoading(true);
    setLastEval(null);
    setSessionError(null);
    setInterviewSession(null); // clear old session so we always get a fresh one
    try {
      const result = await startInterview(userId, selectedJob);
      setInterviewSession(result);
      setQuestion(result.question);
      setPhase(result.phase);
      setPhaseIndex(result.phase_index || 0);
      setIsAiRole(result.is_ai_role || false);
    } catch (err) {
      setError(err.message || "Failed to start interview. Make sure your resume is uploaded.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setLastEval(null);
    setSessionError(null);
    const sessionId = interviewSession?.session_id;

    try {
      const result = await submitInterviewAnswer(sessionId, answer);
      setAnswer("");

      // Show evaluation first
      if (result.evaluation_score !== undefined) {
        setLastEval({
          score:    result.evaluation_score,
          feedback: result.evaluation_feedback,
        });
        setTotalScore(result.total_score || 0);
        setAnswersGiven(result.answers_given || 0);
      }

      // Brief pause so user reads feedback, then show next question
      await new Promise(r => setTimeout(r, 1800));

      if (result.is_complete) {
        setIsComplete(true);
        setFinalData(result);
        clearInterval(timerRef.current);
      } else {
        setQuestion(result.question);
        setPhase(result.phase);
        setPhaseIndex(result.phase_index || 0);
        setInterviewSession({ ...interviewSession, ...result });
      }
    } catch (err) {
      const msg = err.message || "Failed to submit answer.";
      // If session expired/not found, show inline restart option instead of global toast
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("expired")) {
        setSessionError("Your interview session expired (server restarted). Click below to restart.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) handleSubmitAnswer();
  };

  const handleBack = () => {
    setInterviewSession(null);
    setActiveTab("jobs");
  };

  // ── Guard: no job selected ──
  if (!selectedJob) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-8">
        <Brain size={48} className="text-slate-700" />
        <h2 className="text-2xl font-bold text-white">No Interview Active</h2>
        <p className="text-slate-500">Go to the Job Feed and click "Start Interview" on any listing.</p>
        <button
          onClick={() => setActiveTab("jobs")}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
        >
          <ArrowLeft size={14} />
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ──────────────── LEFT SIDEBAR: Phase Tracker ──────────────── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 border-r border-white/[0.05] bg-slate-950/50 p-5 space-y-2 overflow-y-auto">
        {/* Job Info */}
        <div className="mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Interviewing for</p>
          <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
            {selectedJob.title || "Software Engineer"}
          </p>
          <p className="text-slate-500 text-xs mt-1">{selectedJob.company || "Company"}</p>
        </div>

        {/* Score HUD */}
        {answersGiven > 0 && (
          <div className="mb-2 p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center gap-3">
            <Target size={18} className="text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-white text-lg font-black leading-none">
                {(totalScore / answersGiven).toFixed(1)}
                <span className="text-slate-500 text-xs font-normal">/10</span>
              </p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Avg Score</p>
            </div>
          </div>
        )}

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1 mt-2">Interview Phases</p>

        {/* Phase list */}
        {PHASES.map((p, idx) => {
          const skip = p.id === "ai_ml_round" && !isAiRole;
          return (
            <PhaseItem
              key={p.id}
              phase={p}
              isActive={p.id === phase && !isComplete}
              isDone={idx < phaseIndex || isComplete}
              isSkipped={skip}
            />
          );
        })}
      </aside>

      {/* ──────────────── CENTER: Interview Panel ──────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-slate-950/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors text-[12px] font-semibold uppercase tracking-wider"
            >
              <ArrowLeft size={14} />
              Exit
            </button>
            <div className="w-px h-4 bg-white/10" />
            {/* Mobile phase info */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{PHASES.find(p => p.id === phase)?.icon}</span>
              <span className="text-[12px] font-bold text-indigo-300 uppercase tracking-wider">
                {PHASES.find(p => p.id === phase)?.label}
              </span>
            </div>
          </div>

          {/* Timer + Q count */}
          <div className="flex items-center gap-4">
            {answersGiven > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {answersGiven} answered
              </div>
            )}
            {!isComplete && (
              <div className={`flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                timer > 120 ? "text-amber-400 bg-amber-500/10" : "text-slate-500 bg-white/[0.03]"
              }`}>
                <Clock size={12} />
                {formatTimer(timer)}
              </div>
            )}
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            // Loading state
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center"
              >
                <Brain size={32} className="text-indigo-400" />
              </motion.div>
              <div className="text-center space-y-2">
                <p className="text-white font-semibold text-lg">Preparing Your Interview</p>
                <p className="text-slate-500 text-sm">Researching company context and generating questions...</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay }}
                    className="w-2 h-2 rounded-full bg-indigo-500"
                  />
                ))}
              </div>
            </div>

          ) : isComplete ? (
            // Final Report
            <FinalReport
              report={finalData?.final_report || ""}
              totalScore={totalScore}
              answersGiven={answersGiven}
              job={selectedJob}
              onRestart={handleBack}
            />

          ) : (
            // Active interview
            <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10 space-y-8">

              {/* Phase badge */}
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <span className="text-2xl">{PHASES.find(p => p.id === phase)?.icon}</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Current Phase</p>
                  <p className="text-indigo-300 font-bold text-sm">{PHASES.find(p => p.id === phase)?.label}</p>
                </div>
              </motion.div>

              {/* Interviewer avatar + Question */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Brain size={18} className="text-white" />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">AI Interviewer</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={question}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl rounded-tl-sm px-6 py-5"
                    >
                      <p className="text-white text-lg leading-relaxed font-medium">
                        <TypewriterText text={question} speed={15} />
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Evaluation feedback (slides in after answer) */}
              <AnimatePresence>
                {lastEval && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-4 items-start overflow-hidden"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                      <Sparkles size={16} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 bg-slate-900/60 border border-white/[0.06] rounded-2xl rounded-tl-sm px-5 py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Evaluator</p>
                        <ScorePill score={lastEval.score} />
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{lastEval.feedback}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Session expired error banner */}
              {sessionError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl px-5 py-4"
                >
                  <AlertCircle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <p className="text-amber-300 text-sm font-medium">{sessionError}</p>
                    <button
                      onClick={initSession}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold uppercase tracking-wider transition-all"
                    >
                      <Brain size={13} />
                      Restart Interview
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Spacer */}
              <div className="h-4" />
            </div>
          )}
        </div>

        {/* ── Answer Input Bar (fixed at bottom) ── */}
        {!loading && !isComplete && (
          <div className="flex-shrink-0 border-t border-white/[0.05] bg-slate-950/80 backdrop-blur-xl px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-end">
                {/* User avatar */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center mb-0.5">
                  <span className="text-sm font-bold text-slate-400">
                    {user?.full_name?.[0] || "Y"}
                  </span>
                </div>

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer... (Ctrl+Enter to submit)"
                    rows={3}
                    disabled={submitting}
                    className="w-full bg-slate-900/80 border border-white/[0.08] focus:border-indigo-500/40 rounded-2xl px-5 py-3.5 text-white text-[14px] leading-relaxed placeholder-slate-600 resize-none focus:outline-none transition-all disabled:opacity-40"
                  />
                  {/* Char count */}
                  <span className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-700">
                    {answer.length}
                  </span>
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim() || submitting}
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-indigo-600/30 mb-0.5"
                >
                  {submitting
                    ? <Loader2 size={18} className="text-white animate-spin" />
                    : <Send size={18} className="text-white" />
                  }
                </motion.button>
              </div>

              <p className="text-[10px] text-slate-700 mt-2 ml-12">
                {submitting ? "Evaluating your answer..." : "Ctrl+Enter to submit · Take your time, think before answering"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
