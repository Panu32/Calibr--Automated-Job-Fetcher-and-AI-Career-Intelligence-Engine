import React from "react";
import { Zap, User, Clock } from "lucide-react";

/**
 * Precision Content Renderer
 * Supports: **bold**, list items starting with -, and newlines.
 */
function renderContent(text) {
  if (!text) return null;

  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-black tracking-tight">{part.slice(2, -2)}</strong>;
    }
    
    return part.split("\n").map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {line.trim().startsWith("-") ? (
          <span className="block pl-5 py-1.5 border-l-[3px] border-indigo-500/20 my-3 bg-indigo-500/[0.02] rounded-r-xl transition-colors hover:bg-indigo-500/[0.04]">
            {line.trim()}
          </span>
        ) : (
          line
        )}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  });
}

/**
 * Chat Message - The Intelligence Dispatch
 */
export default function ChatMessage({ role, content, timestamp, isLast }) {
  const isUser = role === "user";

  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour  : "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`flex gap-8 items-start group animate-reveal ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* ── Avatar Identity ── */}
      <div className="relative pt-1 flex-shrink-0">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-700 ${
          isUser 
            ? "bg-slate-900 border border-white/[0.03] group-hover:border-indigo-500/20" 
            : "bg-gradient-to-br from-indigo-600 to-indigo-800 p-[1px] shadow-[0_8px_16px_rgba(79,70,229,0.2)]"
        }`}>
          {isUser ? (
            <User size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
          ) : (
            <div className="w-full h-full bg-[#050814] rounded-[15px] flex items-center justify-center">
              <Zap size={18} className="text-white fill-current animate-glow-pulse" />
            </div>
          )}
        </div>
        
        {/* Connection status dot for assistant */}
        {!isUser && (
           <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#020617] rounded-full flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_#10b981]" />
           </div>
        )}
      </div>

      {/* ── Message Core ── */}
      <div className={`flex flex-col gap-3 max-w-[85%] sm:max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        
        {/* Label & Metadata */}
        <div className={`flex items-center gap-4 px-1 opacity-40 group-hover:opacity-100 transition-opacity duration-500 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
            {isUser ? "S-STRATEGY INPUT" : "C-NEURAL SUMMARY"}
          </span>
          {timeLabel && (
            <div className="flex items-center gap-1.5">
               <Clock size={10} className="text-slate-700" />
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{timeLabel}</span>
            </div>
          )}
        </div>

        {/* Bubble Design */}
        <div
          className={`relative px-8 py-6 rounded-[32px] text-[15px] leading-relaxed font-medium transition-all duration-700 ${
            isUser
              ? "bg-[#050814] border border-white/[0.04] text-slate-200 rounded-tr-none shadow-[0_15px_35px_rgba(0,0,0,0.4)] group-hover:border-indigo-500/20"
              : "bg-white/[0.01] border border-white/[0.03] text-slate-300 rounded-tl-none shadow-[0_25px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl group-hover:border-white/[0.08]"
          }`}
        >
          {content ? (
            <div className="space-y-1.5 selection:bg-indigo-500/30">
              {renderContent(content)}
              {isLast && !isUser && content.length > 0 && (
                <span className="inline-block w-1.5 h-4 ml-2 bg-indigo-500 animate-glow-pulse align-middle rounded-full"></span>
              )}
            </div>
          ) : (
            <div className="flex gap-2.5 py-3">
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-bounce [animation-duration:1s]"></span>
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></span>
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>

        {/* Subtle Footer Action for Assistant */}
        {!isUser && content && (
           <div className="px-4 opacity-0 group-hover:opacity-40 transition-opacity flex gap-6">
              <button className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">COPY SOURCE</button>
              <button className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">FLAG ANOMALY</button>
           </div>
        )}
      </div>
    </div>
  );
}

