"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@arcgis/core/assets/esri/themes/dark/main.css";
import { SurveyRow } from "@/lib/types";
import { FieldLabeler, codeLabel, codeLabelShort, fieldLabel } from "@/lib/terms";
import { fmtDate, fmtNum } from "@/lib/format";
import { ProjectSchema } from "@/lib/projects";

type CoverInfo = { pct: number; richness: number; points: number };

type Props = {
  rows: SurveyRow[];
  schema: ProjectSchema;
  /** Талбарын нэршил (ArcGIS alias) */
  fieldName?: FieldLabeler;
  covers: Map<number, CoverInfo>;
  selected: number | null;
  loading: boolean;
  where: string;
  notice?: string | null;
  onSelect: (objectid: number | null) => void;
};

/** Ангиллын утгын өнгө — мэдэгдэж буй утгад тогтмол, бусдад ээлжлэн */
const CATEGORY_COLOR: Record<string, string> = {
  "Post rehab": "#43d18a",
  Control: "#e6b455",
  "Desert steppe": "#43d18a",
  "Semi Desert": "#58b6e8",
  "True Desert": "#e6b455",
};

const PALETTE = ["#43d18a", "#58b6e8", "#e6b455", "#a98ede", "#e28f6d", "#6fd1c4", "#c9d15c"];

function categoryColor(value: string, index: number): string {
  return CATEGORY_COLOR[value] ?? PALETTE[Math.max(0, index) % PALETTE.length];
}

/** Ургамлан бүрхэцийн ангилал (тэмдэглэгээний өнгө) */
const COVER_CLASSES = [
  { max: 5, color: "#a8503f", label: "0–5%" },
  { max: 10, color: "#d1873f", label: "5–10%" },
  { max: 20, color: "#dcc24c", label: "10–20%" },
  { max: 30, color: "#8ac95c", label: "20–30%" },
  { max: Infinity, color: "#43d18a", label: "30%-иас дээш" },
];

function coverColor(pct: number): string {
  return (COVER_CLASSES.find((c) => pct < c.max) ?? COVER_CLASSES[COVER_CLASSES.length - 1]).color;
}

/**
 * Esri-ийн суурь зураглалын сан (basemap gallery).
 * Түлхүүр (API key) шаардахгүй, нийтэд нээлттэй үйлчилгээнүүд.
 */
const GALLERY_BASEMAPS: { id: string; title: string }[] = [
  { id: "satellite", title: "Хиймэл дагуулын зураг" },
  { id: "hybrid", title: "Хиймэл дагуул + нэршил" },
  { id: "topo", title: "Байр зүйн зураглал" },
  { id: "streets", title: "Гудамж, замын сүлжээ" },
  { id: "dark-gray", title: "Хар саарал зураглал" },
  { id: "gray", title: "Цайвар саарал зураглал" },
  { id: "terrain", title: "Газрын гадаргын хэлбэр" },
  { id: "oceans", title: "Далай, усны сан" },
  { id: "osm", title: "OpenStreetMap" },
];

function popupContent(
  r: SurveyRow,
  schema: ProjectSchema,
  fieldName: FieldLabeler,
  cover?: CoverInfo,
): string {
  const line = (label: string, value: string) =>
    `<div class="popup-row"><span>${label}</span><span>${value}</span></div>`;

  const valueOf = (f: string) => {
    if (f === "date") return fmtDate(r.date);
    if (f === "elevation") return r.elevation ? `${fmtNum(r.elevation)} м` : "—";
    return codeLabel(r[f]);
  };

  return [
    ...schema.popupFields.map((f) => line(fieldName(f), valueOf(f))),
    cover ? line("Ургамлан бүрхэц (LP)", `${cover.pct.toFixed(1)}% (${fmtNum(cover.points)} цэг)`) : "",
    cover ? line("Зүйлийн баялаг (10 мин)", `${fmtNum(cover.richness)} зүйл`) : "",
    line(fieldName("livestock"), codeLabel(r.livestock)),
    line(fieldName("recorder"), String(r.recorder ?? "—")),
  ]
    .filter(Boolean)
    .join("");
}

