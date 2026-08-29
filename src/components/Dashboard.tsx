"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterBar from "./FilterBar";
import ChartsPanel from "./ChartsPanel";
import TablesPanel from "./TablesPanel";
import { EMPTY_FILTERS, Filters } from "@/lib/where";
import { DataBundle, GroupCount, PlotChildren, Meta, Row } from "@/lib/types";
import { isPlant, plotCovers } from "@/lib/metrics";
import { PROJECT_SCHEMAS, ProjectKey, schemaOf } from "@/lib/projects";
import { makeFieldLabeler } from "@/lib/terms";

const MapPanel = dynamic(() => import("./MapPanel"), {
  ssr: false,
  loading: () => (
    <section className="panel area-map">
      <div className="panel-head">
        <div className="panel-title">Судалгааны талбайн байршил</div>
      </div>
      <div className="panel-body">
        <div className="empty">Газрын зураг ачаалж байна…</div>
      </div>
    </section>
  ),
});

const EMPTY_BUNDLE: DataBundle = {
  authenticated: false,
  where: { survey: "1=1", bichiglel: "1=1", lpdata: "1=1" },
  counts: { survey: 0, bichiglel: 0, lpdata: 0 },
  truncated: { lpdata: false },
  stats: { lpSpecies: [], lpPlotTotal: [], lpPlotPlant: [] },
  survey: [],
  bichiglel: [],
  lpdata: [],
};

/** Мөрүүдийг талбарын утгаар бүлэглэн тоолох (сонгосон талбайн статистикт) */
function groupCount(rows: Row[], field: string): GroupCount[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = r[field];
    if (v === null || v === undefined || v === "") continue;
    const k = String(v);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
}

