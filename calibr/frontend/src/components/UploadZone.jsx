import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, Loader2, Sparkles, ShieldCheck } from "lucide-react";

/**
 * UploadZone - The Neural Gateway
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
  }, [isLoading, onFileSelect]);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
    e.target.value = "";
  };

  const validateAndSelect = (file) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      alert("Executive insight requires .pdf or .docx formats.");
      return;
    }
    onFileSelect(file);
  };

  return (
    <div
      role="button"
      tabIndex={isLoading ? -1 : 0}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
      className={[
        "relative flex flex-col items-center justify-center transition-all duration-700 overflow-hidden",
        "p-12 rounded-[32px] border-2 border-dashed group select-none",
        isDragging
          ? "border-indigo-500 bg-indigo-500/[0.05] scale-[1.02] shadow-[0_30px_60px_-15px_rgba(79,70,229,0.2)]"
          : "border-white/[0.05] bg-white/[0.01] hover:border-white/[0.1] hover:bg-white/[0.02] hover:shadow-2xl",
        isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleInputChange}
        disabled={isLoading}
      />

      {/* ── Background Glow ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* ── Icon Identity ── */}
      <div className="relative mb-6">
        {isLoading ? (
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
             <div className="w-20 h-20 rounded-[28px] bg-slate-900 border border-white/5 flex items-center justify-center relative z-10">
               <Loader2 size={32} className="text-indigo-400 animate-spin" />
             </div>
          </div>
        ) : (
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-20 h-20 rounded-[28px] bg-slate-900 border border-white/5 flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
               <UploadCloud size={32} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
             </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="text-center relative z-10 max-w-sm">
        <h3 className="text-xl font-black text-white tracking-tighter mb-2">
          {isLoading ? "Executing Neural Parse..." : "Synchronise Credentials"}
        </h3>
        {!isLoading && (
          <p className="text-sm text-slate-500 font-medium leading-relaxed group-hover:text-slate-400 transition-colors">
            Drag your professional dossier here, or <span className="text-indigo-400 group-hover:underline">browse files</span>.
          </p>
        )}
      </div>

      {/* ── Metadata ── */}
      {!isLoading && (
        <div className="mt-8 flex items-center gap-6 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure Protocol</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-800" />
          <div className="flex items-center gap-3">
            {["PDF", "DOCX"].map((fmt) => (
              <span
                key={fmt}
                className="text-[9px] font-black uppercase tracking-widest text-slate-600 border border-white/5 px-2 py-0.5 rounded-md"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