export default function MapPanel({
  rows,
  schema,
  fieldName = fieldLabel,
  covers,
  selected,
  loading,
  where,
  notice,
  onSelect,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const labelLayerRef = useRef<any>(null);
  const modulesRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [symbology, setSymbology] = useState<"category" | "cover">("category");
  const [labelsOn, setLabelsOn] = useState(true);
  const [ready, setReady] = useState(false);

  /**
   * Зөв координаттай бичлэг.
   * Зарим талбайн байршил 0,0 гэж бүртгэгдсэн байдаг тул зурагт харуулахгүй.
   */
  const points = useMemo(
    () =>
      rows.filter(
        (r) =>
          Number.isFinite(r.__lat) &&
          Number.isFinite(r.__lon) &&
          !(Math.abs(Number(r.__lat)) < 0.001 && Math.abs(Number(r.__lon)) < 0.001),
      ),
    [rows],
  );

  const missingCoords = rows.length - points.length;
  const signature = useMemo(() => points.map((p) => p.objectid).join(","), [points]);

  /** Ангиллын утгууд — өнгө оноох дараалал */
  const categoryValues = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(String(r[schema.category.field] ?? "—")));
    return Array.from(set).sort();
  }, [rows, schema]);

  const symbolFor = (r: SurveyRow, isSelected: boolean) => {
    const cover = covers.get(r.objectid);
    let color: string;
    let size: number;

    if (symbology === "cover") {
      const pct = cover?.pct ?? 0;
      color = cover ? coverColor(pct) : "#5c7484";
      size = cover ? Math.min(18, 8 + pct / 3) : 8;
    } else {
      const v = String(r[schema.category.field] ?? "—");
      color = categoryColor(v, categoryValues.indexOf(v));
      size = 9;
    }

    return {
      type: "simple-marker",
      style: "circle",
      color,
      size: isSelected ? size + 7 : size,
      outline: {
        color: isSelected ? "#ffffff" : "rgba(255,255,255,0.75)",
        width: isSelected ? 2.5 : 1,
      },
    } as any;
  };

  // Газрын зургийг (ArcGIS Maps SDK for JavaScript) үүсгэх
  useEffect(() => {
    let destroyed = false;

    (async () => {
      const [
        { default: EsriMap },
        { default: MapView },
        { default: GraphicsLayer },
        { default: Basemap },
        { default: BasemapGallery },
        { default: LocalBasemapsSource },
        { default: Expand },
        { default: Graphic },
        { default: Point },
      ] = await Promise.all([
        import("@arcgis/core/Map"),
        import("@arcgis/core/views/MapView"),
        import("@arcgis/core/layers/GraphicsLayer"),
        import("@arcgis/core/Basemap"),
        import("@arcgis/core/widgets/BasemapGallery"),
        import("@arcgis/core/widgets/BasemapGallery/support/LocalBasemapsSource"),
        import("@arcgis/core/widgets/Expand"),
        import("@arcgis/core/Graphic"),
        import("@arcgis/core/geometry/Point"),
      ]);

      if (destroyed || !hostRef.current || viewRef.current) return;

      const layer = new GraphicsLayer({ title: "Судалгааны талбай" });
      const labelLayer = new GraphicsLayer({ title: "Plot ID шошго" });
      const map = new EsriMap({ basemap: "satellite", layers: [layer, labelLayer] });

      const view = new MapView({
        container: hostRef.current,
        map,
        center: [104.5, 45.2],
        zoom: 5,
        ui: { components: ["zoom"] },
      });

      // Esri-ийн суурь зураглалын сан
      const gallery = new BasemapGallery({
        view,
        source: new LocalBasemapsSource({
          basemaps: GALLERY_BASEMAPS.map((b) => {
            const bm = Basemap.fromId(b.id);
            if (bm) {
              // Ачаалж дуусмагц Esri өөрийн нэрийг тавьдаг тул монгол нэрийг
              // дараа нь дахин оноож өгнө.
              bm.title = b.title;
              bm.when(() => {
                bm.title = b.title;
              }).catch(() => {});
            }
            return bm;
          }).filter((b): b is NonNullable<typeof b> => Boolean(b)),
        }),
      });

      view.ui.add(
        new Expand({
          view,
          content: gallery,
          expandIcon: "basemap",
          expandTooltip: "Суурь зураглалын сан",
          collapseTooltip: "Хаах",
        }),
        "bottom-right",
      );

      // Цэг дээр дарахад талбайг сонгох
      view.on("click", async (event: any) => {
        try {
          const hit = await view.hitTest(event, { include: [layer] });
          const g = hit.results.find(
            (x: any) => x?.type === "graphic" && x.graphic?.attributes?.objectid,
          ) as any;
          onSelectRef.current(g ? g.graphic.attributes.objectid : null);
        } catch {
          /* зураг ачаалагдаж дуусаагүй бол алгасна */
        }
      });

      viewRef.current = view;
      layerRef.current = layer;
      labelLayerRef.current = labelLayer;
      modulesRef.current = { Graphic, Point };
      setReady(true);
    })();

    return () => {
      destroyed = true;
      viewRef.current?.destroy();
      viewRef.current = null;
      layerRef.current = null;
      labelLayerRef.current = null;
    };
  }, []);

  // Судалгааны цэгүүдийг зурах
  useEffect(() => {
    if (!ready || !modulesRef.current) return;
    const { Graphic, Point } = modulesRef.current;
    const layer = layerRef.current;
    const view = viewRef.current;
    if (!layer || !view) return;

    layer.removeAll();
    labelLayerRef.current?.removeAll();

    const geometries = points.map(
      (r) =>
        new Point({
          longitude: Number(r.__lon),
          latitude: Number(r.__lat),
          spatialReference: { wkid: 4326 },
        }),
    );

    points.forEach((r, i) => {
      layer.add(
        new Graphic({
          geometry: geometries[i],
          attributes: { objectid: r.objectid },
          symbol: symbolFor(r, selected === r.objectid),
          popupTemplate: {
            title: `Plot ID ${r.id ?? "—"}`,
            content: popupContent(r, schema, fieldName, covers.get(r.objectid)),
          },
        }),
      );

      // Plot ID шошго
      if (labelLayerRef.current) {
        labelLayerRef.current.add(
          new Graphic({
            geometry: geometries[i],
            symbol: {
              type: "text",
              text: String(r.id ?? ""),
              color: "#ffffff",
              haloColor: "#08111a",
              haloSize: 1.2,
              yoffset: 11,
              font: { size: 9, weight: "bold" },
            } as any,
          }),
        );
      }
    });

    if (geometries.length) {
      view
        .goTo({ target: geometries }, { animate: false })
        .then(() => {
          if (view.zoom > 13) view.zoom = 13;
        })
        .catch(() => {
          /* хэрэглэгч зургийг хөдөлгөсөн үед алгасна */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready, symbology, schema]);

  // Plot ID шошгыг асаах / унтраах
  useEffect(() => {
    if (labelLayerRef.current) labelLayerRef.current.visible = labelsOn;
  }, [labelsOn, ready, signature]);

  // Сонголтыг тодруулах
  useEffect(() => {
    if (!ready) return;
    const layer = layerRef.current;
    const view = viewRef.current;
    if (!layer) return;

    layer.graphics.forEach((g: any) => {
      const row = points.find((p) => p.objectid === g.attributes?.objectid);
      if (row) g.symbol = symbolFor(row, selected === row.objectid);
    });

    if (selected !== null && view) {
      const row = points.find((p) => p.objectid === selected);
      if (row) {
        view.goTo({ center: [Number(row.__lon), Number(row.__lat)] }, { duration: 400 }).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, ready, signature, symbology, covers]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => {
      const k = String(r[schema.category.field] ?? "—");
      c[k] = (c[k] ?? 0) + 1;
    });
    return c;
  }, [rows, schema]);

  const coverCounts = useMemo(() => {
    const c = COVER_CLASSES.map(() => 0);
    rows.forEach((r) => {
      const cov = covers.get(r.objectid);
      if (!cov) return;
      const i = COVER_CLASSES.findIndex((k) => cov.pct < k.max);
      if (i >= 0) c[i]++;
    });
    return c;
  }, [rows, covers]);

  return (
    <section className="panel area-map">
      <div className="panel-head">
        <div className="panel-title">Судалгааны талбайн байршил</div>
        <div className="where-bar mono" title={where}>
          <span>WHERE</span>
          <code>{where}</code>
        </div>
      </div>
      <div className="panel-body">
        <div className="map-root" ref={hostRef} />

        <div className="map-tools">
          <div className="seg" style={{ background: "rgba(12,20,26,0.9)", height: 24 }}>
            <button
              className={symbology === "category" ? "on" : ""}
              onClick={() => setSymbology("category")}
              title={`${fieldName(schema.category.field)} ангиллаар өнгөлөх`}
            >
              {fieldName(schema.category.field)}
            </button>
            <button
              className={symbology === "cover" ? "on" : ""}
              onClick={() => setSymbology("cover")}
              title="Ургамлан бүрхэцээр өнгөлөх"
            >
              Бүрхэц
            </button>
          </div>

          <button
            className={`btn${labelsOn ? " on" : ""}`}
            onClick={() => setLabelsOn((v) => !v)}
            title="Plot ID шошгыг харуулах / нуух"
          >
            Plot ID
          </button>

          {selected !== null && (
            <button className="btn on" onClick={() => onSelect(null)}>
              Сонголт цуцлах
            </button>
          )}
        </div>

        <div className="map-legend">
          <div className="row" style={{ color: "var(--muted-2)", fontSize: 9.5, letterSpacing: "0.04em" }}>
            {symbology === "category"
              ? fieldName(schema.category.field).toUpperCase()
              : "УРГАМЛАН БҮРХЭЦ (LP)"}
          </div>

          {symbology === "category"
            ? categoryValues.map((v, i) => (
                <div className="row" key={v}>
                  <span className="dot" style={{ background: categoryColor(v, i) }} />
                  <span>{codeLabelShort(v)}</span>
                  <span style={{ marginLeft: "auto", color: "var(--muted-2)" }}>{counts[v] ?? 0}</span>
                </div>
              ))
            : COVER_CLASSES.map((c, i) => (
                <div className="row" key={c.label}>
                  <span className="dot" style={{ background: c.color }} />
                  <span>{c.label}</span>
                  <span style={{ marginLeft: "auto", color: "var(--muted-2)" }}>{coverCounts[i]}</span>
                </div>
              ))}

          <div className="row" style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 4 }}>
            <span style={{ color: "var(--muted-2)" }}>Нийт талбай</span>
            <span style={{ marginLeft: "auto" }}>{rows.length}</span>
          </div>
          {missingCoords > 0 && (
            <div className="row" title="Байршил нь 0,0 буюу бүртгэгдээгүй тул зурагт харуулаагүй">
              <span style={{ color: "var(--amber)" }}>Координатгүй</span>
              <span style={{ marginLeft: "auto", color: "var(--amber)" }}>{missingCoords}</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="overlay">
            <div className="box">
              <div className="spinner" />
              Мэдээллийн сангаас өгөгдөл татаж байна…
            </div>
          </div>
        )}
        {!loading && notice && (
          <div className="overlay">
            <div className="box" style={{ lineHeight: 1.6 }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>🔐</div>
              {notice}
            </div>
          </div>
        )}
        {!loading && !notice && !points.length && (
          <div className="empty">Сонгосон шүүлтүүрт тохирох судалгааны талбай олдсонгүй.</div>
        )}
      </div>
    </section>
  );
}
