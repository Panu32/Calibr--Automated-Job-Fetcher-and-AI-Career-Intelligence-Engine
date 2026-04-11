/**
 * components/SkillGapReport.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Skill Gap Analysis Report
 *
 * Renders the full output of the /analysis/skill-gap API call:
 *   1. Circular match score meter (pure CSS, no SVG library needed)
 *   2. Summary text from Gemini
 *   3. Three skill columns: Has / Missing / Weak
 *   4. Numbered recommendations list
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import SkillTag from "./SkillTag";

// ── Circular progress meter (pure CSS conic-gradient) ─────────────────────
function CircularScore({ percentage }) {
  // Clamp to 0–100
  const pct    = Math.min(100, Math.max(0, Math.round(percentage)));
  const degree = Math.round((pct / 100) * 360);

  // Colour of the arc: emerald > 70, amber 40-70, rose < 40
  const arcColor =
    pct >= 70 ? "#10b981"   // emerald
    : pct >= 40 ? "#f59e0b" // amber
    : "#f43f5e";             // rose

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular progress with subtle inner shadow */}
      <div
        className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: `conic-gradient(${arcColor} ${degree}deg, rgba(255,255,255,0.05) ${degree}deg)`,
        }}
      >
        {/* Inner circle (doughnut effect) */}
        <div className="w-[88%] h-[88%] rounded-full bg-slate-950 flex flex-col items-center justify-center border border-white/5">
          <span
            className="text-3xl font-heading font-black tracking-tighter"
            style={{ color: arcColor }}
          >
            {pct}%
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">MATCH</span>
        </div>
      </div>
    </div>
  );
}

// ── Skill column component ─────────────────────────────────────────────────
function SkillColumn({ title, skills, type, icon: Icon, colour }) {
  return (
    <div className="flex-1 min-w-0">
      {/* Column header */}
      <div className={`flex items-center gap-2 mb-4 pb-2.5 border-b ${colour.border}`}>
        <Icon size={13} className={colour.icon} />
        <h4 className={`text-[11px] font-black uppercase tracking-widest ${colour.title}`}>
          {title}
        </h4>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md ${colour.badge}`}>
          {skills.length}
        </span>
      </div>

      {/* Skill tags */}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, i) => (
            <SkillTag key={i} skill={skill} type={type} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-600 italic px-1">None identified</p>
      )}
    </div>
  );
}

/**
 * @param {Object} skillGapResult - The full response from /analysis/skill-gap
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
    <div className="glass-card p-8 space-y-10 animate-reveal">

      {/* ── Header: score + summary ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-center gap-10">
        {/* Circular score meter */}
        <CircularScore percentage={overall_match_percentage} />

        {/* Summary text */}
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <TrendingUp size={16} className="text-indigo-400" />
            </div>
            <h3 className="font-heading font-bold text-white text-lg tracking-tight">
              Analysis Summary
            </h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            {summary}
          </p>
        </div>
      </div>

      {/* ── Three skill columns ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-8">
        <SkillColumn
          title="Acquired Skills"
          skills={has_skills}
          type="has"
          icon={CheckCircle2}
          colour={{
            border: "border-emerald-500/10",
            icon  : "text-emerald-400",
            title : "text-emerald-400",
            badge : "bg-emerald-500/5 text-emerald-400/80",
          }}
        />
        <SkillColumn
          title="Gap Identifiers"
          skills={missing_skills}
          type="missing"
          icon={XCircle}
          colour={{
            border: "border-rose-500/10",
            icon  : "text-rose-400",
            title : "text-rose-400",
            badge : "bg-rose-500/5 text-rose-400/80",
          }}
        />
        <SkillColumn
          title="Growth Areas"
          skills={weak_skills}
          type="weak"
          icon={AlertCircle}
          colour={{
            border: "border-amber-500/10",
            icon  : "text-amber-400",
            title : "text-amber-400",
            badge : "bg-amber-500/5 text-amber-400/80",
          }}
        />
      </div>

      {/* ── Recommendations ───────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div className="pt-6 border-t border-white/[0.03]">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5">
               <Lightbulb size={16} className="text-indigo-400" />
            </div>
            <h4 className="font-heading font-bold text-white text-base tracking-tight">
              Actionable Recommendations
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.03] transition-colors">
                {/* Step number */}
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-300 text-[11px] font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
