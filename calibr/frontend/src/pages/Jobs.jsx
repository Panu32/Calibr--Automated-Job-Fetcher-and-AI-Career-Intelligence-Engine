import React, { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  Loader2,
  Briefcase,
  SearchX,
  Sparkles,
  Command,
  TrendingUp,
} from "lucide-react";

import { useAppStore }     from "../store/useAppStore";
import { getJobs, refreshJobs } from "../services/api";
import JobCard             from "../components/JobCard";

/**
 * Filter chip definition - Semantic Categories
 */
const FILTER_CHIPS = [
  { label: "All Sectors",   value: "all"       },
  { label: "Remote Sync",   value: "remote"    },
  { label: "Bengaluru",     value: "bengaluru" },
  { label: "Mumbai",        value: "mumbai"    },
  { label: "Hyderabad",     value: "hyderabad" },
  { label: "Delhi NCR",     value: "delhi"     },
];

/**
 * Skeleton Card - Processing Simulation
 */
function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4 animate-pulse border-white/[0.03]">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1">
          <div className="h-5 w-48 bg-slate-800 rounded-lg" />
          <div className="h-3 w-32 bg-slate-900 rounded-md" />
        </div>
        <div className="h-7 w-20 bg-slate-800 rounded-full" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full bg-slate-900 rounded-md" />
        <div className="h-3 w-3/4 bg-slate-900 rounded-md" />
      </div>
      <div className="h-11 w-full bg-indigo-500/5 rounded-xl border border-white/[0.02]" />
    </div>
  );
}

/**
 * Jobs Feed - The Market Intelligence Deck
 */
