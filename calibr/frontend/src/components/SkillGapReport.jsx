import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Activity,
} from "lucide-react";
import SkillTag from "./SkillTag";

/**
 * Circular Precision Meter - The Match Engine
 */
function CircularScore({ percentage }) {
  const pct    = Math.min(100, Math.max(0, Math.round(percentage)));
  const degree = Math.round((pct / 100) * 360);

  const arcColor =
    pct >= 75 ? "#818cf8"   // indigo-400
    : pct >= 50 ? "#6366f1" // indigo-500
    : "#4f46e5";             // indigo-600

  return (
    <div className="flex flex-col items-center gap-4 group">
      <div
        className="relative w-40 h-40 rounded-full flex items-center justify-center shadow-[0_0_50px_-10px_rgba(79,70,229,0.3)] transition-transform duration-700 hover:scale-[1.05]"
        style={{
          background: `conic-gradient(${arcColor} ${degree}deg, rgba(255,255,255,0.03) ${degree}deg)`,
        }}
      >
        {/* Inner core */}
        <div className="w-[85%] h-[85%] rounded-full bg-[#020617] flex flex-col items-center justify-center border border-white/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <span className="text-4xl font-black tracking-tighter text-white relative z-10 animate-reveal">
             {pct}<span className="text-indigo-400/50 text-xl">%</span>
           </span>
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mt-1 relative z-10">
             Match Index
           </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Skill Pillar Column
 */
function SkillColumn({ title, skills, type, icon: Icon, colorClass }) {
  return (
    <div className="flex-1 min-w-[280px] space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-white/[0.03]">
        <div className={`p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] ${colorClass}`}>
           <Icon size={14} />
        </div>
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
          {title}
        </h4>
        <span className="ml-auto text-[9px] font-black bg-slate-900 border border-white/[0.05] text-slate-500 px-2 py-0.5 rounded-md">
          {skills.length}
        </span>
      </div>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {skills.map((skill, i) => (
            <SkillTag key={i} skill={skill} type={type} className="hover:scale-105 transition-transform" />
          ))}
        </div>
      ) : (
        <div className="py-4 px-6 rounded-xl border border-dashed border-white/[0.03] bg-white/[0.01]">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">None detected</p>
        </div>
      )}
    </div>
  );
}

/**
 * SkillGapReport - The Executive Assessment Summary
 */
export default function SkillGapReport({ skillGapResult }) {
  if (!skillGapResult) return null;

  const {
    has_skills               = [],
    missing_skills           = [],
    weak_skills              = [],
    recommendations          = [],
    overall_match_percentage = 0,
    summary                  = "",
  } = skillGapResult;

  return (
    <div className="glass-card p-12 space-y-16 animate-reveal border-white/[0.03]">

      {/* ── Executive Precision Header ── */}
      <div className="flex flex-col lg:flex-row items-center gap-16">
        <CircularScore percentage={overall_match_percentage} />

        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center border border-indigo-500/10">
               <Activity size={18} className="text-indigo-400" />
             </div>
             <h3 className="font-heading font-black text-white text-2xl tracking-tighter">
               Neural Synthesis Summary
             </h3>
          </div>
          <p className="text-[15px] text-slate-400 leading-relaxed font-medium max-w-3xl">
            {summary || "Assessment complete. Comparative analysis indicates a strong alignment with core technical requirements. Proceed to gap mitigation."}
          </p>
        </div>
      </div>

      {/* ── Technical Pillars ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <SkillColumn
          title="Verified Capacities"
          skills={has_skills}
          type="has"
          icon={CheckCircle2}
          colorClass="text-emerald-400"
        />
        <SkillColumn
          title="Critical Gaps"
          skills={missing_skills}
          type="missing"
          icon={XCircle}
          colorClass="text-rose-400"
        />
        <SkillColumn
          title="Growth Nodes"
          skills={weak_skills}
          type="weak"
          icon={AlertCircle}
          colorClass="text-amber-400"
        />
      </div>

      {/* ── Strategic Recommendations ── */}
      {recommendations.length > 0 && (
        <div className="pt-12 border-t border-white/[0.03] space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-white/5">
               <Lightbulb size={20} className="text-indigo-400" />
            </div>
            <h4 className="font-heading font-black text-white text-xl tracking-tighter">
              Strategic Roadmap
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((rec, i) => (
              <div key={i} className="group relative p-6 rounded-2xl bg-[#050814] border border-white/[0.03] hover:border-indigo-500/20 transition-all duration-500">
                <div className="absolute top-4 right-6 text-[40px] font-black text-white/[0.02] group-hover:text-indigo-500/[0.05] transition-colors pointer-events-none">
                  0{i + 1}
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-lg bg-indigo-500/5 text-indigo-400 text-xs font-black flex items-center justify-center border border-indigo-500/10 flex-shrink-0">
                     {i + 1}
                   </div>
                   <p className="text-sm text-slate-400 leading-relaxed font-medium pr-4 mt-1">
                     {rec}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

