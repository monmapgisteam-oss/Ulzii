"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  label: string;
  options: string[];
  value: string[];
  counts?: Record<string, number>;
  labeler?: (code: string) => string;
  searchable?: boolean;
  width?: number;
  onChange: (next: string[]) => void;
};

export default function MultiSelect({
  label,
  options,
  value,
  counts,
  labeler = (c) => c,
  searchable = false,
  width = 150,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? options.filter((o) => o.toLowerCase().includes(needle) || labeler(o).toLowerCase().includes(needle))
      : options;
    return list.slice(0, 400);
  }, [options, q, labeler]);

  const toggle = (code: string) => {
    onChange(value.includes(code) ? value.filter((v) => v !== code) : [...value, code]);
  };

  const summary = value.length === 0 ? "Бүгд" : value.length === 1 ? labeler(value[0]) : `${value.length} сонголт`;

  return (
    <div className="multi" ref={ref}>
      <button
        type="button"
        className={`filter-pill${value.length ? " on" : ""}`}
        style={{ minWidth: width }}
        onClick={() => setOpen((o) => !o)}
        title={value.length ? `${label}: ${value.map(labeler).join(", ")}` : `${label}: бүх утга`}
      >
        <span className="pill-label">{label}</span>
        <span className="pill-value">{summary}</span>
        {value.length > 1 && <span className="badge-n">{value.length}</span>}
        <span className="pill-caret" aria-hidden />
      </button>

      {open && (
        <div className="multi-menu">
          {searchable && (
            <input
              className="ctl search"
              placeholder="Хайх…"
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
            />
          )}
          <div
            className="opt"
            style={{ borderBottom: "1px solid var(--line-soft)", borderRadius: 0, marginBottom: 3 }}
            onClick={() => onChange([])}
          >
            <span className="muted">Бүгдийг харуулах (шүүлтгүй)</span>
            <span className="count">{options.length} утга</span>
          </div>
          {shown.map((o) => (
            <label className="opt" key={o} onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  opacity: counts && !counts[o] ? 0.45 : 1,
                }}
              >
                {labeler(o)}
              </span>
              {counts && <span className="count">{(counts[o] ?? 0).toLocaleString("mn-MN")}</span>}
            </label>
          ))}
          {!shown.length && <div className="opt muted">Илэрц олдсонгүй</div>}
        </div>
      )}
    </div>
  );
}
