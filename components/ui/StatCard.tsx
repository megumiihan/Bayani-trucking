import type { ReactNode } from "react";

type StatCardAccent = "blue" | "green" | "amber" | "slate";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: StatCardAccent;
  icon: ReactNode;
}

const accentStyles: Record<
  StatCardAccent,
  { ring: string; iconBg: string; iconText: string; value: string }
> = {
  blue: {
    ring: "ring-blue-100",
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
    value: "text-slate-900",
  },
  green: {
    ring: "ring-emerald-100",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    value: "text-emerald-700",
  },
  amber: {
    ring: "ring-amber-100",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    value: "text-amber-700",
  },
  slate: {
    ring: "ring-slate-100",
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    value: "text-slate-900",
  },
};

export default function StatCard({
  label,
  value,
  hint,
  accent = "slate",
  icon,
}: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <div
      className={`card-surface rounded-2xl p-5 ring-1 ring-inset ${styles.ring}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p
            className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${styles.value}`}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} ${styles.iconText}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
