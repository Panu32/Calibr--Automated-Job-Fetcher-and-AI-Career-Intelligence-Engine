import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Send,
  Trash2,
  Loader2,
  Zap,
  RefreshCw,
  Sparkles,
  Command,
} from "lucide-react";

import { useAppStore } from "../store/useAppStore";
import {
  getChatHistory,
  sendChatMessageStream,
  clearChatHistory,
  refreshMarketIntel,
} from "../services/api";
import ChatMessage from "../components/ChatMessage";

/**
 * Precision Thinking Status
 */
function ThinkingStatus({ status }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-full animate-reveal mb-6 self-start backdrop-blur-md">
      <div className="flex gap-1.5 pt-0.5">
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-glow-pulse"></span>
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-glow-pulse [animation-delay:200ms]"></span>
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-glow-pulse [animation-delay:400ms]"></span>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/70">
        {status}
      </span>
    </div>
  );
}

/**
 * Chat Module - Executive Intelligence Canvas
 */
export default function Chat() {
  const {
    user,
    chatHistory,
    setChatHistory,
    addChatMessage,
    updateLastChatMessage,
    appendLastChatMessage,
    setError,
  } = useAppStore();

  const userId = user?._id || user?.id;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [syncingNews, setSyncingNews] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleSyncNews = async () => {
    if (syncingNews) return;
    setSyncingNews(true);
    try {
      await refreshMarketIntel();
    } catch (err) {
      setError(err.message || "Failed to synchronise market intelligence.");
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
        console.warn("Session history unavailable:", err.message);
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

    addChatMessage({ role: "user", content: text, timestamp: new Date().toISOString() });
    setInput("");
    setSending(true);
    setThinkingStatus("Analysing Strategic Query...");

    try {
      addChatMessage({ role: "assistant", content: "", timestamp: new Date().toISOString() });

      let isFirstChunk = true;
      const charQueue = [];
      let isProcessingQueue = false;
      let isStreamDone = false;

      const processQueue = async () => {
        if (isProcessingQueue) return;
        isProcessingQueue = true;
        
        while (charQueue.length > 0 || !isStreamDone) {
          if (charQueue.length > 0) {
            const char = charQueue.shift();
            appendLastChatMessage(char);
            const delay = charQueue.length > 50 ? 2 : 15;
            await new Promise(r => setTimeout(r, delay));
          } else {
            await new Promise(r => setTimeout(r, 50));
            if (isStreamDone && charQueue.length === 0) break;
          }
        }
        isProcessingQueue = false;
      };

      processQueue();

      await sendChatMessageStream(userId, text, (chunk) => {
        if (chunk.startsWith("THINKING:")) {
          setThinkingStatus(chunk.replace("THINKING:", "").trim());
        } else if (chunk.startsWith("ERROR:")) {
          updateLastChatMessage(`⚠️ System Error: ${chunk.replace("ERROR:", "").trim()}`);
          setThinkingStatus("");
          isStreamDone = true;
        } else {
          if (isFirstChunk) {
            setThinkingStatus("");
            isFirstChunk = false;
          }
          charQueue.push(...chunk.split(""));
        }
      });
      
      isStreamDone = true;

    } catch (err) {
      setError(err.message || "Neural Link Interrupted");
      updateLastChatMessage(`⚠️ Error: ${err.message}`);
    } finally {
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
    if (!window.confirm("Purge session history?")) return;
    setClearing(true);
    try {
      await clearChatHistory(userId);
      setChatHistory([]);
    } catch (err) {
      setError(err.message || "Failed to purge session.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] relative">
      
      {/* ── Chat Canvas ── */}
      <main className="flex-1 overflow-y-auto px-8 md:px-16 pt-10 pb-32 no-scrollbar relative z-10">
        
        {/* Ambient Depth */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none -z-10"></div>

        {/* Empty State: The Command Deck */}
        {chatHistory.length === 0 && !sending && (
          <div className="max-w-4xl mx-auto py-24 animate-reveal">
            <div className="flex flex-col items-center text-center gap-12">
              <div className="relative">
                <div className="absolute -inset-8 bg-indigo-500/10 blur-[60px] rounded-full animate-glow-pulse"></div>
                <div className="w-24 h-24 rounded-[32px] bg-[#050814] border border-white/5 flex items-center justify-center shadow-2xl relative z-10 transition-transform hover:scale-105 duration-700">
                  <Sparkles size={40} className="text-white fill-white/10" />
                </div>
              </div>
              
              <div className="space-y-6">
                <h2 className="font-heading font-black text-white text-5xl md:text-7xl tracking-tighter text-balance leading-none">
                  Strategic <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 text-glow">Intelligence.</span>
                </h2>
                <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed text-balance">
                  Input your professional query. Calibr will cross-reference your technical footprint with current market trends to provide an executive summary.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl mt-6">
                {[
                  "What are the latest shifts in my tech stack?",
                  "Identify mission-critical skill gaps",
                  "Synthesise top market opportunities",
                  "Generate a 6-month technical roadmap",
                ].map((prompt, i) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="glass-card px-8 py-6 text-left border-white/[0.03] hover:border-indigo-500/30 group"
                  >
                    <div className="flex items-center justify-between mb-3 text-indigo-500/40 group-hover:text-indigo-400 transition-colors">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em]">Framework Module {i+1}</span>
                       <Command size={12} />
                    </div>
                    <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="max-w-5xl mx-auto space-y-16">
          {chatHistory.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              isLast={i === chatHistory.length - 1}
            />
          ))}

          {/* Neural Thinking Status */}
          {thinkingStatus && <ThinkingStatus status={thinkingStatus} />}
        </div>

        <div ref={messagesEndRef} />
      </main>

      {/* ── Command Engine (Sticky Input) ── */}
      <footer className="absolute bottom-0 inset-x-0 p-8 md:p-12 z-50 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="group relative">
            {/* Focal Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[30px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>
            
            <div className="relative flex items-end gap-5 bg-[#050814]/80 border border-white/[0.05] backdrop-blur-3xl rounded-[28px] p-5 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] focus-within:border-indigo-500/30 transition-all duration-500">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Submit executive query..."
                rows={1}
                disabled={sending}
                className="flex-1 bg-transparent text-[15px] text-slate-100 placeholder-slate-600 resize-none focus:outline-none leading-relaxed py-3 px-2 font-medium"
                style={{ height: 'auto', minHeight: '48px' }}
              />

              <div className="flex items-center gap-4 py-2 pr-2">
                <button
                  onClick={handleClear}
                  disabled={clearing || chatHistory.length === 0}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all"
                  title="Purge session"
                >
                  {clearing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className={`w-12 h-12 rounded-[18px] flex items-center justify-center transition-all duration-500 ${
                    input.trim() && !sending
                      ? "bg-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95"
                      : "bg-white/[0.03] text-slate-700 cursor-not-allowed"
                  }`}
                >
                  {sending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} className={input.trim() ? "translate-x-0.5" : ""} />
                  )}
                </button>
              </div>
            </div>

            {/* Micro-Metadata */}
            <div className="flex justify-between items-center px-4 mt-4 transition-opacity group-focus-within:opacity-100 opacity-40">
               <div className="flex items-center gap-2.5">
                  <div className="w-1 h-1 rounded-full bg-indigo-500 animate-glow-pulse"></div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Secure Tactical Link Established</p>
               </div>
               <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">Shift + Enter for multi-line parity</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

