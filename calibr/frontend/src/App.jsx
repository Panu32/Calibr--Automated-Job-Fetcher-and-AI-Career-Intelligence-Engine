/**
 * App.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Root Application Component
 *
 * Layout:
 *   ┌──────────────┬──────────────────────────────────────┐
 *   │   Sidebar    │         Active Page Component        │
 *   │  (fixed 56px │                                      │
 *   │   or 224px)  │                                      │
 *   └──────────────┴──────────────────────────────────────┘
 *
 * Responsibilities:
 *  1. Render the persistent Sidebar on the left.
 *  2. Conditionally render the active page based on store.activeTab.
 *  3. Show a dismissible error toast at the bottom of the screen
 *     when store.error is set. Auto-dismiss after 4 seconds.
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from "react";
import { AlertCircle, X } from "lucide-react";

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

export default function App() {
  const { activeTab, error, clearError, token } = useAppStore();
  const [authMode, setAuthMode] = React.useState("login"); // "login" | "signup"

  // ── Determine which page to render ──────────────────────────────────────
  const ActivePage = PAGES[activeTab] || Home;

  // ── Auto-dismiss error toast after 4 seconds ────────────────────────────
  const dismissTimer = useRef(null);

  useEffect(() => {
    if (!error) return;
    dismissTimer.current = setTimeout(() => {
      clearError();
    }, 4000);
    return () => clearTimeout(dismissTimer.current);
  }, [error, clearError]);

  // ── Auth Guard ──────────────────────────────────────────────────────────
  // If no token exists, show the Auth screen instead of the dashboard.
  if (!token) {
    return authMode === "login" ? (
      <Login onToggleMode={() => setAuthMode("signup")} />
    ) : (
      <Signup onToggleMode={() => setAuthMode("login")} />
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />

      <main
        className="flex-1 overflow-y-auto relative"
        style={{
          background:
            "radial-gradient(ellipse at 80% 0%, rgba(99,102,241,0.07) 0%, transparent 60%), #020617",
        }}
      >
        <div key={activeTab} className="animate-fade-in h-full">
          <ActivePage />
        </div>
      </main>

      {/* Global error toast */}
      {error && (
        <div
          className={[
            "fixed bottom-5 right-5 z-[60]", // ensure it appears above everything
            "max-w-sm w-full animate-slide-in-right",
            "flex items-start gap-3 p-4 rounded-xl",
            "bg-red-950/90 border border-red-500/40",
            "backdrop-blur-sm shadow-2xl",
          ].join(" ")}
          role="alert"
        >
          <AlertCircle size={18} className="flex-shrink-0 text-red-400 mt-0.5" />
          <p className="flex-1 text-sm text-red-200 leading-relaxed">{error}</p>
          <button onClick={clearError} className="text-red-400 hover:text-red-200 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
