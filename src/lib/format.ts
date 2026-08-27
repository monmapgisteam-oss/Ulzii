import { codeLabel } from "./terms";

const DATE_FIELDS = new Set(["date", "CreationDate", "EditDate"]);
const CODED_FIELDS = new Set(["biome", "treatment", "livestock", "species", "speciesLP"]);
const NUMERIC_FIELDS = new Set(["objectid", "elevation", "zai", "line_2"]);

export function fmtDate(value: unknown, withTime = false): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = new Date(Number(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n: number) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  return withTime ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base;
}

export function fmtNum(value: unknown, digits = 0): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("mn-MN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Хүснэгтэд харуулах утгыг албан ёсны нэршилд буулгаж форматлана */
export function fmtCell(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (DATE_FIELDS.has(field)) return fmtDate(value, field !== "date");
  if (CODED_FIELDS.has(field)) return codeLabel(value);
  if (NUMERIC_FIELDS.has(field)) return fmtNum(value);
  return String(value);
}

export function isNumericField(field: string): boolean {
  return NUMERIC_FIELDS.has(field) || DATE_FIELDS.has(field);
}