export default function Jobs() {
  const { user, jobs, setJobs, setError, resumeData } = useAppStore();
  const userId = user?._id || user?.id;

  const [loading,         setLoading]         = useState(false);
  const [refreshLoading,  setRefreshLoading]  = useState(false);
  const [activeFilter,    setActiveFilter]    = useState("all");

  useEffect(() => {
    if (!resumeData) return;

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const data = await getJobs(userId);
        setJobs(data.jobs || []);
      } catch (err) {
        setError(err.message || "Failed to load opportunities.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [userId, resumeData]);

  const handleRefresh = async () => {
    setRefreshLoading(true);
    try {
      await refreshJobs(userId);
      const data = await getJobs(userId);
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message || "Scan failed.");
    } finally {
      setRefreshLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    if (activeFilter === "all") return jobs;
    return jobs.filter((job) => {
      const loc = (job.location || "").toLowerCase();
      const val = activeFilter.toLowerCase();
      return loc.includes(val);
    });
  }, [jobs, activeFilter]);

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="min-h-full p-8 md:p-16 max-w-7xl mx-auto space-y-12 relative">
      
      {/* ── Page Header ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-reveal">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-3 mb-6 bg-indigo-500/5 border border-indigo-500/10 rounded-full px-4 py-2 hover:bg-indigo-500/10 transition-all cursor-default group">
            <TrendingUp size={14} className="text-indigo-400" />
            <span className="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-400/80">Active Market Synchronisation</span>
          </div>

          <h1 className="font-heading text-5xl font-black text-white tracking-tighter leading-none text-balance">
            Semantic <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 text-glow">Opportunities.</span>
          </h1>
          
          <div className="flex items-center gap-4 mt-6">
            <p className="text-slate-500 font-bold text-sm tracking-tight">{todayLabel}</p>
            {!loading && (
              <>
                <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                <p className="text-indigo-400/80 text-sm font-black tracking-tight">
                  {filteredJobs.length} R-MATCHED ENTRIES
                </p>
              </>
            )}
          </div>
        </div>

        {/* Global Action Engine */}
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshLoading || loading || !resumeData}
            className="group relative px-10 py-4.5 rounded-[22px] overflow-hidden transition-all duration-500 disabled:opacity-30"
          >
            {/* Background Layer */}
            <div className="absolute inset-0 bg-indigo-600 opacity-10 group-hover:opacity-15 transition-opacity"></div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 group-hover:h-1 transition-all"></div>
            
            <div className="relative flex items-center gap-4">
              {refreshLoading ? (
                <Loader2 size={18} className="animate-spin text-indigo-400" />
              ) : (
                <RefreshCw size={18} className="text-indigo-400 group-hover:rotate-180 transition-transform duration-1000" />
              )}
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                {refreshLoading ? "Executing Neural Scan..." : "Initiate Global Search"}
              </span>
            </div>
          </button>
          
          {!loading && !refreshLoading && filteredJobs.length === 0 && (
            <div className="flex items-center gap-2 pr-2 opacity-50">
               <Command size={10} className="text-slate-600" />
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Awaiting Manual Override</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Neural Lock State (Conditional) ── */}
      {!resumeData && (
        <div className="glass-card p-20 text-center animate-reveal border-white/[0.03] space-y-8">
          <div className="relative inline-block">
             <div className="absolute -inset-6 bg-indigo-500/10 blur-2xl rounded-full"></div>
             <div className="w-24 h-24 rounded-[32px] bg-slate-900 border border-white/5 flex items-center justify-center relative z-10 mx-auto">
               <Briefcase size={40} className="text-slate-700" />
             </div>
          </div>
          <div className="space-y-3">
             <h3 className="font-black text-white text-3xl tracking-tighter">Neural Bridge Required</h3>
             <p className="text-slate-500 text-lg max-w-md mx-auto font-medium leading-relaxed">
               Sync your professional footprint in the Strategy Module to activate semantic market matching.
             </p>
          </div>
        </div>
      )}

      {/* ── Semantic Filter Deck ── */}
      {resumeData && (
        <nav className="animate-reveal stagger-1 flex gap-3 pb-4 overflow-x-auto no-scrollbar mask-fade-right">
          {FILTER_CHIPS.map((chip, i) => (
            <button
              key={chip.value}
              onClick={() => setActiveFilter(chip.value)}
              className={[
                "flex-shrink-0 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 border",
                activeFilter === chip.value
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_10px_20px_rgba(79,70,229,0.3)] scale-105"
                  : "bg-white/[0.02] border-white/[0.03] text-slate-500 hover:border-white/10 hover:text-slate-300",
              ].join(" ")}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {chip.label}
            </button>
          ))}
        </nav>
      )}

      {/* ── Process Grid (Loading States) ── */}
      {(loading || refreshLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-reveal stagger-2">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Opportunity Grid ── */}
      {!loading && !refreshLoading && filteredJobs.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredJobs.map((job, i) => (
            <div 
              key={job.job_id} 
              className="animate-reveal" 
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <JobCard job={job} />
            </div>
          ))}
        </section>
      )}

      {/* ── Search Exhausted / Empty State ── */}
      {!loading && !refreshLoading && resumeData && filteredJobs.length === 0 && (
        <div className="glass-card p-24 text-center animate-reveal border-white/[0.03] space-y-10">
          <div className="relative inline-block">
             <div className="absolute -inset-6 bg-rose-500/5 blur-2xl rounded-full"></div>
             <div className="w-20 h-20 rounded-[28px] bg-slate-900 border border-white/5 flex items-center justify-center relative z-10 mx-auto">
               <SearchX size={32} className="text-slate-700" />
             </div>
          </div>
          <div className="space-y-4">
             <h3 className="font-black text-white text-3xl tracking-tighter">
               {activeFilter !== "all" ? "Parameter Exhausted" : "Market Feed Depleted"}
             </h3>
             <p className="text-slate-500 text-lg max-w-sm mx-auto font-medium leading-relaxed">
               Current matched entries for these criteria are zero. Modify parameters or execute a fresh global sync.
             </p>
          </div>
          <button
            onClick={handleRefresh}
            className="btn-primary px-12 py-4 text-[10px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-4 group transition-all"
          >
            <Sparkles size={16} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
            Neural Refresh
          </button>
        </div>
      )}
    </div>
  );
}

