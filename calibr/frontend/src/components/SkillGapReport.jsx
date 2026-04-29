import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  Activity,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import SkillTag from "./SkillTag";

/**
 * Circular Precision Meter - SVG Based for Maximum Quality
 */
/**
 * Simple Professional Match Indicator
 */
function MatchIndicator({ percentage }) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <span className="text-6xl font-semibold tracking-tight text-white leading-none">
          {pct}
        </span>
        <span className="text-xl font-semibold text-indigo-500 mb-1">%</span>
      </div>
      <div className="w-full max-w-xs h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className="h-full bg-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.3)]"
        />
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        Strategic Alignment Score
      </span>
    </div>
  );
}

/**
 * Skill Pillar Column
 */
function SkillColumn({ title, skills, type, icon: Icon, colorClass }) {
  return (
    <div 
      className="flex-1 min-w-[280px] space-y-6 glass-card p-8 group transition-all duration-300"
    >
      <div className="flex items-center gap-3 pb-5 border-b border-white/[0.04]">
        <div className={`w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center ${colorClass}`}>
           <Icon size={16} />
        </div>
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </h4>
          <p className="text-[9px] font-medium text-slate-600 uppercase tracking-wide mt-0.5">
            {skills.length} Detected Nodes
          </p>
        </div>
      </div>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, i) => (
            <SkillTag key={i} skill={skill} type={type} className="px-3 py-1.5 rounded-lg text-[11px] font-medium" />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center rounded-xl border border-dashed border-white/[0.04] bg-white/[0.01]">
           <p className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">No nodes detected</p>
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
    <div className="space-y-20">

      {/* ── Summary Header ── */}
      <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-24">
        <MatchIndicator percentage={overall_match_percentage} />

        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
               <Activity size={20} className="text-indigo-400" />
             </div>
             <h3 className="font-heading font-semibold text-white text-3xl tracking-tight">
               Assessment Report
             </h3>
          </div>
          <p className="text-lg text-slate-500 leading-relaxed font-normal max-w-3xl tracking-tight opacity-90">
            {summary || "Strategic synthesis complete. Comparative analysis reveals a distinct alignment pattern across primary technical domains."}
          </p>
        </div>
      </div>

      {/* ── Skill Pillars ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkillColumn
          title="Core Match"
          skills={has_skills}
          type="has"
          icon={CheckCircle2}
          colorClass="text-emerald-500"
        />
        <SkillColumn
          title="Gap Nodes"
          skills={missing_skills}
          type="missing"
          icon={XCircle}
          colorClass="text-rose-500"
        />
        <SkillColumn
          title="Growth Nodes"
          skills={weak_skills}
          type="weak"
          icon={AlertCircle}
          colorClass="text-amber-500"
        />
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pt-16 border-t border-white/[0.04] space-y-10"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-sm">
               <Lightbulb size={20} className="text-indigo-400" />
            </div>
            <h4 className="font-heading font-semibold text-white text-2xl tracking-tight">
              Strategic Recommendations
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, i) => (
              <div 
                key={i}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-indigo-500/20 transition-all duration-300 flex items-start gap-5"
              >
                 <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-400 text-xs font-semibold flex items-center justify-center border border-indigo-600/20 shrink-0">
                   {i + 1}
                 </div>
                 <p className="text-base text-slate-500 leading-relaxed font-normal mt-0.5 tracking-tight">
                   {rec}
                 </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}


