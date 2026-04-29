import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Tag } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Technical Node styling logic
 */
const TYPE_STYLES = {
  has: {
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]",
    Icon   : CheckCircle2,
  },
  missing: {
    classes: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_20px_-5px_rgba(244,63,94,0.2)]",
    Icon   : XCircle,
  },
  weak: {
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]",
    Icon   : AlertCircle,
  },
  default: {
    classes: "bg-white/[0.03] text-indigo-400 border-white/[0.08] hover:border-indigo-500/30",
    Icon   : Tag,
  },
};

/**
 * SkillTag - The Technical Node Pill
 */
export default function SkillTag({ skill, type, showIcon = true, className = "" }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.default;
  const Icon  = style.Icon;

  return (
    <motion.span
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`
        inline-flex items-center gap-2.5 px-4 py-2
        rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border
        transition-all duration-300 select-none cursor-default
        ${style.classes}
        ${className}
      `}
    >
      {showIcon && <Icon size={12} className="flex-shrink-0 opacity-70" />}
      <span className="leading-none">{skill}</span>
    </motion.span>
  );
}

