import React from "react";
import {
  Building2,
  MapPin,
  IndianRupee,
  ExternalLink,
  Calendar,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * Precision Match Indicator styling
 */
function getMatchBadgeStyle(score) {
  if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (score >= 70) return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  if (score >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-slate-500 bg-slate-500/10 border-white/5";
}

/**
 * Job Listing Entry - Semantic Detail View
 */
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
  
  const preview = description.length > 140
    ? description.slice(0, 140) + "..."
    : description;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 flex flex-col h-full group"
    >
      {/* ── Match Header ── */}
      <div className="flex justify-between items-start mb-6">
        <div className={`px-2 py-1 rounded-md border text-[9px] font-semibold uppercase tracking-wider ${badgeStyle}`}>
           {score}% Alignment
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-700 group-hover:text-indigo-400 transition-colors">
          <Layers size={14} />
        </div>
      </div>

      {/* ── Title & Company ── */}
      <div className="space-y-2 mb-6">
        <h3 className="font-heading font-semibold text-white text-lg leading-tight tracking-tight group-hover:text-indigo-400 transition-colors line-clamp-2">
          {title}
        </h3>
        
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
            <Building2 size={13} className="text-slate-700" />
            {company}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-slate-600 font-medium">
            <MapPin size={13} className="text-slate-800" />
            {location}
          </span>
        </div>
      </div>

      {/* ── Description Preview ── */}
      <div className="mb-8 flex-1">
         <p className="text-[13.5px] text-slate-500 leading-relaxed font-normal line-clamp-3 tracking-tight">
           {preview || "Technical details pending analysis from source metadata."}
         </p>
      </div>

      {/* ── Metadata Footer ── */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.03]">
        <div className="flex gap-2">
          {salary && (
            <div className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-500 uppercase tracking-wider bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10">
              <IndianRupee size={10} />
              {salary}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-600 uppercase tracking-wider bg-white/[0.02] px-2 py-1 rounded-md border border-white/5">
            {source?.toUpperCase() || "CORE"}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700 uppercase tracking-wider">
          <Calendar size={10} />
          {date_fetched?.split('T')[0] || "Active"}
        </div>
      </div>

      {/* ── Action ── */}
      <a
        href={url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={[
          "mt-6 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg",
          "text-[12px] font-semibold uppercase tracking-wider transition-all duration-200",
          url 
            ? "bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white hover:text-slate-950 hover:border-white shadow-sm"
            : "opacity-20 cursor-not-allowed bg-slate-900 text-slate-600",
        ].join(" ")}
      >
        <span>View Details</span>
        <ExternalLink size={13} />
      </a>
    </motion.article>
  );
}