export default function Dashboard() {
  const [project, setProject] = useState<ProjectKey>("postRehab");
  const schema = schemaOf(project);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [bundle, setBundle] = useState<DataBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [plotChildren, setPlotChildren] = useState<PlotChildren | null>(null);
  const [plotLoading, setPlotLoading] = useState(false);
  const reqIdRef = useRef(0);

  // Лавлах мэдээлэл (кодчилсон утга, сумын жагсаалт)
  useEffect(() => {
    setMeta(null);
    fetch(`/api/arcgis/meta?project=${project}`)
      .then((r) => r.json())
      .then((m: Meta) => setMeta(m))
      .catch(() => setMeta(null));
  }, [project]);

  // Өгөгдлийг ArcGIS FeatureServer-ээс WHERE илэрхийллээр татах
  const load = useCallback(async (f: Filters, proj: ProjectKey) => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/arcgis/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, project: proj }),
      });
      const json = (await res.json()) as DataBundle;
      if (id !== reqIdRef.current) return;
      if ((json as any).error) setError((json as any).error);
      setBundle({ ...EMPTY_BUNDLE, ...json });
    } catch (e: any) {
      if (id !== reqIdRef.current) return;
      setError(e?.message ?? "Сүлжээний алдаа");
      setBundle(EMPTY_BUNDLE);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(filters, project), 320);
    return () => clearTimeout(t);
  }, [filters, project, load]);

  const patch = useCallback((p: Partial<Filters>) => {
    setSelected(null);
    setFilters((f) => ({ ...f, ...p }));
  }, []);

  const reset = useCallback(() => {
    setSelected(null);
    setFilters(EMPTY_FILTERS);
  }, []);

  /** График дээр дарахад шүүлтүүрийг нэмэх / хасах */
  const toggleValue = useCallback((field: keyof Filters, code: string) => {
    if (!code) return;
    setSelected(null);
    setFilters((f) => {
      const current = (f[field] as string[]) ?? [];
      const next = current.includes(code) ? current.filter((v) => v !== code) : [...current, code];
      return { ...f, [field]: next };
    });
  }, []);

  const selectedRow = useMemo(
    () => bundle.survey.find((s) => s.objectid === selected) ?? null,
    [bundle.survey, selected],
  );

  // Талбай сонгоход тухайн талбайн бүх хүүхэд бичлэгийг тусад нь татна
  // (ерөнхий жагсаалтад шугам-цэгийн хүснэгт хязгаарлагдаж татагддаг).
  const selectedGid = selectedRow?.globalid ? String(selectedRow.globalid) : null;
  useEffect(() => {
    if (!selectedGid) {
      setPlotChildren(null);
      return;
    }
    let cancelled = false;
    setPlotLoading(true);
    fetch(`/api/arcgis/plot?gid=${encodeURIComponent(selectedGid)}&project=${project}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setPlotChildren({ gid: selectedGid, bichiglel: j.bichiglel ?? [], lpdata: j.lpdata ?? [] });
      })
      .catch(() => !cancelled && setPlotChildren(null))
      .finally(() => !cancelled && setPlotLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedGid, project]);

  /** Газрын зураг дээрх сонголтоор графикийг хязгаарлах (ArcGIS-ийн сонголтын зарчим) */
  const viewBundle = useMemo<DataBundle>(() => {
    if (!selectedRow) return bundle;
    const gid = String(selectedRow.globalid ?? "").toUpperCase();
    const child =
      plotChildren && plotChildren.gid === selectedRow.globalid
        ? plotChildren
        : {
            bichiglel: bundle.bichiglel.filter(
              (r) => String(r.parentglobalid ?? "").toUpperCase() === gid,
            ),
            lpdata: bundle.lpdata.filter((r) => String(r.parentglobalid ?? "").toUpperCase() === gid),
          };
    return {
      ...bundle,
      survey: [selectedRow],
      bichiglel: child.bichiglel,
      lpdata: child.lpdata,
      counts: { survey: 1, bichiglel: child.bichiglel.length, lpdata: child.lpdata.length },
      truncated: { lpdata: false },
      stats: {
        lpSpecies: groupCount(child.lpdata, "speciesLP"),
        lpPlotTotal: [{ key: gid, count: child.lpdata.length }],
        lpPlotPlant: [
          { key: gid, count: child.lpdata.filter((r) => isPlant(r.speciesLP)).length },
        ],
      },
    };
  }, [bundle, selectedRow, plotChildren]);

  /**
   * Шүүлтүүрийн сонголт бүрт харгалзах бичлэгийн тоо.
   * Талбайн шинжийг судалгааны талбайн тоогоор, ургамлын зүйлийг
   * шугам-цэгийн хэмжилтийн давтамжаар илэрхийлнэ.
   */
  const optionCounts = useMemo(() => {
    const byField = (field: string) => {
      const m: Record<string, number> = {};
      for (const r of bundle.survey) {
        const v = r[field];
        if (v === null || v === undefined || v === "") continue;
        const k = String(v);
        m[k] = (m[k] ?? 0) + 1;
      }
      return m;
    };
    const species: Record<string, number> = {};
    for (const g of bundle.stats.lpSpecies) species[g.key] = g.count;
    for (const r of bundle.bichiglel) {
      const k = String(r.species ?? "");
      if (k && !(k in species)) species[k] = 0;
    }
    // Он, сарын сонголтын тоог судалгааны огноогоор тооцно
    const year: Record<string, number> = {};
    const month: Record<string, number> = {};
    for (const r of bundle.survey) {
      if (!r.date) continue;
      const d = new Date(Number(r.date));
      const y = String(d.getFullYear());
      const m = String(d.getMonth() + 1);
      year[y] = (year[y] ?? 0) + 1;
      month[m] = (month[m] ?? 0) + 1;
    }

    const out: Record<string, Record<string, number>> = { species, year, month };
    for (const f of schema.filters) {
      if (f.field !== "species") out[f.field] = byField(f.field);
    }
    return out;
  }, [bundle, schema]);

  /** Талбай тус бүрийн бүрхэц — газрын зургийн тэмдэглэгээ, тайлбарт ашиглана */
  const covers = useMemo(() => {
    const m = new Map<number, { pct: number; richness: number; points: number }>();
    for (const c of plotCovers(bundle)) {
      m.set(c.objectid, { pct: c.pct, richness: c.richness, points: c.total });
    }
    return m;
  }, [bundle]);

  /** Талбарын нэршлийг сервисийн alias-аар харуулах */
  const fieldName = useMemo(() => makeFieldLabeler(meta?.aliases), [meta]);

  const authOk = bundle.authenticated || meta?.authenticated;
  const isDemo = Boolean(bundle.demo);
  const notice = loading
    ? null
    : error
      ? error
      : !isDemo && !bundle.survey.length && !authOk
        ? "ArcGIS сервис нэвтрэлт шаардаж байна. Төслийн үндсэн хавтас дахь .env.local файлд ARCGIS_USERNAME / ARCGIS_PASSWORD (эсвэл ARCGIS_TOKEN) утгыг оруулаад серверийг дахин ачаална уу."
        : null;

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <div className="project-switch">
            {(Object.keys(PROJECT_SCHEMAS) as ProjectKey[]).map((k) => (
              <button
                key={k}
                className={`project-tag${project === k ? " on" : ""}`}
                onClick={() => {
                  if (project === k) return;
                  setSelected(null);
                  setFilters(EMPTY_FILTERS);
                  setProject(k);
                }}
                title={`${PROJECT_SCHEMAS[k].name} төслийн мэдээллийн сан`}
              >
                {PROJECT_SCHEMAS[k].name}
              </button>
            ))}
          </div>
        </div>

        <FilterBar
          meta={meta}
          schema={schema}
          filters={filters}
          counts={optionCounts}
          fieldName={fieldName}
          loading={loading}
          onChange={patch}
          onReset={reset}
          onRefresh={() => load(filters, project)}
        />

      </header>

      <div className="content">
        <MapPanel
          rows={bundle.survey}
          schema={schema}
          fieldName={fieldName}
          covers={covers}
          selected={selected}
          loading={loading}
          where={bundle.where.survey}
          notice={notice}
          onSelect={(oid) => setSelected(oid)}
        />

        <ChartsPanel
          bundle={viewBundle}
          schema={schema}
          fieldName={fieldName}
          filters={filters}
          scopeLabel={selectedRow ? `Сонгосон талбай №${selectedRow.id ?? selectedRow.objectid}` : null}
          onToggle={toggleValue}
        />

        <TablesPanel
          bundle={bundle}
          schema={schema}
          fields={meta?.fields}
          fieldName={fieldName}
          plotChildren={plotChildren}
          plotLoading={plotLoading}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
    </main>
  );
}
