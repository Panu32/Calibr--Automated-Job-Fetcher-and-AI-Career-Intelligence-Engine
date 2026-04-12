import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Tag } from "lucide-react";

/**
 * Technical Node styling logic
 */
const TYPE_STYLES = {
  has: {
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]",
    Icon   : CheckCircle2,
  },
  missing: {
    classes: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_-5px_rgba(244,63,94,0.3)]",
    Icon   : XCircle,
  },
  weak: {
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]",
    Icon   : AlertCircle,
  },
  default: {
    classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]",
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
    <span
      className={[
        "inline-flex items-center gap-2 px-3.5 py-1.5",
        "rounded-xl text-[10px] font-black uppercase tracking-widest border",
        "transition-all duration-300 hover:brightness-125 hover:scale-105 select-none",
        style.classes,
        className,
      ].join(" ")}
    >
      {showIcon && <Icon size={11} className="flex-shrink-0 opacity-80" />}
      <span className="leading-none">{skill}</span>
    </span>
  );
}

