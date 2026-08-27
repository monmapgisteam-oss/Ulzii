"use client";

import { useMemo, useState } from "react";
import { ColumnManager, TableGrid, TableToolbar, useTableState } from "./DataTable";
import { DataBundle, PlotChildren, Row } from "@/lib/types";
import { ProjectSchema } from "@/lib/projects";
import { FieldLabeler, LAYER_SUBTITLE, fieldLabel } from "@/lib/terms";

type TabKey = "survey" | "bichiglel" | "lpdata";

type Props = {
  bundle: DataBundle;
  schema: ProjectSchema;
  /** Талбарын нэршил (ArcGIS alias) */
  fieldName?: FieldLabeler;
  plotChildren: PlotChildren | null;
  plotLoading: boolean;
  selected: number | null;
  onSelect: (objectid: number | null) => void;
};

const SYSTEM_HIDDEN = ["globalid", "parentglobalid", "Creator", "Editor", "CreationDate", "EditDate"];

const TAB_LABEL: Record<TabKey, string> = {
  survey: "Судалгааны талбай",
  bichiglel: "10 минутын бичиглэл",
  lpdata: "LP data",
};

export default function TablesPanel({
  bundle,
  schema,
  fieldName = fieldLabel,
  plotChildren,
  plotLoading,
  selected,
  onSelect,
}: Props) {
  const [tab, setTab] = useState<TabKey>("survey");
  const [scoped, setScoped] = useState(true);

  const selectedRow = useMemo(
    () => bundle.survey.find((s) => s.objectid === selected) ?? null,
    [bundle.survey, selected],
  );
  const parentGid = selectedRow?.globalid ? String(selectedRow.globalid).toUpperCase() : null;

  const childFilter = (rows: Row[]) =>
    scoped && parentGid
      ? rows.filter((r) => String(r.parentglobalid ?? "").toUpperCase() === parentGid)
      : rows;

  /** Сонгосон талбайн бүрэн бичлэг ирсэн бол түүнийг, эс бөгөөс ерөнхий жагсаалтыг ашиглана */
  const plotLoaded = Boolean(
    plotChildren && selectedRow && plotChildren.gid === selectedRow.globalid,
  );

  const bichiglelRows = useMemo(
    () =>
      scoped && plotLoaded ? plotChildren!.bichiglel : childFilter(bundle.bichiglel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bundle.bichiglel, parentGid, scoped, plotChildren, plotLoaded],
  );
  const lpdataRows = useMemo(
    () => (scoped && plotLoaded ? plotChildren!.lpdata : childFilter(bundle.lpdata)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bundle.lpdata, parentGid, scoped, plotChildren, plotLoaded],
  );

  /** Шугам-цэгийн хүснэгт хязгаарлагдаж татагдсан эсэх */
  const lpTruncated = bundle.truncated.lpdata && !(scoped && plotLoaded);

  const surveyState = useTableState({
    rows: bundle.survey,
    columns: schema.survey.columns,
    storageKey: `${schema.key}:survey`,
    defaultHidden: ["globalid", "Creator", "Editor", "CreationDate", "EditDate"],
    defaultSort: { field: "date", dir: "desc" },
  });

  const bichiglelState = useTableState({
    rows: bichiglelRows,
    columns: schema.bichiglel.columns,
    storageKey: `${schema.key}:bichiglel`,
    defaultHidden: schema.bichiglel.hidden,
    defaultSort: { field: "objectid", dir: "asc" },
  });

  const lpdataState = useTableState({
    rows: lpdataRows,
    columns: schema.lpdata.columns,
    storageKey: `${schema.key}:lpdata`,
    defaultHidden: schema.lpdata.hidden,
    defaultSort: { field: "objectid", dir: "asc" },
  });

  const state = tab === "survey" ? surveyState : tab === "bichiglel" ? bichiglelState : lpdataState;
  return (
    <section className="panel area-tables">
      <div className="panel-head" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="tabs">
          {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => (
            <button
              key={k}
              className={`tab${tab === k ? " active" : ""}`}
              onClick={() => setTab(k)}
              title={LAYER_SUBTITLE[k]}
            >
              {TAB_LABEL[k]}
              <span className="n">
                {(k === "survey"
                  ? bundle.survey.length
                  : k === "bichiglel"
                    ? bichiglelRows.length
                    : lpdataRows.length
                ).toLocaleString("mn-MN")}
              </span>
            </button>
          ))}
        </div>

        {selectedRow && (
          <span className="chip">
            Сонгосон талбай: №{selectedRow.id ?? selectedRow.objectid}
            <button onClick={() => onSelect(null)} title="Сонголтыг цуцлах">
              ✕
            </button>
          </span>
        )}

        {lpTruncated && tab === "lpdata" && (
          <span className="chip" style={{ background: "rgba(230,180,85,0.12)", borderColor: "rgba(230,180,85,0.35)", color: "#e6c98a" }}>
            Нийт {bundle.counts.lpdata.toLocaleString("mn-MN")} мөрөөс эхний{" "}
            {bundle.lpdata.length.toLocaleString("mn-MN")} нь ачаалсан · талбай сонгоход бүрэн харагдана
          </span>
        )}

        {plotLoading && tab !== "survey" && <span className="chip">Сонгосон талбайн бичлэг ачаалж байна…</span>}

        {selectedRow && tab !== "survey" && (
          <button
            className={`btn ghost${scoped ? " primary" : ""}`}
            style={{ height: 22 }}
            onClick={() => setScoped((s) => !s)}
            title="Зөвхөн сонгосон талбайн бичлэгийг харуулах"
          >
            {scoped ? "Зөвхөн сонгосон талбай" : "Бүх талбай"}
          </button>
        )}

        <div className="spacer" />

        <ColumnManager state={state} systemColumns={SYSTEM_HIDDEN} fieldName={fieldName} />
        <TableToolbar state={state} />
      </div>

      <div className="panel-body">
        {tab === "survey" ? (
          <TableGrid
            state={surveyState}
            rowKey="objectid"
            fieldName={fieldName}
            selectedValue={selected}
            onRowClick={(r) => onSelect(selected === r.objectid ? null : r.objectid)}
            emptyText="Сонгосон шүүлтүүрт тохирох судалгааны талбай олдсонгүй."
          />
        ) : tab === "bichiglel" ? (
          <TableGrid
            state={bichiglelState}
            rowKey="objectid"
            fieldName={fieldName}
            emptyText="10 минутын бичиглэлийн бүртгэл олдсонгүй."
          />
        ) : (
          <TableGrid
            state={lpdataState}
            rowKey="objectid"
            fieldName={fieldName}
            emptyText="LP data-ийн бичлэг олдсонгүй."
          />
        )}
      </div>
    </section>
  );
}
