"use client";

import { useEffect, useId, useRef, useState } from "react";
import { filterInputClass } from "@/components/ui/formStyles";

export type MultiSelectOption = {
  id: string;
  label: string;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  allLabel?: string;
  "aria-label"?: string;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  allLabel = "All",
  "aria-label": ariaLabel,
}: MultiSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabels = options
    .filter((option) => value.includes(option.id))
    .map((option) => option.label);

  const summary =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((current) => current !== id));
      return;
    }
    onChange([...value, id]);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
        className={`${filterInputClass} relative z-10 flex items-center justify-between gap-2 text-left ${
          open
            ? "rounded-b-none border-b-transparent focus-visible:ring-0"
            : ""
        }`}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 -mt-px max-h-52 w-full overflow-auto overscroll-contain rounded-b-md border border-slate-300 border-t-slate-200 bg-white py-0.5"
        >
          <li>
            <label className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={value.length === 0}
                onChange={() => onChange([])}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus-visible:ring-blue-500/40"
              />
              {allLabel}
            </label>
          </li>
          {options.map((option) => {
            const checked = value.includes(option.id);
            return (
              <li key={option.id} role="option" aria-selected={checked}>
                <label className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(option.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700 focus-visible:ring-blue-500/40"
                  />
                  {option.label}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
