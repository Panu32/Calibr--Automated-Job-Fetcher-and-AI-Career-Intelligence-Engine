import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Clock, Bot, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Chat Message - The Intelligence Dispatch
 */
/**
 * Chat Message - The Intelligence Dispatch
 */
export default function ChatMessage({ role, content, timestamp, isLast }) {
  const isUser = role === "user";

  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col gap-3 group ${isUser ? "items-end" : "items-start"}`}
    >
      {/* ── Metadata ── */}
      <div className={`flex items-center gap-4 px-1 opacity-40 group-hover:opacity-100 transition-opacity duration-500 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`flex items-center gap-2`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isUser ? "bg-slate-500" : "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"}`} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {isUser ? "Executive" : "System"}
          </span>
        </div>
        {timeLabel && (
          <span className="text-[9px] font-medium text-slate-600 uppercase tracking-wider">{timeLabel}</span>
        )}
      </div>

      {/* ── Content Area ── */}
      <div
        className={`relative max-w-full sm:max-w-[85%] px-1 py-1 text-[14.5px] leading-relaxed transition-all duration-300 ${
          isUser ? "text-right" : "text-left"
        }`}
      >
        {content ? (
          <div className={`prose prose-invert prose-sm max-w-none ${isUser ? "text-slate-200" : "text-slate-300"}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                ul: ({node, ...props}) => <ul className="my-3 space-y-1.5 list-none pl-0" {...props} />,
                li: ({node, ...props}) => (
                  <li className="flex gap-3 text-slate-400 font-normal tracking-tight">
                    <span className="text-indigo-500 shrink-0 select-none">•</span>
                    <span {...props} />
                  </li>
                ),
                p: ({node, ...props}) => <p className={`mb-3 last:mb-0 tracking-tight font-normal ${isUser ? "text-slate-200" : "text-slate-400"}`} {...props} />,
                code: ({node, inline, ...props}) => 
                  inline 
                    ? <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-indigo-300 text-[12px] font-medium" {...props} />
                    : <code className="block bg-slate-950/50 p-4 rounded-xl border border-white/5 my-4 overflow-x-auto text-indigo-200 font-mono text-[12px] leading-relaxed shadow-inner" {...props} />
              }}
            >
              {content}
            </ReactMarkdown>
            {isLast && !isUser && (
              <motion.span 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-block w-1.5 h-3 ml-2 bg-indigo-500 align-middle"
              ></motion.span>
            )}
          </div>
        ) : (
          <div className="flex gap-2 py-2">
             <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-indigo-500"></motion.span>
             <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-indigo-500"></motion.span>
             <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-indigo-500"></motion.span>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      {!isUser && content && (
         <div className="flex gap-4 px-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 hover:text-indigo-400 transition-colors">Export</button>
            <button className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors">Feedback</button>
         </div>
      )}
    </motion.div>
  );
}


