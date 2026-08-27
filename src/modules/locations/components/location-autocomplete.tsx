"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import type { LocationSearchResult } from "../types";

type LocationAutocompleteProps = {
  id: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect?: (location: LocationSearchResult) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  "aria-required"?: boolean | "true" | "false";
};

type SearchState = "idle" | "loading" | "success" | "error";

export function LocationAutocomplete({
  id,
  name,
  value,
  onChange,
  onLocationSelect,
  placeholder,
  className,
  required,
  "aria-required": ariaRequired,
}: LocationAutocompleteProps) {
  const listboxId = useId();
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const skipNextSearch = useRef(false);
  const lastRequestedQuery = useRef("");

  useEffect(() => {
    const query = value.trim();
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      setResults([]);
      setSearchState("idle");
      return;
    }
    if (query.length < 2) {
      lastRequestedQuery.current = "";
      setResults([]);
      setSearchState("idle");
      return;
    }
    if (query === lastRequestedQuery.current) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      lastRequestedQuery.current = query;
      setSearchState("loading");
      try {
        const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error("Location search failed");
        }
        const payload: unknown = await response.json();
        const data =
          typeof payload === "object" &&
          payload !== null &&
          "data" in payload &&
          typeof payload.data === "object" &&
          payload.data !== null &&
          "results" in payload.data &&
          Array.isArray(payload.data.results)
            ? payload.data.results
            : [];
        setResults(data as LocationSearchResult[]);
        setActiveIndex(-1);
        setSearchState("success");
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchState("error");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const showMenu =
    focused &&
    value.trim().length >= 2 &&
    (searchState === "loading" ||
      searchState === "error" ||
      searchState === "success");

  function selectLocation(location: LocationSearchResult) {
    skipNextSearch.current = true;
    setResults([]);
    setSearchState("idle");
    setFocused(false);
    setActiveIndex(-1);
    onLocationSelect?.(location);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showMenu) {
      if (event.key === "Escape") {
        setFocused(false);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectLocation(results[activeIndex]!);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setFocused(false);
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showMenu}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 100)}
        onKeyDown={handleKeyDown}
        required={required}
        aria-required={ariaRequired}
        placeholder={placeholder}
        className={className}
        autoComplete="street-address"
      />
      {showMenu ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] p-1 shadow-lg"
        >
          {searchState === "loading" ? (
            <p className="px-3 py-3 text-sm text-[color:var(--shop-ink-muted)]" aria-live="polite">
              Loading address suggestions…
            </p>
          ) : null}
          {searchState === "error" ? (
            <p className="px-3 py-3 text-sm text-[color:var(--shop-ink-muted)]" aria-live="polite">
              Couldn&apos;t load address suggestions. You can continue entering the address
              manually.
            </p>
          ) : null}
          {searchState === "success" && results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[color:var(--shop-ink-muted)]">No results found.</p>
          ) : null}
          {results.map((result, index) => (
            <button
              key={`${result.id}-${index}`}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className="flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-[color:var(--shop-line)]/40 focus:bg-[color:var(--shop-line)]/40 focus:outline-none"
              onPointerDown={(event) => event.preventDefault()}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectLocation(result)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {result.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
