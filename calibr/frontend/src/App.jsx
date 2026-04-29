import React, { useEffect, useRef, useMemo } from "react";
import { AlertCircle, X, Zap, ChevronRight, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Global store ───────────────────────────────────────────────────────────
import { useAppStore } from "./store/useAppStore";

// ── Layout components ──────────────────────────────────────────────────────
import Sidebar from "./components/Sidebar";

// ── Page components ────────────────────────────────────────────────────────
import Home   from "./pages/Home";
import Chat   from "./pages/Chat";
import Resume from "./pages/Resume";
import Jobs   from "./pages/Jobs";
import Login  from "./pages/Login";
import Signup from "./pages/Signup";

// ── Page registry ──────────────────────────────────────────────────────────
const PAGES = {
  home  : Home,
  chat  : Chat,
  resume: Resume,
  jobs  : Jobs,
};

/**
 * App.jsx - Executive Intelligence Suite
 */
export default function App() {
  const { activeTab, error, clearError, token, user, fetchInitialData } = useAppStore();

  useEffect(() => {
    if (token && user) {
      fetchInitialData();
    }
  }, [token, user, fetchInitialData]);
  const [authMode, setAuthMode] = React.useState("login");

  // Determine active component
  const ActiveContent = PAGES[activeTab] || Home;

  // Determine page title/metadata for the header
  const pageMeta = useMemo(() => {
    switch(activeTab) {
      case 'home':   return { title: 'Dashboard', subtitle: 'Global Overview' };
      case 'chat':   return { title: 'AI Career Assistant', subtitle: 'Intelligence Engine' };
      case 'resume': return { title: 'Skill Gap Intelligence', subtitle: 'Profile Strategy' };
      case 'jobs':   return { title: 'Opportunities', subtitle: 'Semantic Matching' };
      default:       return { title: 'Calibr', subtitle: 'Intelligence' };
    }
  }, [activeTab]);

  // Auto-dismiss logic for global error toast
  const dismissTimer = useRef(null);
  useEffect(() => {
    if (!error) return;
    dismissTimer.current = setTimeout(clearError, 5000);
    return () => clearTimeout(dismissTimer.current);
  }, [error, clearError]);

  // Auth Guard
  if (!token) {
    return (
      <AnimatePresence mode="wait">
        <motion.div 
          key={authMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full"
        >
          {authMode === "login" 
            ? <Login onToggleMode={() => setAuthMode("signup")} /> 
            : <Signup onToggleMode={() => setAuthMode("login")} />}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-white overflow-hidden font-sans noise-bg">
      
      {/* ── Fixed Persistent Sidebar ── */}
      <Sidebar />

      {/* ── Main Application Canvas ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative overflow-hidden">
        
        {/* Animated Ambient Background (Restrained) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-indigo-600/20 blur-[160px] rounded-full"
          />
        </div>

        {/* ── Global Header (Integrated) ── */}
        <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 md:px-12 lg:px-16 border-b border-white/[0.04] bg-slate-950/40 backdrop-blur-xl z-40">
           <div className="flex items-center gap-3">
             <div className="flex flex-col">
               <span className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5 opacity-80">{pageMeta.subtitle}</span>
               <div className="flex items-center gap-2">
                 <h2 className="text-xl font-semibold text-white tracking-tight leading-none">{pageMeta.title}</h2>
               </div>
             </div>
           </div>

           <div className="flex items-center gap-6">
              {/* Status Indicator */}
              <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/5">
                <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">System Latency: 24ms</span>
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-4 pl-6 border-l border-white/[0.05]">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-semibold text-white leading-none uppercase tracking-widest mb-1">{user?.full_name || 'Executive'}</p>
                  <p className="text-[9px] font-medium text-slate-600 uppercase tracking-tighter">Enterprise Access</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400">
                  <User size={16} />
                </div>
              </div>
           </div>
        </header>

        {/* ── Dynamic Content Screen ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-30">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <ActiveContent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Global Precision Toast ── */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-[100] max-w-sm w-full"
          >
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 backdrop-blur-2xl shadow-2xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                 <AlertCircle size={16} className="text-rose-400" />
              </div>
              <div className="flex-1 pt-0.5">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Process Error</h4>
                <p className="text-[12px] font-normal text-slate-300 leading-snug">{error}</p>
              </div>
              <button 
                onClick={clearError}
                className="text-slate-600 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

