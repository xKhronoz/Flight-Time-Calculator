"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import Spinner from "@/components/Spinner";

type Airport = {
  iata: string;
  name?: string;
  city?: string;
  country?: string;
  timezone?: string;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (airport: Airport) => void;
  placeholder?: string;
  forceInvalid?: boolean;
  take?: number;
};

export default function IataInput({
  value,
  onChange,
  onSelect,
  placeholder,
  forceInvalid = false,
  take = 8,
}: Props) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cache = useRef(new Map<string, Airport[]>());
  const id = useId();
  const errorId = `${id}-iata-error`;
  const [showError, setShowError] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // trigger a tiny delay so opacity transition runs on mount when error appears
    if (forceInvalid && interacted) {
      const t = setTimeout(() => setShowError(true), 10);
      return () => clearTimeout(t);
    }
    setShowError(false);
  }, [forceInvalid, interacted]);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const q = (query || "").trim();
      if (!q) {
        setResults([]);
        setLoading(false);
        return;
      }

      if (cache.current.has(q)) {
        const cached = cache.current.get(q) || [];
        setResults(cached);
        setLoading(false);
        if (interacted) setOpen(true);
        return;
      }

      try {
        const r = await fetch(
          `/api/airports?q=${encodeURIComponent(q)}&take=${take}`
        );
        if (!r.ok) throw new Error("fetch failed");
        let data = (await r.json()) as Airport[];

        // Prioritize IATA matches: airports whose IATA starts with the query should come first
        // If user typed a 3-letter IATA, try to include exact airport first
        if (data && data.length > 0) {
          const qi = q.toLowerCase();
          data.sort((a, b) => {
            const aStarts = (a.iata || "").toLowerCase().startsWith(qi) ? 0 : 1;
            const bStarts = (b.iata || "").toLowerCase().startsWith(qi) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            return (a.iata || "").localeCompare(b.iata || "");
          });
        }

        // For short queries (<=3 chars) also fetch IATA-specific matches and merge them
        if (q.length <= 3) {
          try {
            const iR = await fetch(
              `/api/airports/iata?q=${encodeURIComponent(q)}&take=${take}`
            );
            if (iR.ok) {
              const iData = (await iR.json()) as Airport[];
              // prepend iata matches that aren't already present
              const iatas = new Set(data.map((d) => d.iata));
              const toAdd = iData.filter((d) => !iatas.has(d.iata));
              if (toAdd.length) data = [...toAdd, ...data];
            }
          } catch (e) {
            // ignore iata fetch failures
          }
        }

        if (q.length === 3) {
          try {
            const exactR = await fetch(
              `/api/airports/${encodeURIComponent(q.toUpperCase())}`
            );
            if (exactR.ok) {
              const exact = (await exactR.json()) as
                | Airport
                | { error?: string };
              if ((exact as Airport).iata) {
                const ex = exact as Airport;
                const exists = data.find((d) => d.iata === ex.iata);
                if (!exists) data = [ex, ...data];
                else
                  data = [
                    exists,
                    ...data.filter((d) => d.iata !== exists.iata),
                  ];
              }
            }
          } catch (err) {
            // ignore
          }
        }

        cache.current.set(q, data || []);
        setResults(data || []);
        if (interacted) setOpen(true);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function selectItem(i: number) {
    const item = results[i];
    if (!item) return;
    setQuery(item.iata || "");
    onChange(item.iata || "");
    if (onSelect) onSelect(item);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setActiveIdx(0);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((s) => Math.min((results.length || 1) - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < results.length) {
        e.preventDefault();
        selectItem(activeIdx);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (activeIdx < 0) return;
    if (activeIdx >= results.length) setActiveIdx(results.length - 1);
  }, [results, activeIdx]);

  function highlightMatch(text: string | undefined, q: string) {
    if (!text) return null;
    if (!q) return text;
    const qi = q.toLowerCase();
    const ti = text.toLowerCase();
    const idx = ti.indexOf(qi);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + qi.length);
    const after = text.slice(idx + qi.length);
    return (
      <>
        {before}
        <span className="bg-yellow-200/60 dark:bg-yellow-600/30 rounded-sm px-0.5">
          {match}
        </span>
        {after}
      </>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          className={`w-full rounded-xl dark:bg-slate-800 px-3 py-2 ${
            forceInvalid ? "border border-rose-500" : "border border-slate-700"
          }`}
          placeholder={placeholder}
          value={query}
          aria-invalid={
            (forceInvalid || (focused && query.trim() === "")) && interacted
          }
          aria-describedby={
            (forceInvalid || (focused && query.trim() === "")) && interacted
              ? errorId
              : undefined
          }
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setQuery(v);
            onChange(v);
            setActiveIdx(-1);
            setInteracted(true);
          }}
          onFocus={() => {
            setFocused(true);
            if (results.length) setOpen(true);
            setInteracted(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
        />

        <div
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {loading && <Spinner className="h-4 w-4" />}
        </div>

        {/* validation hint with fade-in animation and small icon (absolutely positioned to avoid layout shift) */}
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className={`absolute left-0 top-full mt-1 z-20 text-xs text-rose-500 flex items-center gap-2 transition-opacity duration-200 ease-out ${
            showError ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-rose-500"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>IATA code required</span>
        </p>
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-72 overflow-auto">
          {results.map((r, i) => (
            <li
              key={r.iata}
              className={`px-3 py-2 cursor-pointer flex justify-between items-center ${
                i === activeIdx
                  ? "bg-slate-100 dark:bg-slate-700"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              onMouseDown={(ev) => {
                ev.preventDefault();
                selectItem(i);
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <div>
                <div className="font-medium">
                  <span className="mr-2">{highlightMatch(r.iata, query)}</span>—{" "}
                  <span className="ml-2">{highlightMatch(r.name, query)}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {highlightMatch(r.city, query)}
                  {r.country ? `, ${r.country}` : ""}
                </div>
              </div>
              <div className="text-xs text-slate-400">{r.timezone}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
