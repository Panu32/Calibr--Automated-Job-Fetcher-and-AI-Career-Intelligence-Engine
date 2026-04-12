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
  Sparkles,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

/**
 * Feature card definition - Neural Architecture
 */
const FEATURE_CARDS = [
  {
    tab        : "chat",
    title      : "AI Career Assistant",
    description: "Neural-guided mentorship cross-referencing your profile with real-time market fluctuations.",
    icon       : MessageSquare,
    color      : "indigo",
    badge      : "Active Intelligence",
  },
  {
    tab        : "resume",
    title      : "Skill Gap Analysis",
    description: "Precision mapping of technical trajectory. Reveal mission-critical gaps in seconds.",
    icon       : FileText,
    color      : "purple",
    badge      : "Strategy Engine",
  },
  {
    tab        : "jobs",
    title      : "Personalised Feed",
    description: "Daily opportunities ranked by semantic similarity to your professional footprint.",
    icon       : Briefcase,
    color      : "blue",
    badge      : "Neural Matching",
  },
];

/**
 * Stat Card - Executive Metrics
 */
function StatCard({ icon: Icon, label, value, colorClass }) {
  return (
    <div className="glass-card px-8 py-6 flex items-center gap-6 border-white/[0.03]">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${colorClass} bg-opacity-10 border border-current border-opacity-20`}>
        <Icon size={22} className="drop-shadow-sm" />
      </div>
      <div>
        <p className="text-4xl font-heading font-black tracking-tighter text-white leading-none">{value}</p>
        <p className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 mt-2">{label}</p>
      </div>
    </div>
  );
}

/**
 * Home Page - The Strategic Control Center
 */
export default function Home() {
  const { resumeData, jobs, setActiveTab } = useAppStore();

  const skillCount  = resumeData?.skill_count ?? 0;
  const jobCount    = jobs.length;
  const topScore    = jobs.length > 0
    ? Math.round(Math.max(...jobs.map((j) => j.match_score || 0)))
    : 0;

  return (
    <div className="min-h-full p-8 md:p-16 max-w-7xl mx-auto space-y-20 relative">

      {/* ── Hero Segment ── */}
      <section className="animate-reveal max-w-4xl">
        <div className="inline-flex items-center gap-3 mb-8 bg-indigo-500/5 border border-indigo-500/10 rounded-full px-4 py-2 hover:bg-indigo-500/10 transition-all cursor-default group">
          <Sparkles size={14} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-400/80">Calibr Neural Framework</span>
        </div>

        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1] tracking-tighter text-balance">
          Master your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 text-glow">
            Professional Trajectory.
          </span>
        </h1>
        <p className="mt-8 text-slate-400 text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-balance">
          The autonomous career intelligence engine that maps your unique footprint, reveals strategic gaps, and bridges the distance to your next major role.
        </p>
      </section>

      {/* ── Profile Synchronisation (Conditional Banner) ── */}
      {!resumeData && (
        <div className="animate-reveal stagger-1 flex flex-col md:flex-row items-center justify-between gap-8 p-10 rounded-[32px] bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700"></div>
          
          <div className="flex items-center gap-6 relative z-10 text-center md:text-left">
            <div className="w-16 h-16 rounded-[20px] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform shadow-xl">
              <Upload size={28} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-white text-xl tracking-tight leading-none mb-2">
                Initialise Profile Intelligence
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                Upload your professional footprint to activate the neural matching engine.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setActiveTab("resume")}
            className="btn-primary px-10 relative z-10 w-full md:w-auto"
          >
            Start Strategy
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ── Intelligence Metrics (Conditional Row) ── */}
      {resumeData && (
        <div className="animate-reveal stagger-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard
            icon={Target}
            label="Verified Competencies"
            value={skillCount}
            colorClass="text-indigo-400"
          />
          <StatCard
            icon={Briefcase}
            label="Ranked Opportunities"
            value={jobCount}
            colorClass="text-blue-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Semantic Match Power"
            value={`${topScore}%`}
            colorClass="text-purple-400"
          />
        </div>
      )}

      {/* ── Intelligence Modules ── */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-slate-700">
            STRATEGIC MODULES
          </h3>
          <div className="h-px flex-1 bg-white/[0.03]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURE_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <button
                key={card.tab}
                onClick={() => setActiveTab(card.tab)}
                className="glass-card p-10 text-left group relative flex flex-col h-full animate-reveal"
                style={{ animationDelay: `${(i + 2) * 100}ms` }}
              >
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight size={16} className="text-indigo-400 -rotate-45" />
                </div>

                <div className={`w-14 h-14 rounded-2xl bg-indigo-500 bg-opacity-10 flex items-center justify-center mb-8 border border-white/5 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <Icon size={24} className="text-white drop-shadow-md" />
                </div>

                <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-[0.3em] mb-3">
                  {card.badge}
                </span>

                <h2 className="font-heading font-black text-white text-2xl mb-4 leading-tight tracking-tight">
                  {card.title}
                </h2>

                <p className="text-sm text-slate-500 leading-relaxed font-medium mb-10 flex-1">
                  {card.description}
                </p>

                <div className="pt-6 border-t border-white/[0.03] flex items-center justify-between group-hover:border-indigo-500/20 transition-all">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 group-hover:text-indigo-400 transition-colors">Launch Implementation</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-indigo-400 transition-all shadow-[0_0_8px_transparent] group-hover:shadow-indigo-400/50"></div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Architectural Footer ── */}
      <footer className="pt-10 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity duration-700">
        <p className="text-[9px] uppercase tracking-[0.4em] font-black text-slate-600">
          Executive Environment: G-1.5 · E-004 · FAISS Vector Space
        </p>
        <div className="flex gap-8">
           <span className="text-[9px] font-black text-slate-700 tracking-widest uppercase">Encryption: AES-256</span>
           <span className="text-[9px] font-black text-slate-700 tracking-widest uppercase">Status: Live Sync</span>
        </div>
      </footer>
    </div>
  );
}

