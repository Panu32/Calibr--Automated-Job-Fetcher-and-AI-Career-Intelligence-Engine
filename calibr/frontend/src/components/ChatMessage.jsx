/**
 * components/ChatMessage.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Single Chat Message Bubble
 *
 * Renders one message in the chat thread:
 *   user message      → right-aligned, indigo bubble, "You" label
 *   assistant message → left-aligned, slate bubble, "Calibr AI" + bot icon
 *
 * Basic markdown rendering (no external library):
 *   **text**   → <strong>
 *   line break → <br />
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { Zap } from "lucide-react";

/**
 * Convert a markdown-lite string to React elements.
 * Supports: **bold** and newlines only.
 * Deliberately minimal — avoids pulling in a full markdown parser.
 */
function renderContent(text) {
  if (!text) return null;

  // Split on **...** capturing groups so we know which parts are bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      // Bold: strip the ** delimiters
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Plain text: convert \n to <br />
    return part.split("\n").map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  });
}

/**
 * @param {string}  role      - "user" | "assistant"
 * @param {string}  content   - Message text (supports **bold** and newlines)
 * @param {string}  timestamp - ISO timestamp string (optional)
 */
export default function ChatMessage({ role, content, timestamp }) {
  const isUser = role === "user";

  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour  : "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={[
        "flex gap-4 items-end animate-reveal",
        isUser ? "flex-row-reverse" : "flex-row",
      ].join(" ")}
    >
      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      {isUser ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
          U
        </div>
      ) : (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
          <Zap size={14} className="text-white fill-white" />
        </div>
      )}

      {/* ── Bubble ──────────────────────────────────────────────────────── */}
      <div
        className={[
          "max-w-[85%] flex flex-col gap-1.5",
          isUser ? "items-end" : "items-start",
        ].join(" ")}
      >
        {/* Sender label */}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">
          {isUser ? "You" : "Calibr AI"}
        </span>

        {/* Message text bubble */}
        <div
          className={[
            "px-6 py-4 rounded-2xl text-sm leading-relaxed font-medium shadow-2xl",
            isUser
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-none border border-white/10"
              : "glass-card bg-white/[0.04] text-slate-100 rounded-bl-none border-white/5 backdrop-blur-2xl",
          ].join(" ")}
        >
          {renderContent(content)}
        </div>

        {/* Timestamp */}
        {timeLabel && (
          <span className="text-[10px] font-bold text-gray-600 px-1 tracking-tight">{timeLabel}</span>
        )}
      </div>
    </div>
  );
}
