import { NON_PLANT_CODES } from "./config";
import { codeLabelShort } from "./terms";
import { DataBundle, GroupCount, Row } from "./types";

const NON_PLANT = new Set<string>(NON_PLANT_CODES as unknown as string[]);

export function isPlant(species: unknown): boolean {
  return typeof species === "string" && species !== "" && !NON_PLANT.has(species);
}

/** GlobalID-г харьцуулахад тохирох хэлбэрт шилжүүлнэ ({} хаалт, том/жижиг үсэг) */
export function normGid(value: unknown): string {
  return String(value ?? "")
    .replace(/[{}]/g, "")
    .toUpperCase();
}

export type Slice = { key: string; name: string; value: number; pct: number };

/**
 * Ургамлан нөмрөгийн бүтэц — шугам-цэгийн (line-point intercept) хэмжилтээр.
 * Цэг тус бүрт таарсан зүйлийг ургамал / хагд / нүцгэн хөрс гэж ангилна.
 */
export function coverStructure(lpSpecies: GroupCount[]): Slice[] {
  let plant = 0;
  let bare = 0;
  let litter = 0;
  for (const g of lpSpecies) {
    if (g.key === "Bare ground") bare += g.count;
    else if (g.key === "Litter") litter += g.count;
    else if (isPlant(g.key)) plant += g.count;
  }
  const total = plant + bare + litter;
  const mk = (key: string, name: string, value: number): Slice => ({
    key,
    name,
    value,
    pct: total ? (value / total) * 100 : 0,
  });
  return [
    mk("plant", "Plant cover", plant),
    mk("Litter", "Litter", litter),
    mk("Bare ground", "Bare ground", bare),
  ];
}

