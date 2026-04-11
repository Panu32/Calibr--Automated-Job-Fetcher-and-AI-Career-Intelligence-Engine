/**
 * components/JobCard.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Single Job Listing Card
 *
 * Displays one job listing with:
 *   - Title, company, location
 *   - Colour-coded match score badge
 *   - Salary (if available)
 *   - Source API badge (Adzuna / JSearch)
 *   - Fetch date
 *   - "View Job" button → opens URL in new tab
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import {
  Building2,
  MapPin,
  IndianRupee,
  ExternalLink,
  Zap,
  Calendar,
} from "lucide-react";

/**
 * Return Tailwind classes for the match score badge based on score value.
 * >= 80 → green (strong match)
 * 50-79 → yellow (moderate match)
 * < 50  → gray (weak match)
 */
function getMatchBadgeStyle(score) {
  if (score >= 80) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (score >= 50) return "bg-amber-500/20  text-amber-300  border-amber-500/30";
  return               "bg-slate-500/20   text-slate-400  border-slate-500/30";
}

/**
 * Format the source API name for display.
 */
function formatSource(source) {
  const map = {
    adzuna : "Adzuna",
    jsearch: "JSearch",
    mock   : "Demo",
  };
  return map[source?.toLowerCase()] || source || "Unknown";
}

/**
 * @param {Object} job - A JobListing object from the store
 */
export default function JobCard({ job }) {
  const {
    title       = "Unknown Title",
    company     = "Unknown Company",
    location    = "Remote",
    salary,
    match_score = 0,
    date_fetched,
    url,
    description = "",
    source,
  } = job;

  // Round match_score to nearest integer for display
  const score        = Math.round(match_score);
  const badgeStyle   = getMatchBadgeStyle(score);
  const sourceLabel  = formatSource(source);

  // Truncate description for card preview
  const preview = description.length > 130
    ? description.slice(0, 130) + "…"
    : description;

  return (
    <article
      className={[
        "glass-card p-6 flex flex-col gap-5",
        "border border-white/5",
        "hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5",
        "transition-all duration-300 cursor-default",
        "animate-reveal",
      ].join(" ")}
    >
      {/* ── Top row: title + match score ────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Job title */}
          <h3 className="font-heading font-bold text-white text-lg leading-tight truncate tracking-tight">
            {title}
          </h3>

          {/* Company + location */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Building2 size={12} className="text-indigo-400/70" />
              {company}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <MapPin size={12} />
              {location}
            </span>
          </div>
        </div>

        {/* Match score badge */}
        <div
          className={[
            "flex-shrink-0 px-3 py-1 rounded-full",
            "text-[10px] font-black uppercase tracking-widest border",
            badgeStyle,
          ].join(" ")}
        >
          {score}% Match
        </div>
      </div>

      {/* ── Description preview ──────────────────────────────────────────── */}
      {preview && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-medium">
          {preview}
        </p>
      )}

      {/* ── Meta row: salary + source + date ─────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-3 mt-1">
        {/* Salary */}
        {salary && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
            <IndianRupee size={11} />
            {salary}
          </span>
        )}

        {/* Source badge */}
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
          <Zap size={10} className="text-indigo-400" />
          {sourceLabel}
        </span>

        {/* Date */}
        {date_fetched && (
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold ml-auto">
            <Calendar size={11} />
            {date_fetched === String(new Date().toISOString().slice(0, 10))
              ? "Today"
              : date_fetched}
          </span>
        )}
      </div>

      {/* ── Action: View job ──────────────────────────────────────────────── */}
      <a
        href={url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        id={`view-job-${job.job_id}`}
        className={[
          "btn-primary w-full",
          !url ? "opacity-30 pointer-events-none" : "",
        ].join(" ")}
        aria-label={`View job: ${title} at ${company}`}
      >
        View Job Details
        <ExternalLink size={14} className="opacity-70" />
      </a>
    </article>
  );
}
