import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Trash2,
  Loader2,
  Zap,
  Upload,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { useAppStore } from "../store/useAppStore";
import {
  getChatHistory,
  sendChatMessageStream,
  clearChatHistory,
  refreshMarketIntel,
  getMarketIntelStatus,
} from "../services/api";
import ChatMessage from "../components/ChatMessage";

/**
 * Animated Thinking Status
 */
function ThinkingStatus({ status }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-full animate-reveal mb-4 self-start">
      <div className="flex gap-1">
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse delay-75"></span>
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse delay-150"></span>
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
        {status}
      </span>
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
    updateLastChatMessage,
    appendLastChatMessage,
    setError,
    setActiveTab,
  } = useAppStore();

  const userId = user?._id || user?.id;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [syncingNews, setSyncingNews] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState(""); // RAG stage updates

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleSyncNews = async () => {
    if (syncingNews) return;
    setSyncingNews(true);
    try {
      await refreshMarketIntel();
    } catch (err) {
      setError(err.message || "Failed to sync market news.");
    } finally {
      setTimeout(() => setSyncingNews(false), 2000);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const loadHistory = async () => {
      try {
        const data = await getChatHistory(userId);
        setChatHistory(data.messages || []);
      } catch (err) {
        console.warn("Could not load chat history:", err.message);
      }
    };
    loadHistory();
  }, [userId, setChatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, sending, thinkingStatus]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // 1. User message
    addChatMessage({ role: "user", content: text });
    setInput("");
    setSending(true);
    setThinkingStatus("Analysing query...");

    try {
      // 2. Add empty assistant message placeholder
      addChatMessage({ role: "assistant", content: "" });

      let isFirstChunk = true;
      const charQueue = [];
      let isProcessingQueue = false;

      // Typewriter consumer loop
      const processQueue = async () => {
        if (isProcessingQueue) return;
        isProcessingQueue = true;
        
        while (charQueue.length > 0 || !isStreamDone) {
          if (charQueue.length > 0) {
            const char = charQueue.shift();
            appendLastChatMessage(char);
            // Dynamic delay: slightly faster for longer queues to avoid lag
            const delay = charQueue.length > 100 ? 5 : 20;
            await new Promise(r => setTimeout(r, delay));
          } else {
            // Wait for more data
            await new Promise(r => setTimeout(r, 50));
            if (isStreamDone && charQueue.length === 0) break;
          }
        }
        isProcessingQueue = false;
      };

      let isStreamDone = false;
      processQueue(); // Start the consumer

      // 3. Start Stream
      await sendChatMessageStream(userId, text, (chunk) => {
        if (chunk.startsWith("THINKING:")) {
          setThinkingStatus(chunk.replace("THINKING:", "").trim());
        } else if (chunk.startsWith("ERROR:")) {
          updateLastChatMessage(`⚠️ ${chunk.replace("ERROR:", "").trim()}`);
          setThinkingStatus("");
          isStreamDone = true;
        } else {
          if (isFirstChunk) {
            setThinkingStatus("");
            isFirstChunk = false;
          }
          // Push characters into the queue for steady consumption
          charQueue.push(...chunk.split(""));
        }
      });
      
      isStreamDone = true;

    } catch (err) {
      const errorMsg = err.message || "Unknown error";
      setError(errorMsg);
      updateLastChatMessage(`⚠️ Error: ${errorMsg}`);
    } finally {
      // Don't set sending false immediately if queue is still draining
      // (Wait handled by isStreamDone and loop in a real app, but for simplicity here:)
      setSending(false);
      setThinkingStatus("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending, userId, addChatMessage, updateLastChatMessage, appendLastChatMessage, setError]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    if (clearing || chatHistory.length === 0) return;
    setClearing(true);
    try {
      await clearChatHistory(userId);
      setChatHistory([]);
    } catch (err) {
      setError(err.message || "Failed to clear chat history.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#030303]">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-10 py-8 border-b border-white/[0.03] bg-[#050505]/60 backdrop-blur-3xl sticky top-0 z-50 transition-all duration-500">
        <div className="flex items-center gap-5 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-800 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] transform group-hover:scale-105 group-hover:rotate-2 transition-all duration-500 cursor-default">
            <Zap size={22} className="text-white fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading font-black text-white text-xl tracking-tight leading-none">
                CALIBR <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">INTELLIGENCE</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 tracking-tighter uppercase">
                v1.0
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Neural Link Stable</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSyncNews}
            disabled={syncingNews}
            className="group px-6 py-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-indigo-400 bg-white/[0.02] hover:bg-indigo-500/10 border border-white/[0.05] hover:border-indigo-500/20 rounded-xl transition-all duration-300"
          >
            <RefreshCw size={14} className={`${syncingNews ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-700"}`} />
            {syncingNews ? "Updating Trends" : "Market Intel"}
          </button>

          <button
            onClick={handleClear}
            disabled={clearing || chatHistory.length === 0}
            className="px-4 py-3 text-gray-600 hover:text-red-400 bg-white/[0.02] hover:bg-red-500/10 border border-white/[0.05] hover:border-red-500/20 rounded-xl transition-all"
            title="Reset conversation history"
          >
            {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </header>

      {/* ── Chat Canvas ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-10 py-10 space-y-10 scroll-smooth custom-scrollbar relative">
        {/* Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vh] bg-indigo-500/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vh] bg-purple-500/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        {/* Empty State / Welcome */}
        {chatHistory.length === 0 && !sending && (
          <div className="max-w-4xl mx-auto py-20 animate-reveal">
            <div className="flex flex-col items-center text-center gap-10">
              <div className="relative group">
                <div className="absolute -inset-4 bg-indigo-600/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center shadow-2xl shadow-indigo-500/20 relative z-10 border border-white/10">
                  <Sparkles size={40} className="text-white" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h2 className="font-heading font-black text-white text-5xl tracking-tighter sm:text-6xl">
                  Strategic <span className="text-indigo-400">Advantage.</span>
                </h2>
                <p className="text-gray-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
                  Welcome back. I have analyzed current job fluctuations and cross-referenced them with your professional footprint. Where shall we focus?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4">
                {[
                  "What are the latest trends in my tech stack?",
                  "Analyse my current skill gaps",
                  "Match me to top market opportunities",
                  "Recommend a learning roadmap",
                ].map((prompt, i) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="group relative px-6 py-5 bg-[#080808] border border-white/[0.04] rounded-2xl text-left hover:border-indigo-500/40 transition-all duration-500 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-indigo-400 transition-colors">Prompt {i+1}</span>
                    <p className="text-sm font-bold text-gray-300 mt-1.5 group-hover:text-white transition-colors">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="max-w-4xl mx-auto space-y-12">
          {chatHistory.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              isLast={i === chatHistory.length - 1}
            />
          ))}

          {/* Real-time Thinking Status */}
          {thinkingStatus && <ThinkingStatus status={thinkingStatus} />}
        </div>

        <div ref={messagesEndRef} />
      </main>

      {/* ── Input Engine ────────────────────────────────────────────────── */}
      <footer className="px-10 pb-10 pt-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto relative group">
          {/* Subtle glow border */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[22px] blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
          
          <div className="relative flex items-end gap-5 bg-[#080808] border border-white/[0.07] rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus-within:border-indigo-500/40 transition-all duration-500">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Query the career intelligence engine..."
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none leading-relaxed max-h-48 py-2 font-medium"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                input.trim() && !sending
                  ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95"
                  : "bg-white/[0.03] text-gray-700 cursor-not-allowed"
              }`}
            >
              {sending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} className={input.trim() ? "translate-x-0.5" : ""} />
              )}
            </button>
          </div>

          <div className="flex justify-between items-center px-2 mt-4">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700">Strategic Link : Secured</p>
             </div>
             <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">Shift + Enter for new line</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
