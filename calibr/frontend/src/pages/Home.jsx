/**
 * pages/Home.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Home / Dashboard Page
 *
 * Shows:
 *   - Welcome greeting + tagline
 *   - 3 feature cards (AI Chat / Resume / Jobs)
 *   - "Get started" banner if no resume uploaded
 *   - Stats row (skills, jobs, top match) if resume exists
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import {
  MessageSquare,
  FileText,
  Briefcase,
  Zap,
  ArrowRight,
  Upload,
  Target,
  TrendingUp,
  Star,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

// ── Feature card definition ────────────────────────────────────────────────
const FEATURE_CARDS = [
  {
    tab        : "chat",
    title      : "AI Career Assistant",
    description: "Personalised guidance powered by Gemini AI. Ask anything about your career path and skill gaps.",
    icon       : MessageSquare,
    gradient   : "from-purple-600 to-indigo-600",
    glow       : "hover:shadow-purple-500/20",
    badge      : "AI Core",
  },
  {
    tab        : "resume",
    title      : "Skill Gap Analysis",
    description: "Visualise your technical gaps for any job role and get a custom learning roadmap instantly.",
    icon       : FileText,
    gradient   : "from-cyan-500 to-blue-600",
    glow       : "hover:shadow-cyan-500/20",
    badge      : "Smart Engine",
  },
  {
    tab        : "jobs",
    title      : "Personalised Feed",
    description: "Daily job listings fetched and ranked by semantic similarity to your unique profile.",
    icon       : Briefcase,
    gradient   : "from-pink-500 to-rose-600",
    glow       : "hover:shadow-pink-500/20",
    badge      : "Daily Refresh",
  },
];

// ── Stat card sub-component ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, colour }) {
  return (
    <div className="glass-card px-6 py-5 flex items-center gap-5 border-white/5 bg-white/[0.02]">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${colour}`}>
        <Icon size={20} className="text-white drop-shadow-md" />
      </div>
      <div>
        <p className="text-3xl font-heading font-black tracking-tight text-white">{value}</p>
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { resumeData, jobs, setActiveTab } = useAppStore();

  // Compute stats from store data
  const skillCount  = resumeData?.skill_count ?? 0;
  const jobCount    = jobs.length;
  const topScore    = jobs.length > 0
    ? Math.round(Math.max(...jobs.map((j) => j.match_score || 0)))
    : 0;

  return (
    <div className="min-h-full p-8 md:p-12 max-w-6xl mx-auto">

      {/* ── Hero greeting ──────────────────────────────────────────────── */}
      <div className="mb-12 animate-reveal">
        {/* Logo mark */}
        <div className="inline-flex items-center gap-2.5 mb-6 bg-white/5 border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition-colors cursor-default">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Zap size={11} className="text-white fill-white" />
          </div>
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-400">Calibr Intelligence</span>
        </div>

        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tighter">
          Elevate your{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Career Strategy.
          </span>
        </h1>
        <p className="mt-4 text-gray-400 text-lg md:text-xl max-w-2xl font-medium leading-relaxed">
          The autonomous AI engine that maps your skills, fetches daily matches, and coaches you to your next major role.
        </p>
      </div>

      {/* ── Get-started banner (shown only when no resume uploaded) ───── */}
      {!resumeData && (
        <div className="animate-reveal stagger-1 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-transparent border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-500"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
              <Upload size={24} className="text-indigo-400" />
            </div>
            <div>
              <p className="font-black text-white text-lg tracking-tight">
                Initialise your Profile
              </p>
              <p className="text-sm text-gray-400 font-medium">
                Upload your resume to unlock personalised AI intelligence.
              </p>
            </div>
          </div>
          <button
            id="home-upload-resume-btn"
            onClick={() => setActiveTab("resume")}
            className="btn-primary px-8 relative z-10"
          >
            Start Analysis
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ── Stats row (shown only when resume exists) ──────────────────── */}
      {resumeData && (
        <div className="animate-reveal stagger-1 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard
            icon={Target}
            label="Verified Skills"
            value={skillCount}
            colour="bg-purple-600"
          />
          <StatCard
            icon={Briefcase}
            label="Live Opportunities"
            value={jobCount}
            colour="bg-blue-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Match Authority"
            value={`${topScore}%`}
            colour="bg-pink-600"
          />
        </div>
      )}

      {/* ── Feature cards ──────────────────────────────────────────────── */}
      <h3 className="text-xs uppercase tracking-[0.3em] font-black text-gray-600 mb-6 animate-reveal stagger-2">
        Core Intelligence Modules
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-reveal stagger-3">
        {FEATURE_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={card.tab}
              id={`home-nav-${card.tab}`}
              onClick={() => setActiveTab(card.tab)}
              className={[
                "glass-card p-8 text-left group relative overflow-hidden",
                "hover:-translate-y-2 hover:shadow-2xl transition-all duration-500",
                card.glow,
              ].join(" ")}
            >
               {/* Decorative background glow */}
               <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`}></div>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <Icon size={24} className="text-white drop-shadow-md" />
              </div>

              {/* Badge */}
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                {card.badge}
              </span>

              {/* Title */}
              <h2 className="font-heading font-black text-white text-xl mt-3 mb-3 leading-tight tracking-tight">
                {card.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                {card.description}
              </p>

              {/* CTA */}
              <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 group-hover:text-white transition-all duration-300">
                Launch Module <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Footer note ────────────────────────────────────────────────── */}
      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col items-center animate-reveal stagger-3">
        <p className="text-[10px] uppercase tracking-[0.4em] font-black text-gray-700">
          Neural Architecture: Gemini 1.5 Flash · text-embedding-004
        </p>
      </div>
    </div>
  );
}
