/**
 * components/UploadZone.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Drag-and-Drop Resume Upload Area
 *
 * Accepts .pdf and .docx files via:
 *   - Drag and drop onto the zone
 *   - Click-to-browse file picker
 *
 * Props:
 *   onFileSelect(file) – called with the File object when user picks/drops
 *   isLoading          – disables interaction while upload is in progress
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

/**
 * @param {Function} onFileSelect - Callback invoked with the selected File
 * @param {boolean}  isLoading    - True while the file is being uploaded
 */
export default function UploadZone({ onFileSelect, isLoading = false }) {
  // Tracks whether a file is being dragged over the zone
  const [isDragging, setIsDragging] = useState(false);
  const inputRef    = useRef(null);

  // ── Drag event handlers ──────────────────────────────────────────────────
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
    e.preventDefault();   // Required to allow drop
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

  // ── File input change handler ────────────────────────────────────────────
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
    // Reset input value so selecting the same file again triggers onChange
    e.target.value = "";
  };

  // ── Validate extension and invoke callback ───────────────────────────────
  const validateAndSelect = (file) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      alert("Please upload a .pdf or .docx file only.");
      return;
    }
    onFileSelect(file);
  };

  return (
    <div
      id="upload-zone"
      role="button"
      tabIndex={isLoading ? -1 : 0}
      aria-label="Drag and drop your resume here, or click to browse"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
      className={[
        "relative flex flex-col items-center justify-center gap-4",
        "p-10 rounded-2xl border-2 border-dashed",
        "cursor-pointer transition-all duration-200 select-none",
        // Visual states
        isDragging
          ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
          : "border-slate-600 hover:border-indigo-500/60 hover:bg-slate-800/40",
        isLoading ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleInputChange}
        disabled={isLoading}
        aria-hidden="true"
      />

      {/* ── Icon area ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <Loader2
          size={40}
          className="text-indigo-400 animate-spin"
          aria-label="Uploading…"
        />
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
          <UploadCloud size={26} className="text-indigo-400" />
        </div>
      )}

      {/* ── Text ────────────────────────────────────────────────────────── */}
      <div className="text-center">
        <p className="font-heading font-semibold text-slate-200 text-base">
          {isLoading ? "Processing your resume…" : "Drop your resume here"}
        </p>
        {!isLoading && (
          <>
            <p className="text-sm text-slate-400 mt-1">
              or{" "}
              <span className="text-indigo-400 underline underline-offset-2">
                click to browse
              </span>
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Supported formats: PDF, DOCX · Max 10 MB
            </p>
          </>
        )}
      </div>

      {/* ── Format badges ───────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center gap-3">
          {["PDF", "DOCX"].map((fmt) => (
            <span
              key={fmt}
              className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700"
            >
              <FileText size={9} />
              {fmt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
