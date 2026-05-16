import React, { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  Loader2,
  Briefcase,
  SearchX,
  Sparkles,
  Command,
  TrendingUp,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="glass-panel p-8 space-y-6 animate-pulse border-white/[0.05]">
      <div className="flex justify-between items-start">
        <div className="space-y-4 flex-1">
          <div className="h-6 w-48 bg-slate-800/50 rounded-xl" />
          <div className="h-4 w-32 bg-slate-900/50 rounded-lg" />
        </div>
        <div className="h-8 w-24 bg-slate-800/50 rounded-lg" />
      </div>
      <div className="space-y-3 pt-4">
        <div className="h-4 w-full bg-slate-900/50 rounded-lg" />
        <div className="h-4 w-3/4 bg-slate-900/50 rounded-lg" />
      </div>
      <div className="h-14 w-full bg-indigo-500/5 rounded-2xl border border-white/[0.03]" />
    </div>
  );
}

/**
 * Jobs Feed - The Market Intelligence Deck
 */
export default function Jobs() {
  const { user, jobs, setJobs, setError, resumeData, setSelectedJob, setActiveTab } = useAppStore();
  const userId = user?._id || user?.id;

  const [loading,         setLoading]         = useState(false);
  const [refreshLoading,  setRefreshLoading]  = useState(false);
  const [activeFilter,    setActiveFilter]    = useState("all");

  const handleStartInterview = (job) => {
    setSelectedJob(job);
    setActiveTab("interview");
  };

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
    const baseJobs = activeFilter === "all" 
      ? jobs 
      : jobs.filter((job) => {
          const loc = (job.location || "").toLowerCase();
          const val = activeFilter.toLowerCase();
          return loc.includes(val);
        });

    // Explicitly sort by match_score descending (Highest % first, top-left)
    return [...baseJobs].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [jobs, activeFilter]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="min-h-full px-8 md:px-12 lg:px-16 py-12 md:py-20 space-y-16 relative">
      
      {/* ── Page Header ── */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-12"
      >
        <div className="max-w-3xl">
          <motion.div 
            whileHover={{ x: 5 }}
            className="inline-flex items-center gap-3 mb-8 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-5 py-2.5 cursor-default group"
          >
            <TrendingUp size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] uppercase font-black tracking-[0.3em] text-indigo-400">Market Intelligence Deck</span>
          </motion.div>

          <h1 className="font-heading text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] text-balance">
            Strategic <span className="text-glow text-indigo-400">Ventures.</span>
          </h1>
          
          <div className="flex items-center gap-6 mt-10">
            <p className="text-slate-500 font-bold text-lg tracking-tight">{todayLabel}</p>
            {!loading && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                <p className="text-indigo-400 font-black tracking-[0.1em] text-sm">
                  {filteredJobs.length} IDENTIFIED TARGETS
                </p>
              </>
            )}
          </div>
        </div>

        {/* Global Action Engine */}
        <div className="flex flex-col items-end gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={refreshLoading || loading || !resumeData}
            className="group relative px-12 py-5 rounded-[28px] overflow-hidden transition-all duration-500 disabled:opacity-30 bg-indigo-600 shadow-2xl shadow-indigo-600/20"
          >
            <div className="relative flex items-center gap-4">
              {refreshLoading ? (
                <Loader2 size={22} className="animate-spin text-white" />
              ) : (
                <RefreshCw size={22} className="text-white group-hover:rotate-180 transition-transform duration-1000" />
              )}
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">
                {refreshLoading ? "Executing Neural Scan..." : "Initiate Global Sync"}
              </span>
            </div>
          </motion.button>
          
          <AnimatePresence>
            {!loading && !refreshLoading && filteredJobs.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="flex items-center gap-2 pr-4"
              >
                 <Command size={12} className="text-slate-600" />
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Manual Override Recommended</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ── Neural Lock State (Conditional) ── */}
      {!resumeData && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-24 text-center border-white/[0.05] space-y-10"
        >
          <div className="relative inline-block">
             <div className="absolute -inset-10 bg-indigo-500/15 blur-3xl rounded-full"></div>
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity }}
               className="w-28 h-28 rounded-[40px] bg-slate-900 border border-white/[0.08] flex items-center justify-center relative z-10 mx-auto shadow-2xl shadow-black"
             >
               <Briefcase size={48} className="text-slate-700" />
             </motion.div>
          </div>
          <div className="space-y-4">
             <h3 className="font-black text-white text-4xl tracking-tighter">Synchronise Footprint</h3>
             <p className="text-slate-500 text-xl max-w-lg mx-auto font-medium leading-relaxed tracking-tight">
               Integrate your professional profile to activate our neural market mapping engine.
             </p>
          </div>
        </motion.div>
      )}

      {/* ── Semantic Filter Deck ── */}
      {resumeData && (
        <motion.nav 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 pb-6 overflow-x-auto no-scrollbar mask-fade-right"
        >
          {FILTER_CHIPS.map((chip, i) => (
            <motion.button
              key={chip.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(chip.value)}
              className={`
                flex-shrink-0 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 border
                ${activeFilter === chip.value
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-600/40"
                  : "bg-white/[0.03] border-white/[0.08] text-slate-500 hover:border-white/20 hover:text-slate-300"}
              `}
            >
              {chip.label}
            </motion.button>
          ))}
        </motion.nav>
      )}

      {/* ── Process Grid (Loading States) ── */}
      <AnimatePresence mode="wait">
        {(loading || refreshLoading) ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </motion.div>
        ) : filteredJobs.length > 0 ? (
          <motion.section 
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {filteredJobs.map((job, i) => (
              <motion.div 
                key={job.job_id || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <JobCard job={job} onStartInterview={handleStartInterview} />
              </motion.div>
            ))}
          </motion.section>
        ) : resumeData ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-28 text-center border-white/[0.05] space-y-12"
          >
            <div className="relative inline-block">
               <div className="absolute -inset-10 bg-rose-500/5 blur-3xl rounded-full"></div>
               <motion.div 
                 animate={{ rotate: [0, 5, -5, 0] }}
                 transition={{ duration: 6, repeat: Infinity }}
                 className="w-24 h-24 rounded-[32px] bg-slate-900 border border-white/[0.08] flex items-center justify-center relative z-10 mx-auto"
               >
                 <SearchX size={40} className="text-slate-700" />
               </motion.div>
            </div>
            <div className="space-y-4">
               <h3 className="font-black text-white text-4xl tracking-tighter">
                 {activeFilter !== "all" ? "Parameter Exhausted" : "Market Vacuum Detected"}
               </h3>
               <p className="text-slate-500 text-xl max-w-md mx-auto font-medium leading-relaxed tracking-tight">
                 We've reached the edge of current data. Refine parameters or execute a fresh global sync.
               </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="btn-primary px-16 py-5 text-[11px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-4 group transition-all"
            >
              <Sparkles size={20} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
              Global Refresh
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

