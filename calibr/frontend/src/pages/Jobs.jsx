/**
 * pages/Jobs.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Jobs Feed Page
 *
 * On mount: fetches today's ranked job listings from API.
 * Top bar: date, job count, refresh button.
 * Filter chips: location and type filters (local state).
 * Job grid: skeleton cards while loading, JobCard per result.
 * Empty state: message + refresh CTA if no jobs found.
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  Loader2,
  Briefcase,
  SearchX,
} from "lucide-react";

import { useAppStore }     from "../store/useAppStore";
import { getJobs, refreshJobs } from "../services/api";
import JobCard             from "../components/JobCard";

// ── Filter chip options ────────────────────────────────────────────────────
// "all" means no filter. Others are location/type substrings to match against.
const FILTER_CHIPS = [
  { label: "All",         value: "all"       },
  { label: "Remote",      value: "remote"    },
  { label: "Bengaluru",   value: "bengaluru" },
  { label: "Mumbai",      value: "mumbai"    },
  { label: "Hyderabad",   value: "hyderabad" },
  { label: "Delhi",       value: "delhi"     },
  { label: "Startup",     value: "startup"   },
];

// ── Skeleton card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-slate-700 rounded" />
          <div className="h-3 w-28 bg-slate-800 rounded" />
        </div>
        <div className="h-6 w-16 bg-slate-700 rounded-full" />
      </div>
      <div className="h-3 w-full bg-slate-800 rounded" />
      <div className="h-3 w-3/4 bg-slate-800 rounded" />
      <div className="h-8 w-full bg-slate-800 rounded-lg" />
    </div>
  );
}

export default function Jobs() {
  const { user, jobs, setJobs, setError, resumeData } = useAppStore();
  const userId = user?._id || user?.id;

  const [loading,         setLoading]         = useState(false);   // initial fetch
  const [refreshLoading,  setRefreshLoading]  = useState(false);   // manual refresh
  const [activeFilter,    setActiveFilter]    = useState("all");   // selected chip

  // ── Fetch jobs on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!resumeData) return;   // don't fetch if no resume yet

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const data = await getJobs(userId);    // GET /jobs/{userId}
        setJobs(data.jobs || []);
      } catch (err) {
        setError(err.message || "Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [userId, resumeData]);

  // ── Manual refresh ───────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshLoading(true);
    try {
      await refreshJobs(userId);           // POST /jobs/refresh/{userId}
      const data = await getJobs(userId);  // then reload the feed
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message || "Refresh failed.");
    } finally {
      setRefreshLoading(false);
    }
  };

  // ── Client-side filter ───────────────────────────────────────────────────
  // Filters jobs array by checking if the activeFilter value appears in
  // the job's location field (case-insensitive substring match).
  const filteredJobs = useMemo(() => {
    if (activeFilter === "all") return jobs;
    return jobs.filter((job) => {
      const loc = (job.location || "").toLowerCase();
      const src = (job.source  || "").toLowerCase();
      const val = activeFilter.toLowerCase();
      return loc.includes(val) || src.includes(val);
    });
  }, [jobs, activeFilter]);

  // ── Formatted date ───────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <div className="min-h-full p-8 md:p-12 max-w-6xl mx-auto space-y-10">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-reveal">
        <div>
          <div className="inline-flex items-center gap-2 mb-4 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-emerald-400">Live Global Feed</span>
          </div>
          <h1 className="font-heading text-4xl font-black text-white tracking-tighter leading-none">
            Strategic <span className="text-indigo-400">Opportunities.</span>
          </h1>
          <p className="text-gray-500 text-lg mt-3 font-medium">
            {todayLabel}
            {!loading && (
              <span className="text-white ml-2">
                · {filteredJobs.length} Ranked matches detected
              </span>
            )}
          </p>
        </div>

        {/* Refresh button */}
        <button
          id="refresh-jobs-btn"
          onClick={handleRefresh}
          disabled={refreshLoading || loading || !resumeData}
          className="px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-gray-400 disabled:opacity-20 transition-all flex items-center gap-3"
          aria-label="Refresh job listings"
        >
          {refreshLoading ? (
            <Loader2 size={14} className="animate-spin text-indigo-400" />
          ) : (
            <RefreshCw size={14} />
          )}
          Re-Scan Network
        </button>
      </div>

      {/* ── No resume banner ─────────────────────────────────────────────── */}
      {!resumeData && (
        <div className="glass-card p-12 text-center animate-reveal stagger-1 bg-white/[0.02]">
          <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6">
            <Briefcase size={40} className="text-gray-600" />
          </div>
          <p className="font-black text-white text-2xl tracking-tight mb-2">Neural Link Required</p>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Sync your resume to activate the semantic matching engine.
          </p>
        </div>
      )}

      {/* ── Filter chips (horizontal scroll) ─────────────────────────────── */}
      {resumeData && (
        <div
          className="flex gap-2.5 pb-2 overflow-x-auto no-scrollbar animate-reveal stagger-1"
          role="group"
          aria-label="Job filters"
        >
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              id={`filter-${chip.value}`}
              onClick={() => setActiveFilter(chip.value)}
              className={[
                "flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                activeFilter === chip.value
                  ? "bg-gradient-to-br from-purple-600 to-indigo-600 border-indigo-500 text-white shadow-lg shadow-purple-500/20 scale-105"
                  : "bg-white/[0.03] border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300",
              ].join(" ")}
              aria-pressed={activeFilter === chip.value}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Skeleton loading ──────────────────────────────────────────────── */}
      {(loading || refreshLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal stagger-2">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Job grid ──────────────────────────────────────────────────────── */}
      {!loading && !refreshLoading && filteredJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job, i) => (
            <div 
              key={job.job_id} 
              className="animate-reveal" 
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <JobCard job={job} />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !refreshLoading && resumeData && filteredJobs.length === 0 && (
        <div className="glass-card p-16 text-center animate-reveal bg-white/[0.02]">
          <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-8">
            <SearchX size={32} className="text-gray-600" />
          </div>
          <p className="font-black text-white text-2xl tracking-tight mb-2">
            {activeFilter !== "all"
              ? `No ${activeFilter} matches`
              : "Feed Depleted"}
          </p>
          <p className="text-gray-500 text-lg mb-8 max-w-sm mx-auto">
            Try expanding your location filters or run a fresh scan to find new opportunities.
          </p>
          <button
            onClick={handleRefresh}
            className="btn-primary px-10 py-3.5 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-3 transition-all"
          >
            <RefreshCw size={14} />
            Execute New Scan
          </button>
        </div>
      )}
    </div>
  );
}
