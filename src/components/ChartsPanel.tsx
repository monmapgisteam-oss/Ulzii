"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataBundle } from "@/lib/types";
import { byCategory, coverStructure, topSpecies } from "@/lib/metrics";
import { codeLabelShort } from "@/lib/terms";
import { Filters } from "@/lib/where";
import { ProjectSchema } from "@/lib/projects";
import { FieldLabeler, fieldLabel } from "@/lib/terms";

type Props = {
  bundle: DataBundle;
  schema: ProjectSchema;
  /** Талбарын нэршил (ArcGIS alias) */
  fieldName?: FieldLabeler;
  filters: Filters;
  scopeLabel?: string | null;
  onToggle: (field: keyof Filters, code: string) => void;
};

const COVER_COLORS: Record<string, string> = {
  plant: "#43d18a",
  Litter: "#e6b455",
  "Bare ground": "#5c7484",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Post rehab": "#43d18a",
  Control: "#e6b455",
  "Desert steppe": "#43d18a",
  "Semi Desert": "#58b6e8",
  "True Desert": "#e6b455",
};

const AXIS = { fill: "#61798a", fontSize: 9 };

function Box({
  title,
  hint,
  right,
  wide,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  /** Хоёр баганыг бүтнээр эзлэх эсэх */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`chart-card${wide ? " wide" : ""}`}>
      <div className="chart-head">
        <h3 title={title}>{title}</h3>
        {right ?? (hint ? <span className="hint">{hint}</span> : null)}
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

function Tip({ active, payload, valueLabel = "Тоо хэмжээ", unit }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tooltip-box">
      <div className="t-name">{p.name}</div>
      <div className="t-row">
        <span>{valueLabel}</span>
        <span>
          {typeof p.value === "number" ? p.value.toLocaleString("mn-MN") : p.value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      {typeof p.pct === "number" && (
        <div className="t-row">
          <span>Эзлэх хувь</span>
          <span>{p.pct.toFixed(1)}%</span>
        </div>
      )}
      {typeof p.plots === "number" && (
        <div className="t-row">
          <span>Талбайн тоо</span>
          <span>{p.plots}</span>
        </div>
      )}
      {typeof p.richness === "number" && (
        <div className="t-row">
          <span>Зүйлийн баялаг (10 мин)</span>
          <span>{p.richness.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

/** Серийн графикийн тайлбар — багана ба шугамын утгыг хамтад нь харуулна */
function CategoryTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tooltip-box">
      <div className="t-name">{p.name}</div>
      <div className="t-row">
        <span>Талбайн тоо</span>
        <span>{p.plots}</span>
      </div>
      <div className="t-row">
        <span>Ургамлан бүрхэц</span>
        <span>{p.coverPct.toFixed(1)}%</span>
      </div>
      <div className="t-row">
        <span>Зүйлийн баялаг (10 мин)</span>
        <span>{p.richness.toFixed(1)} зүйл/талбай</span>
      </div>
      <div className="t-row">
        <span>Бүртгэгдсэн зүйл (10 мин)</span>
        <span>{p.species}</span>
      </div>
      <div className="t-row">
        <span>LP data, цэг</span>
        <span>{p.points.toLocaleString("mn-MN")}</span>
      </div>
    </div>
  );
}

export default function ChartsPanel({
  bundle,
  schema,
  fieldName = fieldLabel,
  filters,
  scopeLabel,
  onToggle,
}: Props) {
  const [alt, setAlt] = useState(false);
  const cat = alt ? schema.categoryAlt : schema.category;
  const groupBy = cat.field;
  const catLabel = fieldName(cat.field);

  const cover = useMemo(() => coverStructure(bundle.stats.lpSpecies), [bundle.stats.lpSpecies]);
  const species = useMemo(() => topSpecies(bundle.stats.lpSpecies, 10), [bundle.stats.lpSpecies]);
  const categories = useMemo(() => byCategory(bundle, groupBy), [bundle, groupBy]);

  const dim = (selected: string[], key: string) => (selected.length && !selected.includes(key) ? 0.3 : 1);
  const hasCover = cover.some((c) => c.value > 0);

  return (
    <section className="panel area-charts">
      <div className="panel-head">
        <div className="panel-title">Шинжилгээний график</div>
        {scopeLabel ? (
          <span className="chip">{scopeLabel}</span>
        ) : (
          <span className="hint muted" style={{ fontSize: 9.5 }}>
            Багана дээр дарж шүүлтүүр хэрэглэнэ
          </span>
        )}
      </div>
      <div className="panel-body">
        <div className="charts-grid">
          {/* 1 — Ургамлан нөмрөгийн бүтэц (шугам-цэгийн хэмжилтээр) */}
          <Box title="Ургамлан нөмрөгийн бүтэц, %" hint="LP data">
            {hasCover ? (
              <div style={{ display: "flex", height: "100%", alignItems: "center" }}>
                <div style={{ flex: "0 0 46%", height: "100%", minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
                      <Pie
                        data={cover}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="86%"
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {cover.map((c) => (
                          <Cell key={c.key} fill={COVER_COLORS[c.key]} />
                        ))}
                      </Pie>
                      <Tooltip content={<Tip valueLabel="Цэгийн тоо" />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, paddingRight: 8 }}>
                  {cover.map((c) => (
                    <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5 }}>
                      <span className="dot" style={{ background: COVER_COLORS[c.key], border: 0 }} />
                      <span style={{ color: "var(--muted)", flex: 1 }}>{c.name}</span>
                      <b style={{ fontVariantNumeric: "tabular-nums" }}>{c.pct.toFixed(1)}%</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty">Хэмжилтийн бүртгэл алга</div>
            )}
          </Box>

          {/* 2 — Серийн график: талбайн тоо (багана) + ургамлан бүрхэц (шугам) */}
          <Box
            title={`${catLabel}: талбайн тоо ба бүрхэц`}
            right={
              <div className="seg">
                <button className={!alt ? "on" : ""} onClick={() => setAlt(false)}>
                  {fieldName(schema.category.field)}
                </button>
                <button className={alt ? "on" : ""} onClick={() => setAlt(true)}>
                  {fieldName(schema.categoryAlt.field)}
                </button>
              </div>
            }
          >
            {categories.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={categories.map((c) => ({ ...c, coverValue: Number(c.coverPct.toFixed(1)) }))}
                  margin={{ top: 6, right: 0, bottom: 2, left: -12 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={AXIS}
                    tickLine={false}
                    axisLine={{ stroke: "#22323e" }}
                    interval={0}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={AXIS}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={AXIS}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    /* Шугам багануудтай давхцахгүйн тулд дээд хязгаарт нөөц үлдээв */
                    domain={[0, (max: number) => Math.max(5, Math.ceil((max * 2.2) / 5) * 5)]}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<CategoryTip />} />
                  <Legend
                    verticalAlign="top"
                    align="left"
                    height={14}
                    iconSize={7}
                    wrapperStyle={{ fontSize: 9, color: "#8ea6b5", paddingLeft: 30 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="plots"
                    name="Талбайн тоо"
                    radius={[3, 3, 0, 0]}
                    barSize={categories.length <= 2 ? 46 : categories.length <= 4 ? 34 : 22}
                    isAnimationActive={false}
                    onClick={(d: any) => onToggle(groupBy as keyof Filters, d.key)}
                    cursor="pointer"
                  >
                    {categories.map((c) => (
                      <Cell
                        key={c.key}
                        fill={CATEGORY_COLORS[c.key] ?? "#58b6e8"}
                        fillOpacity={dim((filters[groupBy as keyof Filters] as string[]) ?? [], c.key)}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="coverValue"
                    name="Ургамлан бүрхэц, %"
                    stroke="#58b6e8"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#58b6e8", stroke: "#0f181f", strokeWidth: 1.5 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">Өгөгдөл алга</div>
            )}
          </Box>

          {/* 3 — Зонхилох ургамлын зүйл (доод мөрийг бүтнээр эзэлнэ) */}
          <Box title="Зонхилох ургамлын зүйл (ТОП-10)" hint="LP data давтамжаар" wide>
            {species.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={species}
                  layout="vertical"
                  margin={{ top: 2, right: 26, bottom: 2, left: 0 }}
                  barCategoryGap="18%"
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ ...AXIS, fontSize: 8.5, fontStyle: "italic" }}
                    tickLine={false}
                    axisLine={false}
                    width={116}
                  />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<Tip valueLabel="Таарсан цэг" />} />
                  <Bar
                    dataKey="value"
                    radius={[0, 3, 3, 0]}
                    isAnimationActive={false}
                    onClick={(d: any) => onToggle("species", d.key)}
                    cursor="pointer"
                  >
                    {species.map((s, i) => (
                      <Cell
                        key={s.key}
                        fill={`hsl(${152 - i * 4} 58% ${58 - i * 3}%)`}
                        fillOpacity={dim(filters.species, s.key)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">Зүйлийн бүртгэл алга</div>
            )}
          </Box>

        </div>
      </div>
    </section>
  );
}

export { codeLabelShort };
