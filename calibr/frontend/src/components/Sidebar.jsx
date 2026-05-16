import React from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Briefcase,
  ChevronRight,
  User,
  LogOut,
  Sparkles,
  Brain,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { id: "home",  label: "Dashboard",   icon: LayoutDashboard },
      { id: "chat",  label: "Assistant",   icon: MessageSquare   },
    ],
  },
  {
    label: "Strategic",
    items: [
      { id: "resume", label: "Profile",       icon: User     },
      { id: "jobs",   label: "Opportunities", icon: Briefcase },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "interview", label: "Interview", icon: Brain },
    ],
  },
];

import logo from "../assets/logo.png";

/**
 * Sidebar component - Navigation for the Executive Suite
 */
export default function Sidebar() {
  const { activeTab, setActiveTab, resumeData, user, logout } = useAppStore();

  const hasResume = !!resumeData;

  const handleLogout = () => {
    if (window.confirm("End current session?")) {
      logout();
    }
  };

  return (
    <aside
      className="flex flex-col h-screen bg-slate-950/80 backdrop-blur-2xl border-r border-white/5 transition-all duration-300 z-50 overflow-hidden w-20 md:w-64"
    >
      {/* ── Corporate Branding ── */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-10 cursor-default select-none">
        <img 
          src={logo} 
          alt="CalibrAI" 
          className="w-8 h-8 md:w-20 md:h-auto object-contain"
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-8 no-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="hidden md:block px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {section.label}
            </p>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon     = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={[
                      "nav-item w-full flex items-center gap-3 py-2 rounded-lg transition-all duration-200 relative group",
                      isActive ? "active text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]",
                      "justify-center md:justify-start px-3",
                    ].join(" ")}
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.5}
                      className={isActive ? "text-indigo-400" : "group-hover:text-slate-400 transition-colors"}
                    />
                    <span className="hidden md:block font-medium tracking-tight text-[13.5px]">{item.label}</span>

                    {isActive && (
                      <motion.div 
                        layoutId="active-nav"
                        className="absolute left-[-16px] w-1 h-5 bg-indigo-500 rounded-r-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer Elements ── */}
      <div className="mt-auto p-4 space-y-3">
        
        {/* Profile Card */}
        <div className="flex items-center gap-3 px-3 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.04] transition-all cursor-pointer group">
          <div className="relative flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
            <User size={16} />
            {hasResume && (
               <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-sm" />
            )}
          </div>
          <div className="hidden md:block min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-none mb-1">
              {user?.full_name?.split(' ')[0] || "Executive"}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                Online
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.02] transition-all group"
        >
          <LogOut size={16} />
          <span className="hidden md:block font-medium text-[12px]">Sign out</span>
        </button>
      </div>
    </aside>
  );
}


