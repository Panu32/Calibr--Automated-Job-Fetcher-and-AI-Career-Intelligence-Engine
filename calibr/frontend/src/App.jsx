import React, { useEffect, useRef, useMemo } from "react";
import { AlertCircle, X, Zap, ChevronRight, User } from "lucide-react";

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
  const { activeTab, error, clearError, token, user } = useAppStore();
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
    return authMode === "login" 
      ? <Login onToggleMode={() => setAuthMode("signup")} /> 
      : <Signup onToggleMode={() => setAuthMode("login")} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/20 selection:text-white overflow-hidden">
      
      {/* ── Fixed Persistent Sidebar ── */}
      <Sidebar />

      {/* ── Main Application Canvas ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        
        {/* Subtle Ambient Glows */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none -z-10 -translate-x-1/4 translate-y-1/4"></div>

        {/* ── Global Header (Integrated) ── */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-white/[0.03] bg-slate-950/20 backdrop-blur-3xl z-40">
           <div className="flex items-center gap-2 animate-fade-in" key={activeTab}>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80">{pageMeta.subtitle}</span>
             <ChevronRight size={10} className="text-white/20" />
             <h2 className="text-sm font-bold text-white tracking-tight">{pageMeta.title}</h2>
           </div>

           <div className="flex items-center gap-6">
              {/* Status Indicator */}
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-glow-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">System Ready</span>
              </div>

              {/* Minimalist User Info */}
              <div className="flex items-center gap-3 pl-6 border-l border-white/[0.05]">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-white leading-none uppercase tracking-wider">{user?.full_name?.split(' ')[0] || 'Executive'}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/10 transition-all cursor-pointer">
                  <User size={14} />
                </div>
              </div>
           </div>
        </header>

        {/* ── Dynamic Content Screen ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-30">
          <div key={activeTab} className="animate-reveal h-full">
            <ActiveContent />
          </div>
        </div>
      </main>

      {/* ── Global Precision Toast ── */}
      {error && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full animate-reveal select-none">
          <div className="p-4 rounded-2xl bg-[#0a0505]/95 border border-red-500/20 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
               <AlertCircle size={16} className="text-red-400" />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-xs font-bold text-red-100/90 leading-relaxed">{error}</p>
            </div>
            <button 
              onClick={clearError}
              className="w-6 h-6 rounded-md hover:bg-white/5 flex items-center justify-center text-red-400/50 hover:text-red-400 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

