/**
 * pages/Chat.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – AI Career Chat Page
 *
 * On mount: loads chat history from backend.
 * Message area: renders ChatMessage components, auto-scrolls.
 * Input area: sends messages, shows typing indicator, disables while loading.
 * Top bar: clear history button.
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Trash2,
  Loader2,
  Zap,
  Upload,
  MessageSquare,
} from "lucide-react";

import { useAppStore }       from "../store/useAppStore";
import {
  getChatHistory,
  sendChatMessage,
  clearChatHistory,
} from "../services/api";
import ChatMessage from "../components/ChatMessage";

// ── Typing indicator (3 animated dots) ────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 items-end">
      {/* Bot avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
        <Zap size={12} className="text-white fill-white" />
      </div>
      {/* Dots */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-400"
            style={{
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Chat() {
  const {
    user,
    chatHistory,
    resumeData,
    setChatHistory,
    addChatMessage,
    setError,
    setActiveTab,
  } = useAppStore();

  const userId = user?._id || user?.id;

  const [input,     setInput]     = useState("");      // textarea value
  const [sending,   setSending]   = useState(false);   // waiting for AI response
  const [clearing,  setClearing]  = useState(false);   // clearing history

  const messagesEndRef = useRef(null);   // scroll-to anchor
  const inputRef       = useRef(null);   // focus after send

  // ── Load chat history on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;   // safety: wait for hydration
    
    const loadHistory = async () => {
      try {
        const data = await getChatHistory(userId);   // GET /chat/history/{userId}
        setChatHistory(data.messages || []);
      } catch (err) {
        // Non-fatal — empty history is fine
        console.warn("Could not load chat history:", err.message);
      }
    };
    loadHistory();
  }, [userId, setChatHistory]);

  // ── Auto-scroll to bottom whenever a message is added ──────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, sending]);

  // ── Send message handler ────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // 1. Optimistically add user message to store immediately
    addChatMessage({ role: "user", content: text });
    setInput("");
    setSending(true);

    try {
      // 2. Call POST /chat/message
      const response = await sendChatMessage(userId, text);

      // 3. Add assistant response to store
      addChatMessage({
        role     : "assistant",
        content  : response.response,
        timestamp: response.timestamp,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Unknown error";
      setError(errorMsg);
      // Add a visible error message in the chat so the user sees it in context
      addChatMessage({
        role   : "assistant",
        content: `⚠️ Error: ${errorMsg}`,
      });
    } finally {
      setSending(false);
      // Re-focus input so user can type immediately
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending, userId, addChatMessage, setError]);

  // ── Handle Enter key to send (Shift+Enter = newline) ───────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Clear history handler ────────────────────────────────────────────────
  const handleClear = async () => {
    if (clearing || chatHistory.length === 0) return;
    setClearing(true);
    try {
      await clearChatHistory(userId);   // DELETE /chat/history/{userId}
      setChatHistory([]);
    } catch (err) {
      setError(err.message || "Failed to clear chat history.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.05] bg-white/[0.01] backdrop-blur-md flex-shrink-0 relative z-20">
        <div className="flex items-center gap-4 animate-reveal">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg transform hover:rotate-3 transition-transform">
            <Zap size={18} className="text-white fill-white drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          </div>
          <div>
            <h1 className="font-heading font-black text-white text-lg leading-tight tracking-tight">
              Calibr <span className="text-indigo-400">Assistant</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Systems Active</p>
            </div>
          </div>
        </div>

        {/* Clear history button */}
        <button
          id="clear-chat-btn"
          onClick={handleClear}
          disabled={clearing || chatHistory.length === 0}
          className="btn-ghost px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-20 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
          title="Clear chat history"
        >
          {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Reset Session
        </button>
      </div>

      {/* ── No-resume banner ─────────────────────────────────────────────── */}
      {!resumeData && (
        <div className="mx-8 mt-6 flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-reveal">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
             <Upload size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-200">
              Personalisation Pending
            </p>
            <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider">
              Resume required for verified intelligence
            </p>
          </div>
          <button
            onClick={() => setActiveTab("resume")}
            className="text-xs font-black uppercase tracking-widest text-white px-4 py-2 bg-amber-500/20 rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            Upload
          </button>
        </div>
      )}

      {/* ── Messages area ──────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scroll-smooth"
        aria-live="polite"
      >
        {/* Welcome screen (no messages yet) */}
        {chatHistory.length === 0 && !sending && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-8 animate-reveal">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full"></div>
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl relative z-10">
                <MessageSquare size={32} className="text-white" />
              </div>
            </div>
            
            <div className="max-w-md">
              <h2 className="font-heading font-black text-white text-3xl tracking-tighter">
                Hello, I'm <span className="text-indigo-400">Calibr.</span>
              </h2>
              <p className="text-gray-400 text-base mt-3 font-medium leading-relaxed">
                Your high-fidelity career intelligence agent. How can I accelerate your professional trajectory today?
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {[
                "Analyse my current skill gaps",
                "Match me to top market opportunities",
                "Optimise my resume for senior roles",
                "Recommend a learning roadmap",
              ].map((prompt, i) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className={`text-[10px] font-bold uppercase tracking-widest text-left px-5 py-4 rounded-xl glass-card bg-white/[0.02] border-white/5 text-gray-500 hover:border-indigo-500/40 hover:text-white hover:bg-white/[0.05] transition-all duration-300 animate-reveal stagger-${i+1}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render chat messages */}
        {chatHistory.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}

        {/* Typing indicator while waiting for AI */}
        {sending && <TypingIndicator />}

        {/* Invisible anchor to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 pb-8 pt-4 border-t border-white/[0.05] bg-white/[0.01] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-end gap-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-6 py-4 focus-within:border-indigo-500/40 focus-within:bg-white/[0.05] transition-all duration-300 shadow-2xl">
          {/* Textarea — auto-resizes with rows */}
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your strategic inquiry…"
            rows={1}
            disabled={sending}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none leading-relaxed max-h-48 disabled:opacity-50 font-medium"
            style={{ scrollbarWidth: "none" }}
          />

          {/* Send button */}
          <button
            id="send-message-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={[
              "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
              "transition-all duration-500",
              input.trim() && !sending
                ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20 translate-y-0 opacity-100"
                : "bg-white/5 text-gray-700 cursor-not-allowed opacity-40",
            ].join(" ")}
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
            )}
          </button>
        </div>

        <div className="flex justify-center gap-6 mt-4">
           <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-700">
            Secure Neural Link : Ready
           </p>
        </div>
      </div>

      {/* Inline bounce animation for typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
