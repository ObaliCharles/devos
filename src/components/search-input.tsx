"use client";

import { Search, X } from "lucide-react";
import { forwardRef } from "react";

/**
 * The one search box for the whole product.
 *
 * Before this there were three: a `.input` with an absolutely-positioned
 * magnifier, a GET-form field, and a couple of bespoke ones — all slightly
 * different heights, paddings and icon offsets. Every controlled search now
 * renders this, so a search field looks and behaves the same everywhere:
 * leading magnifier, a clear button that appears once there is text, Escape to
 * clear, and the shared `.search` surface with its focus ring.
 */
export const SearchInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** A keyboard hint chip on the right, e.g. "⌘K". */
    shortcut?: string;
    className?: string;
    autoFocus?: boolean;
    "aria-label"?: string;
  }
>(function SearchInput(
  { value, onChange, placeholder = "Search…", shortcut, className = "", autoFocus, ...rest },
  ref,
) {
  return (
    <div className={`search ${className}`} role="search">
      <Search size={15} className="shrink-0" style={{ color: "var(--text-faint)" }} aria-hidden />
      <input
        ref={ref}
        type="search"
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={rest["aria-label"] ?? placeholder}
        autoFocus={autoFocus}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="btn-icon btn-icon-sm -mr-1 h-6 w-6 shrink-0"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      ) : shortcut ? (
        <kbd className="shrink-0">{shortcut}</kbd>
      ) : null}
    </div>
  );
});
