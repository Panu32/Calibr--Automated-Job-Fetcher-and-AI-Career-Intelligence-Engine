import React from "react";
import {
  Zap,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Briefcase,
  ChevronRight,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { id: "home",  label: "Home",         icon: LayoutDashboard },
      { id: "chat",  label: "AI Assistant", icon: MessageSquare   },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "resume", label: "Skill Strategy", icon: FileText },
      { id: "jobs", label: "Market Feed", icon: Briefcase },
    ],
  },
];

/**
 * Sidebar component - Navigation for the Executive Suite
 */
export default function Sidebar() {
  const { activeTab, setActiveTab, resumeData, user, logout } = useAppStore();

  const hasResume = !!resumeData;

  const handleLogout = () => {
    if (window.confirm("Safe Terminate Session?")) {
      logout();
    }
  };

  return (
    <aside
      className={[
        "flex flex-col h-screen bg-[#050814] border-r border-white-[0.03]",
        "transition-all duration-500 z-50 overflow-hidden",
        "w-16 md:w-64",
      ].join(" ")}
    >
      {/* ── High-End Branding ── */}
      <div className="flex items-center gap-3.5 px-6 pt-10 pb-12 cursor-default select-none">
        <div className="relative group">
          <div className="absolute -inset-1.5 bg-indigo-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_8px_16px_rgba(79,70,229,0.3)] transform group-hover:scale-110 transition-all duration-500">
            <Zap size={20} className="text-white fill-white" />
          </div>
        </div>
        <div className="hidden md:block">
          <h1 className="font-heading font-black text-xl text-white tracking-tighter leading-none">
            Calibr<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-indigo-500/50 mt-1">Intelligence</p>
        </div>
      </div>

      {/* ── Navigation Tree ── */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-10 custom-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="hidden md:block px-4 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">
              {section.label}
            </p>

            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon     = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={[
                      "nav-item w-full group relative transition-all duration-300",
                      isActive 
                        ? "text-white bg-indigo-500/5 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.1)]" 
                        : "text-slate-500 hover:text-slate-200",
                      "justify-center md:justify-start px-4 py-3 rounded-xl",
                    ].join(" ")}
                  >
                    {/* Active Indicator Bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-indigo-400 rounded-r-full animate-fade-in" />
                    )}

                    <Icon
                      size={18}
                      className={isActive ? "text-indigo-400" : "text-current transition-colors duration-300"}
                    />
                    <span className="hidden md:block font-bold tracking-tight">{item.label}</span>

                    {item.id === "resume" && hasResume && (
                      <div className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                    )}

                    {isActive && (
                      <ChevronRight
                        size={12}
                        className="hidden md:block ml-auto text-indigo-400/30 group-hover:text-indigo-400 transition-colors"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Session Control & Profile ── */}
      <div className="mt-auto p-4 space-y-4">
        
        {/* Terminate Session */}
        <button
          onClick={handleLogout}
          className={[
            "nav-item w-full text-slate-600 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-300",
            "justify-center md:justify-start px-4 py-3 rounded-xl",
          ].join(" ")}
        >
          <LogOut size={18} />
          <span className="hidden md:block font-bold tracking-tight">Safely Logout</span>
        </button>

        {/* Executive Identity Card */}
        <div className="flex items-center gap-3.5 px-4 py-4 bg-white/[0.01] rounded-2xl border border-white/[0.03] group hover:border-indigo-500/20 transition-all duration-500 transform hover:-translate-y-0.5">
          <div className="relative flex-shrink-0 w-9 h-9 rounded-xl border border-white/5 bg-slate-900 flex items-center justify-center text-indigo-400 shadow-inner group-hover:bg-indigo-500/10 transition-colors">
            <User size={16} />
            {hasResume && (
               <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#020617] rounded-full flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-glow-pulse" />
               </div>
            )}
          </div>
          <div className="hidden md:block min-w-0 overflow-hidden">
            <p className="text-[11px] font-black text-white truncate tracking-tight uppercase">
              {user?.full_name?.split(' ')[0] || "Executive"}
            </p>
            <p className="text-[8px] text-slate-600 truncate font-black uppercase tracking-[0.2em] mt-0.5">
              Verified Session
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

