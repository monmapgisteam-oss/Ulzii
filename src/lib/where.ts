/**
 * ArcGIS WHERE илэрхийлэл үүсгэгч.
 * Шүүлтүүрийг клиент талд биш, өгөгдлийн сан (FeatureServer) талд хэрэглэх
 * зарчмыг баримтална.
 */

export type Filters = {
  biome: string[];
  treatment: string[];
  soumname: string[];
  bag: string[];
  id: string[];
  recorder: string[];
  livestock: string[];
  /** Бичиглэл / шугам-цэгийн хүснэгтэд хэрэглэх зүйлийн шүүлтүүр */
  species: string[];
  /** Судалгаа хийсэн он */
  year: string[];
  /** Судалгаа хийсэн сар */
  month: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  elevationMin?: number | null;
  elevationMax?: number | null;
  /** Газрын зураг дээрээс сонгосон талбайн objectid */
  objectids: number[];
  /** Чөлөөт текстээр хайх (талбайн код, сум, тайлбар) */
  search?: string | null;
};

export const EMPTY_FILTERS: Filters = {
  biome: [],
  treatment: [],
  soumname: [],
  bag: [],
  id: [],
  recorder: [],
  livestock: [],
  species: [],
  year: [],
  month: [],
  dateFrom: null,
  dateTo: null,
  elevationMin: null,
  elevationMax: null,
  objectids: [],
  search: null,
};

export function lit(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function inClause(field: string, values: string[]): string | null {
  if (!values.length) return null;
  return `${field} IN (${values.map(lit).join(",")})`;
}

/** Судалгааны талбайн (survey) давхаргад хэрэглэх WHERE */
export function buildSurveyWhere(f: Partial<Filters>): string {
  const parts: string[] = [];
  const push = (c: string | null) => {
    if (c) parts.push(c);
  };

  push(inClause("biome", f.biome ?? []));
  push(inClause("treatment", f.treatment ?? []));
  push(inClause("soumname", f.soumname ?? []));
  push(inClause("bag", f.bag ?? []));
  push(inClause("id", f.id ?? []));
  push(inClause("recorder", f.recorder ?? []));
  push(inClause("livestock", f.livestock ?? []));

  const nums = (values: string[]) =>
    values.map((v) => Number(v)).filter((n) => Number.isFinite(n));

  if (f.year?.length) {
    const ys = nums(f.year);
    if (ys.length) parts.push(`EXTRACT(YEAR FROM date) IN (${ys.join(",")})`);
  }
  if (f.month?.length) {
    const ms = nums(f.month);
    if (ms.length) parts.push(`EXTRACT(MONTH FROM date) IN (${ms.join(",")})`);
  }

  if (f.dateFrom) parts.push(`date >= timestamp '${f.dateFrom} 00:00:00'`);
  if (f.dateTo) parts.push(`date <= timestamp '${f.dateTo} 23:59:59'`);
  if (typeof f.elevationMin === "number") parts.push(`elevation >= ${Math.round(f.elevationMin)}`);
  if (typeof f.elevationMax === "number") parts.push(`elevation <= ${Math.round(f.elevationMax)}`);

  if (f.objectids && f.objectids.length) {
    parts.push(`objectid IN (${f.objectids.map((n) => Number(n)).filter(Number.isFinite).join(",")})`);
  }

  if (f.search && f.search.trim()) {
    const s = f.search.trim().replace(/'/g, "''");
    parts.push(
      `(area_id LIKE '%${s}%' OR soumname LIKE '%${s}%' OR id LIKE '%${s}%' OR comments LIKE '%${s}%')`,
    );
  }

  return parts.length ? parts.join(" AND ") : "1=1";
}

/** GlobalID-уудыг багцлан IN (...) илэрхийлэл болгоно */
export function chunkedIn(field: string, ids: string[], size = 150): string[] {
  const out: string[] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(`${field} IN (${ids.slice(i, i + size).map(lit).join(",")})`);
  }
  return out;
}
