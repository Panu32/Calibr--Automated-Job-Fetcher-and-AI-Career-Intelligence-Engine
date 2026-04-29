import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, Loader2, Sparkles, ShieldCheck, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * UploadZone - The Intelligence Gateway
 */
export default function UploadZone({ onFileSelect, isLoading = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef    = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  }, [isLoading]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isLoading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSelect(file);
  }, [isLoading]);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
    e.target.value = "";
  };

  const validateAndSelect = (file) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      alert("Executive intelligence requires .pdf or .docx formats.");
      return;
    }
    onFileSelect(file);
  };

  return (
    <motion.div
      whileHover={!isLoading ? { scale: 1.01 } : {}}
      whileTap={!isLoading ? { scale: 0.99 } : {}}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center p-16 rounded-[48px] border-2 border-dashed 
        transition-all duration-700 cursor-pointer group select-none overflow-hidden
        ${isDragging 
          ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_80px_rgba(99,102,241,0.1)]" 
          : "border-white/[0.08] bg-white/[0.01] hover:border-indigo-500/30 hover:bg-white/[0.03]"}
        ${isLoading ? "opacity-70 cursor-wait" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleInputChange}
        disabled={isLoading}
      />

      {/* ── Background Intelligence Aura ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none group-hover:animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none group-hover:animate-pulse" />

      {/* ── Icon Identity ── */}
      <div className="relative mb-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative"
            >
               <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full animate-pulse" />
               <div className="w-24 h-24 rounded-[32px] glass-panel border border-indigo-500/20 flex items-center justify-center relative z-10">
                 <Loader2 size={40} className="text-indigo-400 animate-spin" />
               </div>
            </motion.div>
          ) : (
            <motion.div 
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative"
            >
               <div className="absolute inset-0 bg-indigo-500/15 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="w-24 h-24 rounded-[32px] bg-slate-900 border border-white/[0.08] flex items-center justify-center relative z-10 transition-all duration-500 group-hover:-translate-y-2 group-hover:border-indigo-500/40 group-hover:shadow-2xl group-hover:shadow-indigo-500/20">
                 <UploadCloud size={40} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Content ── */}
      <div className="text-center relative z-10 max-w-sm">
        <h3 className="text-3xl font-black text-white tracking-tighter mb-3 leading-none">
          {isLoading ? "Analyzing Dossier..." : "Sync Credentials"}
        </h3>
        <p className="text-slate-500 text-lg font-medium leading-relaxed tracking-tight group-hover:text-slate-300 transition-colors">
          {isLoading 
            ? "Calibr AI is extracting executive intelligence from your profile." 
            : "Drop your professional profile here to unlock personalized intelligence."}
        </p>
      </div>

      {/* ── Security & Format Metadata ── */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-8 opacity-40 group-hover:opacity-100 transition-all duration-700">
        <div className="flex items-center gap-3">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Secure Protocol v2.4</span>
        </div>
        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-800" />
        <div className="flex items-center gap-4">
          {["PDF", "DOCX"].map((fmt) => (
            <span
              key={fmt}
              className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border border-white/[0.08] px-3 py-1 rounded-lg group-hover:border-indigo-500/20 group-hover:text-indigo-400 transition-colors"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* ── Interaction Hint ── */}
      {!isLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute bottom-6 text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500/40 pointer-events-none"
        >
          Click to Browse Filesystem
        </motion.div>
      )}
    </motion.div>
  );
}

