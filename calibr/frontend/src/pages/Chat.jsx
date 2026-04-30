import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Trash2,
  Loader2,
  Sparkles,
  Command,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAppStore } from "../store/useAppStore";
import {
  getChatHistory,
  sendChatMessageStream,
  clearChatHistory,
} from "../services/api";
import ChatMessage from "../components/ChatMessage";

/**
 * Minimal Thinking Status
 */
/**
 * System Status Indicator
 */
function SystemStatus({ status }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg mb-6 self-start"
    >
      <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
        {status}
      </span>
    </motion.div>
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
  const [thinkingStatus, setThinkingStatus] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const isInitialScroll = useRef(true);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: isInitialScroll.current ? "auto" : "smooth" 
      });
      isInitialScroll.current = false;
    }
  }, [chatHistory, sending, thinkingStatus]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    addChatMessage({ role: "user", content: text, timestamp: new Date().toISOString() });
    setInput("");
    setSending(true);
    setThinkingStatus("Processing Request...");

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
            // Adaptive batch size: render faster if backend dumps text instantly, 
            // but keep it smooth
            const batchSize = charQueue.length > 300 ? 8 : (charQueue.length > 100 ? 4 : 2);
            const chars = charQueue.splice(0, batchSize).join("");
            appendLastChatMessage(chars);
            
            // Fast 10ms delay for that snappy ChatGPT feel
            await new Promise(r => setTimeout(r, 10));
          } else {
            await new Promise(r => setTimeout(r, 20));
            if (isStreamDone && charQueue.length === 0) break;
          }
        }
        isProcessingQueue = false;
      };

      processQueue();

      await sendChatMessageStream(userId, text, (chunk) => {
        if (chunk.startsWith("THINKING:")) {
          setThinkingStatus(chunk.replace("THINKING:", "").trim() || "Analyzing...");
        } else if (chunk.startsWith("ERROR:")) {
          updateLastChatMessage(`⚠️ System Error: ${chunk.replace("ERROR:", "").trim()}`);
          setThinkingStatus("");
          isStreamDone = true;
        } else {
          if (isFirstChunk) {
            setThinkingStatus("");
            isFirstChunk = false;
          }
          try {
            const parsedChunk = JSON.parse(chunk);
            charQueue.push(...parsedChunk.split(""));
          } catch (e) {
            // Fallback for raw text if parsing fails
            charQueue.push(...chunk.split(""));
          }
        }
      });
      
      isStreamDone = true;

    } catch (err) {
      setError(err.message || "Connection Interrupted");
      updateLastChatMessage(`⚠️ System Error: ${err.message}`);
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
    if (!window.confirm("Clear intelligence session?")) return;
    setClearing(true);
    try {
      await clearChatHistory(userId);
      setChatHistory([]);
    } catch (err) {
      setError(err.message || "Failed to clear session.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative noise-bg">
      
      {/* ── Intelligence Canvas ── */}
      <main className="flex-1 overflow-y-auto px-8 md:px-12 lg:px-16 pt-10 pb-40 no-scrollbar relative z-10">
        
        {/* Empty State */}
        <AnimatePresence>
          {chatHistory.length === 0 && !sending && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl py-12"
            >
              <div className="space-y-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center">
                   <Sparkles size={24} className="text-indigo-400" />
                </div>
                
                <div className="space-y-4">
                  <h2 className="font-heading font-semibold text-white text-4xl md:text-5xl tracking-tight">
                    Strategic <span className="text-indigo-500">Consultation.</span>
                  </h2>
                  <p className="text-slate-500 text-lg font-normal max-w-xl leading-relaxed tracking-tight">
                    Direct access to technical career strategy, market intelligence, and trajectory analysis.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
                  {[
                    "What skills are trending in my stack?",
                    "Identify top 3 gaps for Senior roles",
                    "Summarize market opportunities",
                    "Generate a learning roadmap",
                  ].map((prompt, i) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                      className="flex items-center gap-3 px-6 py-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-indigo-500/20 text-left transition-all group"
                    >
                      <Plus size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                      <p className="text-[13px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">{prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Thread */}
        <div className="max-w-4xl space-y-12">
          {chatHistory.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              isLast={i === chatHistory.length - 1}
            />
          ))}

          {/* System Status */}
          {thinkingStatus && <SystemStatus status={thinkingStatus} />}
        </div>

        <div ref={messagesEndRef} />
      </main>

      {/* ── Input Console ── */}
      <footer className="absolute bottom-0 inset-x-0 p-8 md:p-10 pointer-events-none z-50">
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-4xl mx-auto pointer-events-auto"
        >
          <div className="relative">
            <div className="flex items-end gap-3 bg-slate-900/90 border border-white/5 backdrop-blur-xl rounded-2xl p-3 shadow-2xl focus-within:border-indigo-500/30 transition-all duration-300">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Submit query to intelligence engine..."
                rows={1}
                disabled={sending}
                className="flex-1 bg-transparent text-[14px] text-slate-100 placeholder-slate-600 resize-none focus:outline-none leading-relaxed py-2.5 px-3 font-normal tracking-tight"
                style={{ height: 'auto', minHeight: '44px', maxHeight: '160px' }}
              />

              <div className="flex items-center gap-2 pb-1.5 pr-1.5">
                <AnimatePresence>
                  {chatHistory.length > 0 && (
                    <button
                      onClick={handleClear}
                      disabled={clearing}
                      className="w-10 h-10 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-all flex items-center justify-center"
                      title="Clear Session"
                    >
                      {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    input.trim() && !sending
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
                      : "bg-white/[0.03] text-slate-700"
                  }`}
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex justify-center mt-3 opacity-30">
               <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Shift + Enter for new line • System Online</p>
            </div>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}


