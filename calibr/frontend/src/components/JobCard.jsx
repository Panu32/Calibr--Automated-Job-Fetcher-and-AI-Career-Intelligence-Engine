import React from "react";
import {
  Building2,
  MapPin,
  IndianRupee,
  ExternalLink,
  Zap,
  Calendar,
  Layers,
} from "lucide-react";

/**
 * Precision Match Indicator styling
 */
function getMatchBadgeStyle(score) {
  if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 70) return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  if (score >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-slate-500 bg-slate-500/10 border-slate-500/20";
}

/**
 * Job Listing Entry - Semantic Detail View
 */
export default function JobCard({ job }) {
  const {
    title       = "Executive Position",
    company     = "Confidential Organisation",
    location    = "Distributed / Remote",
    salary,
    match_score = 0,
    date_fetched,
    url,
    description = "",
    source,
  } = job;

  const score        = Math.round(match_score);
  const badgeStyle   = getMatchBadgeStyle(score);
  
  const preview = description.length > 120
    ? description.slice(0, 120) + "..."
    : description;

  return (
    <article
      className={[
        "glass-card p-7 flex flex-col h-full",
        "border border-white/[0.03]",
        "hover:border-indigo-500/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
        "transition-all duration-700 group cursor-default",
      ].join(" ")}
    >
      {/* ── Match Precision Header ── */}
      <div className="flex justify-between items-start mb-6">
        <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] shadow-inner ${badgeStyle}`}>
           {score}% SEMANTIC MATCH
        </div>
        <div className="flex gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
           <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
           <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        </div>
      </div>

      {/* ── Identity & Title ── */}
      <div className="space-y-3 mb-6">
        <h3 className="font-heading font-black text-white text-xl leading-tight tracking-tighter group-hover:text-indigo-400 transition-colors duration-500">
          {title}
        </h3>
        
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-tight">
            <Building2 size={13} className="text-indigo-500 opacity-60" />
            {company}
          </span>
          <span className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-tight">
            <MapPin size={13} />
            {location}
          </span>
        </div>
      </div>

      {/* ── Intelligence Preview ── */}
      <div className="relative mb-6">
         <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">
           {preview || "No technical description provided in source metadata."}
         </p>
      </div>

      {/* ── Technical Metadata ── */}
      <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/[0.03]">
        <div className="flex gap-3">
          {salary && (
            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
              <IndianRupee size={10} />
              {salary}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/[0.02] px-2.5 py-1.5 rounded-lg border border-white/[0.03]">
            <Layers size={10} className="text-indigo-500/60" />
            {source === "adzuna" ? "ADZUNA" : "JSEARCH"}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
          <Calendar size={11} />
          {date_fetched?.split('T')[0] || "Live"}
        </div>
      </div>

      {/* ── Action: Deployment ── */}
      <a
        href={url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={[
          "mt-6 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl",
          "text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500",
          url 
            ? "bg-white/[0.02] text-slate-400 border border-white/[0.05] hover:bg-white hover:text-black hover:scale-[1.02] hover:shadow-xl" 
            : "opacity-20 cursor-not-allowed bg-slate-900",
        ].join(" ")}
      >
        Deploy Application
        <ExternalLink size={14} />
      </a>
    </article>
  );
}

