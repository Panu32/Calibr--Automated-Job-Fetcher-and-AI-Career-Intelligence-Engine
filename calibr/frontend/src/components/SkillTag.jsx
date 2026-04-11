/**
 * components/SkillTag.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Calibr – Skill Pill Badge
 *
 * A simple coloured pill that represents a single skill.
 * Colour is driven by the `type` prop:
 *   "has"     → emerald (user has this skill)
 *   "missing" → rose    (skill is absent from resume)
 *   "weak"    → amber   (skill exists but needs improvement)
 *   (default) → indigo  (neutral — used in resume/JD skill lists)
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Tag } from "lucide-react";

// Maps type → Tailwind colour classes + icon component
const TYPE_STYLES = {
  has: {
    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Icon   : CheckCircle2,
  },
  missing: {
    classes: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    Icon   : XCircle,
  },
  weak: {
    classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Icon   : AlertCircle,
  },
  default: {
    classes: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
    Icon   : Tag,
  },
};

/**
 * @param {string}  skill  - The skill name to display
 * @param {string}  type   - "has" | "missing" | "weak" | undefined
 * @param {boolean} showIcon - Whether to show the type indicator icon (default true)
 */
export default function SkillTag({ skill, type, showIcon = true }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.default;
  const Icon  = style.Icon;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1",
        "rounded-full text-xs font-medium border",
        "transition-transform duration-150 hover:scale-105",
        style.classes,
      ].join(" ")}
    >
      {/* Small icon indicates skill status at a glance */}
      {showIcon && <Icon size={10} className="flex-shrink-0" />}
      {skill}
    </span>
  );
}