/** Талбарын утгаар бүлэглэн тоолох */
export function countBy(rows: Row[], field: string): Slice[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = r[field];
    if (v === null || v === undefined || v === "") continue;
    const k = String(v);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, name: codeLabelShort(key), value, pct: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Зонхилох ургамлын зүйл — шугам-цэгийн хэмжилтэд таарсан давтамжаар.
 * Утгыг ArcGIS-ийн бүлэглэсэн статистикаас авах тул бүх мөрийг татах шаардлагагүй.
 */
export function topSpecies(lpSpecies: GroupCount[], limit = 8): Slice[] {
  const plants = lpSpecies.filter((g) => isPlant(g.key));
  const total = plants.reduce((a, g) => a + g.count, 0);
  return plants
    .map((g) => ({ key: g.key, name: g.key, value: g.count, pct: total ? (g.count / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Талбай бүрт тохиолдсон зүйлийн тоо (зүйлийн баялаг) — бичиглэлийн бүртгэлээр */
export function richnessByPlot(bichiglel: Row[]): Map<string, number> {
  const map = new Map<string, Set<string>>();
  for (const r of bichiglel) {
    if (!isPlant(r.species)) continue;
    const gid = normGid(r.parentglobalid);
    if (!map.has(gid)) map.set(gid, new Set());
    map.get(gid)!.add(String(r.species));
  }
  return new Map(Array.from(map, ([gid, set]) => [gid, set.size]));
}

export type PlotCover = {
  gid: string;
  objectid: number;
  plotId: string;
  total: number;
  plant: number;
  pct: number;
  richness: number;
  /** Судалгааны талбайн бүх шинж (ангиллын талбарыг уншихад) */
  attrs: Row;
};

/** Талбай тус бүрийн ургамлан бүрхэц (LPI цэгийн харьцаагаар) */
export function plotCovers(bundle: DataBundle): PlotCover[] {
  const totals = new Map(bundle.stats.lpPlotTotal.map((g) => [normGid(g.key), g.count]));
  const plants = new Map(bundle.stats.lpPlotPlant.map((g) => [normGid(g.key), g.count]));
  const rich = richnessByPlot(bundle.bichiglel);

  return bundle.survey.map((s) => {
    const gid = normGid(s.globalid);
    const total = totals.get(gid) ?? 0;
    const plant = plants.get(gid) ?? 0;
    return {
      gid,
      objectid: s.objectid,
      plotId: String(s.id ?? s.objectid),
      total,
      plant,
      pct: total ? (plant / total) * 100 : 0,
      richness: rich.get(gid) ?? 0,
      attrs: s,
    };
  });
}

export type CategoryStat = {
  key: string;
  name: string;
  /** Талбайн тоо */
  plots: number;
  /** Шугам-цэгийн нийт хэмжилт */
  points: number;
  /** Ургамлан бүрхэц, % */
  coverPct: number;
  /** Талбайд ногдох дундаж зүйлийн тоо */
  richness: number;
  /** Тухайн бүлэгт бүртгэгдсэн зүйлийн тоо */
  species: number;
};

/**
 * Судалгааны хувилбар эсвэл байгалийн бүсээр нэгтгэсэн үзүүлэлт.
 * Талбайн тоо, ургамлан бүрхэц, зүйлийн баялгийг нэг дор гаргана.
 */
export function byCategory(bundle: DataBundle, field: string): CategoryStat[] {
  const covers = plotCovers(bundle);
  const valueOf = (c: PlotCover) => {
    const v = c.attrs[field];
    return v === null || v === undefined || v === "" ? "—" : String(v);
  };
  const categoryOfPlot = new Map(covers.map((c) => [c.gid, valueOf(c)]));
  const speciesByCategory = new Map<string, Set<string>>();

  for (const r of bundle.bichiglel) {
    if (!isPlant(r.species)) continue;
    const t = categoryOfPlot.get(normGid(r.parentglobalid));
    if (!t) continue;
    if (!speciesByCategory.has(t)) speciesByCategory.set(t, new Set());
    speciesByCategory.get(t)!.add(String(r.species));
  }

  const acc = new Map<string, { plots: number; total: number; plant: number; rich: number[] }>();
  for (const c of covers) {
    const key = valueOf(c);
    if (!acc.has(key)) acc.set(key, { plots: 0, total: 0, plant: 0, rich: [] });
    const a = acc.get(key)!;
    a.plots++;
    a.total += c.total;
    a.plant += c.plant;
    a.rich.push(c.richness);
  }

  return Array.from(acc.entries())
    .map(([key, a]) => ({
      key,
      name: codeLabelShort(key),
      plots: a.plots,
      points: a.total,
      coverPct: a.total ? (a.plant / a.total) * 100 : 0,
      richness: a.rich.length ? a.rich.reduce((x, y) => x + y, 0) / a.rich.length : 0,
      species: speciesByCategory.get(key)?.size ?? 0,
    }))
    .sort((a, b) => b.plots - a.plots);
}

/** Талбайн ургамлан бүрхэцийн тархалт (гистограм) */
export function coverHistogram(bundle: DataBundle): Slice[] {
  const bins = [
    { key: "0–5", lo: 0, hi: 5 },
    { key: "5–10", lo: 5, hi: 10 },
    { key: "10–20", lo: 10, hi: 20 },
    { key: "20–30", lo: 20, hi: 30 },
    { key: "30–50", lo: 30, hi: 50 },
    { key: "50+", lo: 50, hi: Infinity },
  ];
  const covers = plotCovers(bundle).filter((c) => c.total > 0);
  const counts = bins.map(() => 0);
  for (const c of covers) {
    const i = bins.findIndex((b) => c.pct >= b.lo && c.pct < b.hi);
    if (i >= 0) counts[i]++;
  }
  return bins.map((b, i) => ({
    key: b.key,
    name: b.key,
    value: counts[i],
    pct: covers.length ? (counts[i] / covers.length) * 100 : 0,
  }));
}

export type Kpis = {
  plots: number;
  species: number;
  bichiglelRows: number;
  lpPoints: number;
  coverPct: number;
  meanElevation: number | null;
  soums: number;
  meanRichness: number | null;
};

export function kpis(bundle: DataBundle): Kpis {
  const speciesSet = new Set<string>();
  bundle.bichiglel.forEach((r) => isPlant(r.species) && speciesSet.add(String(r.species)));
  bundle.stats.lpSpecies.forEach((g) => isPlant(g.key) && speciesSet.add(g.key));

  const cover = coverStructure(bundle.stats.lpSpecies);
  const elevations = bundle.survey
    .map((s) => Number(s.elevation))
    .filter((n) => Number.isFinite(n) && n > 0);
  const rich = Array.from(richnessByPlot(bundle.bichiglel).values());

  return {
    plots: bundle.survey.length,
    species: speciesSet.size,
    bichiglelRows: bundle.counts.bichiglel,
    lpPoints: bundle.counts.lpdata,
    coverPct: cover[0]?.pct ?? 0,
    meanElevation: elevations.length
      ? Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length)
      : null,
    soums: new Set(bundle.survey.map((s) => s.soumname).filter(Boolean) as string[]).size,
    meanRichness: rich.length ? rich.reduce((a, b) => a + b, 0) / rich.length : null,
  };
}
