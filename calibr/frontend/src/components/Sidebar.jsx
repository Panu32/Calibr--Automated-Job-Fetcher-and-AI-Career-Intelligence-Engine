/**
 * components/Sidebar.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Left Navigation Sidebar
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import {
  Zap,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Briefcase,
  ChevronRight,
  User,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const NAV_SECTIONS = [
  {
    label: "MAIN",
    items: [
      { id: "home",  label: "Home",         icon: LayoutDashboard },
      { id: "chat",  label: "AI Assistant", icon: MessageSquare   },
    ],
  },
  {
    label: "MY PROFILE",
    items: [
      { id: "resume", label: "Resume & JD", icon: FileText },
    ],
  },
  {
    label: "JOBS",
    items: [
      { id: "jobs", label: "Jobs For You", icon: Briefcase },
    ],
  },
];

export default function Sidebar() {
  const { activeTab, setActiveTab, resumeData, user, logout } = useAppStore();

  const hasResume = !!resumeData;

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  return (
    <aside
      className={[
        "flex flex-col h-screen bg-[#020617] border-r border-white-[0.05]",
        "transition-all duration-500 shadow-2xl z-50",
        "w-16 md:w-64",
      ].join(" ")}
    >
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.03]">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
          <Zap size={18} className="text-white fill-white" />
        </div>
        <span className="hidden md:block font-heading font-black text-xl text-white tracking-tighter">
          Calibr<span className="text-indigo-400">AI</span>
        </span>
      </div>

      {/* ── Navigation sections ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="hidden md:block px-4 mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
              {section.label}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon     = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={[
                      "nav-item w-full group relative",
                      isActive ? "active text-white bg-white/[0.03]" : "text-gray-500 hover:text-gray-200",
                      "justify-center md:justify-start",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-indigo-400" : "text-current transition-colors duration-300"}
                    />
                    <span className="hidden md:block font-bold">{item.label}</span>

                    {item.id === "resume" && (
                      <span
                        className={[
                          "hidden md:flex ml-auto items-center gap-1",
                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                          hasResume
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        ].join(" ")}
                      >
                        {hasResume ? "Active" : "Pending"}
                      </span>
                    )}

                    {isActive && item.id !== "resume" && (
                      <ChevronRight
                        size={14}
                        className="hidden md:block ml-auto text-indigo-400/50 group-hover:text-indigo-400 transition-colors"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom Section: User & Logout ──────────────────────────────── */}
      <div className="mt-auto px-3 pb-6 space-y-3">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={[
            "nav-item w-full text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300",
            "justify-center md:justify-start",
          ].join(" ")}
        >
          <LogOut size={18} />
          <span className="hidden md:block font-bold">Log Out</span>
        </button>

        {/* User profile strip */}
        <div className="flex items-center gap-3 px-3 py-4 bg-white/[0.02] rounded-2xl border border-white/[0.05] group hover:bg-white/[0.04] transition-colors">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
            <User size={16} className="text-indigo-400" />
          </div>
          <div className="hidden md:block min-w-0 overflow-hidden">
            <p className="text-xs font-black text-white truncate tracking-tight">
              {user?.full_name || "Guest"}
            </p>
            <p className="text-[10px] text-slate-500 truncate font-semibold">
              {user?.email || "Not logged in"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
