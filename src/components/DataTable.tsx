"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtCell, isNumericField } from "@/lib/format";
import { FieldLabeler, fieldLabel } from "@/lib/terms";
import { Row } from "@/lib/types";

export type SortState = { field: string; dir: "asc" | "desc" } | null;

export type TableState = ReturnType<typeof useTableState>;

type Options = {
  rows: Row[];
  columns: string[];
  storageKey: string;
  defaultHidden?: string[];
  defaultSort?: SortState;
  pageSize?: number;
};

/** Хүснэгтийн төлөв: багана нуух/харуулах, эрэмбэлэх, хуудаслалт */
export function useTableState({
  rows,
  columns,
  storageKey,
  defaultHidden = [],
  defaultSort = null,
  pageSize = 50,
}: Options) {
  const [hidden, setHidden] = useState<string[]>(defaultHidden);
  const [sort, setSort] = useState<SortState>(defaultSort);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize);
  const [loaded, setLoaded] = useState(false);

  // Хэрэглэгчийн сонгосон баганын тохиргоог хөтөч дээр хадгална
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`cols:${storageKey}`);
      if (raw) setHidden(JSON.parse(raw));
    } catch {
      /* тохиргоо унших боломжгүй бол анхны утгаар үлдэнэ */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(`cols:${storageKey}`, JSON.stringify(hidden));
    } catch {
      /* хадгалах боломжгүй бол алгасна */
    }
  }, [hidden, storageKey, loaded]);

  useEffect(() => setPage(0), [rows.length, sort, size]);

  const visible = useMemo(() => columns.filter((c) => !hidden.includes(c)), [columns, hidden]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { field, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      if (av === null || av === undefined || av === "") return 1;
      if (bv === null || bv === undefined || bv === "") return -1;
      if (isNumericField(field)) return (Number(av) - Number(bv)) * mul;
      return String(av).localeCompare(String(bv), "mn") * mul;
    });
  }, [rows, sort]);

  const pageCount = size > 0 ? Math.max(1, Math.ceil(sorted.length / size)) : 1;
  const pageRows = useMemo(
    () => (size > 0 ? sorted.slice(page * size, page * size + size) : sorted),
    [sorted, page, size],
  );

  const toggleSort = (field: string) =>
    setSort((s) =>
      !s || s.field !== field ? { field, dir: "asc" } : s.dir === "asc" ? { field, dir: "desc" } : null,
    );

  return {
    columns,
    hidden,
    setHidden,
    visible,
    sort,
    toggleSort,
    page,
    setPage,
    pageCount,
    size,
    setSize,
    sorted,
    pageRows,
    total: rows.length,
  };
}

/** Багана нуух / харуулах удирдлага */
export function ColumnManager({
  state,
  label = "Багана",
  systemColumns = [],
  fieldName = fieldLabel,
}: {
  state: TableState;
  label?: string;
  systemColumns?: string[];
  fieldName?: FieldLabeler;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const shownCount = state.visible.length;

  return (
    <div className="multi" ref={ref}>
      <button className="btn ghost" onClick={() => setOpen((o) => !o)} title="Хүснэгтийн багана тохируулах">
        ▤ {label}
        <span className="badge-n">
          {shownCount}/{state.columns.length}
        </span>
      </button>
      {open && (
        <div className="multi-menu" style={{ right: 0, left: "auto" }}>
          <div className="opt" style={{ gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn ghost" style={{ height: 22, flex: 1 }} onClick={() => state.setHidden([])}>
              Бүгдийг харуулах
            </button>
            <button
              className="btn ghost"
              style={{ height: 22, flex: 1 }}
              onClick={() => state.setHidden(systemColumns.filter((c) => state.columns.includes(c)))}
              disabled={!systemColumns.length}
            >
              Системийн багана нуух
            </button>
          </div>
          {state.columns.map((c) => (
            <label className="opt" key={c} onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={!state.hidden.includes(c)}
                onChange={() =>
                  state.setHidden(
                    state.hidden.includes(c)
                      ? state.hidden.filter((h) => h !== c)
                      : [...state.hidden, c],
                  )
                }
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fieldName(c)}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Хуудаслалтын удирдлага */
export function TableToolbar({ state }: { state: TableState }) {
  return (
    <div className="pager">
      <select
        className="ctl"
        style={{ height: 22, width: 76 }}
        value={state.size}
        onChange={(e) => state.setSize(Number(e.target.value))}
      >
        <option value={25}>25 мөр</option>
        <option value={50}>50 мөр</option>
        <option value={100}>100 мөр</option>
        <option value={0}>Бүгд</option>
      </select>
      {state.size > 0 && (
        <>
          <button
            className="btn ghost"
            style={{ height: 22, padding: "0 7px" }}
            disabled={state.page === 0}
            onClick={() => state.setPage(state.page - 1)}
          >
            ‹
          </button>
          <span style={{ minWidth: 62, textAlign: "center" }}>
            {state.page + 1} / {state.pageCount}
          </span>
          <button
            className="btn ghost"
            style={{ height: 22, padding: "0 7px" }}
            disabled={state.page + 1 >= state.pageCount}
            onClick={() => state.setPage(state.page + 1)}
          >
            ›
          </button>
        </>
      )}
      <span style={{ marginLeft: 4 }}>
        нийт <b style={{ color: "var(--text)" }}>{state.total.toLocaleString("mn-MN")}</b> бичлэг
      </span>
    </div>
  );
}

/** Хүснэгтийн үндсэн хэсэг */
export function TableGrid({
  state,
  rowKey,
  selectedValue,
  onRowClick,
  fieldName = fieldLabel,
  emptyText = "Бичлэг олдсонгүй.",
}: {
  state: TableState;
  rowKey: string;
  selectedValue?: string | number | null;
  onRowClick?: (row: Row) => void;
  fieldName?: FieldLabeler;
  emptyText?: string;
}) {
  if (!state.total) return <div className="empty">{emptyText}</div>;

  return (
    <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th style={{ width: 34, textAlign: "right" }}>№</th>
            {state.visible.map((c) => (
              <th key={c} onClick={() => state.toggleSort(c)} title={`${fieldName(c)} (${c})`}>
                {fieldName(c)}
                {state.sort?.field === c && (
                  <span className="sort">{state.sort.dir === "asc" ? "▲" : "▼"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.pageRows.map((r, i) => {
            const key = String(r[rowKey] ?? i);
            const selected = selectedValue !== undefined && selectedValue !== null && String(selectedValue) === key;
            return (
              <tr
                key={key}
                className={`${onRowClick ? "clickable" : ""}${selected ? " selected" : ""}`}
                onClick={() => onRowClick?.(r)}
              >
                <td className="num muted">{state.page * (state.size || 0) + i + 1}</td>
                {state.visible.map((c) => (
                  <td key={c} className={isNumericField(c) ? "num" : undefined} title={fmtCell(c, r[c])}>
                    {fmtCell(c, r[c])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
