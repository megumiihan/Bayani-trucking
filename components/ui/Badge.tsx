interface BadgeProps {
  label: string;
  className?: string;
}

export default function Badge({ label, className = "bg-slate-100 text-slate-700" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5 ${className}`}
    >
      {label}
    </span>
  );
}
