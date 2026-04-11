import React from "react";
import { Zap, User } from "lucide-react";

/**
 * Convert a markdown-lite string to React elements.
 * Supports: **bold**, list items starting with -, and newlines.
 */
function renderContent(text) {
  if (!text) return null;

  // Split on **...** capturing groups for bolding
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-black">{part.slice(2, -2)}</strong>;
    }
    
    // Handle bullet points and newlines
    return part.split("\n").map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {line.trim().startsWith("-") ? (
          <span className="block pl-4 py-0.5 border-l-2 border-indigo-500/30 my-1 bg-indigo-500/5 rounded-r-md">
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
 * @param {string}  role      - "user" | "assistant"
 * @param {string}  content   - Message text
 * @param {string}  timestamp - ISO timestamp string
 * @param {boolean} isLast    - Is this the most recent message?
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
      className={`flex gap-6 items-start group animate-reveal ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* ── Avatar ── */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
        isUser 
          ? "bg-[#111] border border-white/[0.05] group-hover:border-indigo-500/30 group-hover:bg-indigo-500/5" 
          : "bg-gradient-to-br from-indigo-500 to-purple-700 p-[1px]"
      }`}>
        {isUser ? (
          <User size={18} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
        ) : (
          <div className="w-full h-full bg-[#080808] rounded-[15px] flex items-center justify-center">
            <Zap size={16} className="text-white fill-current" />
          </div>
        )}
      </div>

      {/* ── Message Core ── */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Label */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">
            {isUser ? "Strategic Origin" : "Neural Output"}
          </span>
          {timeLabel && (
            <span className="text-[8px] font-bold text-gray-800 uppercase tracking-widest leading-none">
              {timeLabel}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative px-7 py-5 rounded-[2rem] text-[15px] leading-relaxed font-medium transition-all duration-500 ${
            isUser
              ? "bg-[#0A0A0A] border border-white/[0.05] text-gray-200 rounded-tr-none shadow-[0_10px_30px_rgba(0,0,0,0.3)] group-hover:border-indigo-500/20"
              : "bg-white/[0.02] border border-white/[0.04] text-gray-300 rounded-tl-none shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-3xl group-hover:border-white/[0.1]"
          }`}
        >
          {/* Content rendering */}
          {content ? (
            <div className="space-y-1">
              {renderContent(content)}
              {isLast && !isUser && content.length > 0 && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle rounded-full"></span>
              )}
            </div>
          ) : (
            <div className="flex gap-2 py-2">
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-bounce"></span>
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-bounce [animation-delay:0.2s]"></span>
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
