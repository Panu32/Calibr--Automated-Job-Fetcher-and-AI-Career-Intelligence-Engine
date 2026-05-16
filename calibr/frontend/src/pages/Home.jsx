import React from "react";
import {
  MessageSquare,
  FileText,
  Briefcase,
  ArrowRight,
  Upload,
  Target,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";

/**
 * Feature card definition
 */
const FEATURE_CARDS = [
  {
    tab        : "chat",
    title      : "AI Career Assistant",
    description: "Personalized mentorship that connects your professional background with current market trends.",
    icon       : MessageSquare,
    badge      : "Smart Assistant",
    color      : "indigo"
  },
  {
    tab        : "jobs",
    title      : "Personalized Feed",
    description: "Highly relevant opportunities matched to your unique professional profile and objectives.",
    icon       : Briefcase,
    badge      : "Matching",
    color      : "emerald"
  },
];

/**
 * Stat Card - Executive Metrics
 */
function StatCard({ icon: Icon, label, value, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-6 flex items-center gap-5 group"
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5 group-hover:border-indigo-500/20 transition-all duration-300">
        <Icon size={16} className="text-slate-400 group-hover:text-indigo-400" />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white leading-none mb-1">{value}</p>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{label}</p>
      </div>
    </motion.div>
  );
}

/**
 * Home Page - The Strategic Command Center
 */
export default function Home() {
  const { resumeData, jobs, setActiveTab } = useAppStore();

  const jobCount    = jobs.length;
  const topScore    = jobs.length > 0
    ? Math.round(Math.max(...jobs.map((j) => j.match_score || 0)))
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-full px-8 md:px-12 lg:px-16 py-10 md:py-16 space-y-20 relative noise-bg"
    >

      {/* ── Executive Header ── */}
      <section className="max-w-6xl relative">
        <motion.div 
          variants={itemVariants}
          className="inline-flex items-center gap-2 mb-6 bg-white/[0.03] border border-white/5 rounded-full px-3 py-1 cursor-default"
        >
          <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400">Intelligence Active</span>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="font-heading text-5xl md:text-7xl font-semibold text-white leading-[1.1] tracking-tight mb-8"
        >
          Executive Career <br />
          <span className="text-indigo-500">Intelligence.</span>
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="text-slate-400 text-lg md:text-xl max-w-2xl font-normal leading-relaxed tracking-tight opacity-80"
        >
          Map your professional footprint, identify strategic growth clusters, and surface high-impact opportunities with systemized precision.
        </motion.p>
      </section>

      {/* ── Profile Initialization ── */}
      {!resumeData && (
        <motion.div 
          variants={itemVariants}
          className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
              <Upload size={24} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-xl tracking-tight mb-1">
                Synchronize Profile
              </h3>
              <p className="text-sm text-slate-500 font-medium tracking-tight">
                Upload your professional summary to initialize the intelligence engine.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setActiveTab("resume")}
            className="btn-primary px-8 py-3 text-[13px] relative z-10 w-full md:w-auto"
          >
            Get Started
            <ArrowRight size={16} />
          </button>
        </motion.div>
      )}

      {/* ── Core Metrics ── */}
      {resumeData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            icon={Briefcase}
            label="Market Match"
            value={jobCount}
            delay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Strategic Fit"
            value={`${topScore}%`}
            delay={0.2}
          />
        </div>
      )}

      {/* ── Strategic Modules ── */}
      <section className="space-y-10">
        <motion.div 
          variants={itemVariants}
          className="flex items-center gap-4"
        >
          <h3 className="text-[10px] uppercase tracking-widest font-semibold text-slate-600">
            SYSTEM MODULES
          </h3>
          <div className="h-px flex-1 bg-white/[0.05]"></div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURE_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.button
                variants={itemVariants}
                key={card.tab}
                onClick={() => setActiveTab(card.tab)}
                className="glass-card p-8 text-left group relative flex flex-col h-full overflow-hidden"
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center mb-6 border border-white/5 transition-all duration-300 group-hover:border-indigo-500/30">
                  <Icon size={16} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </div>

                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2 group-hover:text-indigo-400/60 transition-colors">
                  {card.badge}
                </span>

                <h2 className="font-heading font-semibold text-white text-xl mb-3 tracking-tight">
                  {card.title}
                </h2>

                <p className="text-[13.5px] text-slate-500 leading-relaxed font-medium mb-8 flex-1 tracking-tight">
                  {card.description}
                </p>

                <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between group-hover:border-indigo-500/10 transition-all">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover:text-indigo-400 transition-colors">Initialize</span>
                  <ArrowRight size={14} className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── System Footer ── */}
      <motion.footer 
        variants={itemVariants}
        className="pt-10 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between gap-6 opacity-40"
      >
        <p className="text-[9px] uppercase tracking-widest font-semibold text-slate-600">
          Corporate Intelligence Platform • v1.2.0
        </p>
        <div className="flex gap-8">
           <span className="text-[9px] font-semibold text-slate-600 tracking-wider uppercase">Secure Core</span>
           <span className="text-[9px] font-semibold text-slate-600 tracking-wider uppercase">Neural Audit Logs</span>
        </div>
      </motion.footer>
    </motion.div>
  );
}


