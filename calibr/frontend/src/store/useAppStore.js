/**
 * store/useAppStore.js
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Global State (Zustand)
 *
 * Why Zustand?
 *   - Zero boilerplate vs Redux
 *   - No context provider needed — import the hook anywhere
 *   - Tiny bundle footprint (~8kb gzipped)
 *   - Automatic shallow comparison to prevent unnecessary re-renders
 * ─────────────────────────────────────────────────────────────────────────
 */

import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  // ── Authentication ───────────────────────────────────────────────────────
  // Scoped user identity and session token.
  // Initial states are hydrated from localStorage on startup.
  user  : JSON.parse(localStorage.getItem("calibr_user")) || null,
  token : localStorage.getItem("calibr_token") || null,

  // ── Resume & JD data ─────────────────────────────────────────────────────
  resumeData: null,
  jdData: null,
  skillGapResult: null,

  // ── Jobs ─────────────────────────────────────────────────────────────────
  jobs: [],

  // ── Chat ─────────────────────────────────────────────────────────────────
  chatHistory: [],

  // ── UI state ──────────────────────────────────────────────────────────────
  isLoading : false,
  activeTab : localStorage.getItem("calibr_active_tab") || "home",
  error     : null,

  // ─────────────────────────────────────────────────────────────────────────
  //  Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Complete the login/signup process by storing user and token.
   */
  setAuth: (user, token) => {
    localStorage.setItem("calibr_user",  JSON.stringify(user));
    localStorage.setItem("calibr_token", token);
    localStorage.setItem("calibr_active_tab", "home");
    set({ user, token, activeTab: "home", chatHistory: [] });
  },

  /**
   * Clear all auth session data and reset state.
   */
  logout: () => {
    localStorage.removeItem("calibr_user");
    localStorage.removeItem("calibr_token");
    set({ 
      user: null, 
      token: null, 
      activeTab: "home",
      resumeData: null,
      jdData: null,
      jobs: [],
      chatHistory: [],
      skillGapResult: null
    });
  },

  setResumeData: (data) =>
    set({ resumeData: data, skillGapResult: null }),

  setJdData: (data) =>
    set({ jdData: data, skillGapResult: null }),

  setSkillGapResult: (result) =>
    set({ skillGapResult: result }),

  setJobs: (jobs) =>
    set({ jobs }),

  addChatMessage: (message) =>
    set((state) => ({
      chatHistory: [
        ...state.chatHistory,
        { ...message, timestamp: message.timestamp || new Date().toISOString() },
      ],
    })),

  setChatHistory: (history) =>
    set({ chatHistory: history }),

  updateLastChatMessage: (content) =>
    set((state) => {
      const history = [...state.chatHistory];
      if (history.length > 0) {
        history[history.length - 1] = { 
          ...history[history.length - 1], 
          content,
          timestamp: new Date().toISOString()
        };
      }
      return { chatHistory: history };
    }),

  appendLastChatMessage: (chunk) =>
    set((state) => {
      const history = [...state.chatHistory];
      if (history.length > 0) {
        const lastIndex = history.length - 1;
        history[lastIndex] = {
          ...history[lastIndex],
          content: (history[lastIndex].content || "") + chunk,
          timestamp: new Date().toISOString()
        };
      }
      return { chatHistory: history };
    }),

  setLoading: (bool) =>
    set({ isLoading: bool }),

  setActiveTab: (tab) => {
    localStorage.setItem("calibr_active_tab", tab);
    set({ activeTab: tab, error: null });
  },

  setError: (msg) =>
    set({ error: msg }),

  clearError: () =>
    set({ error: null }),
}));
