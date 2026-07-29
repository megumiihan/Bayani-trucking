"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Type to search…",
  required = false,
  id,
}: SearchableSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filteredOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery(value);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const selectOption = (option: string) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        current < filteredOptions.length - 1 ? current + 1 : current
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => (current > 0 ? current - 1 : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[highlightIndex];
      if (option) selectOption(option);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${inputId}-listbox`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (options.includes(e.target.value)) {
            onChange(e.target.value);
          } else if (value) {
            onChange("");
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />

      {/* Hidden input for native required validation */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          value={value}
          onChange={() => {}}
          required
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}

      {open && (
        <ul
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No matching routes</li>
          ) : (
            filteredOptions.map((option, index) => (
              <li
                key={option}
                role="option"
                aria-selected={value === option}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  index === highlightIndex
                    ? "bg-blue-50 text-blue-800"
                    : value === option
                      ? "bg-gray-50 font-medium text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
