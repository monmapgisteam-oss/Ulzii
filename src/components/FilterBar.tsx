"use client";

import MultiSelect from "./MultiSelect";
import { Filters, EMPTY_FILTERS } from "@/lib/where";
import { Meta } from "@/lib/types";
import { ProjectSchema } from "@/lib/projects";
import { FieldLabeler, fieldLabel } from "@/lib/terms";

export type OptionCounts = Record<string, Record<string, number>>;

type Props = {
  meta: Meta | null;
  schema: ProjectSchema;
  filters: Filters;
  /** Одоогийн шүүлтэд тохирох бичлэгийн тоо (сонголт тус бүрээр) */
  counts: OptionCounts;
  /** Талбарын нэршил (ArcGIS alias) */
  fieldName?: FieldLabeler;
  loading: boolean;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  onRefresh: () => void;
};

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const countActive = (f: Filters) =>
  f.biome.length +
  f.treatment.length +
  f.soumname.length +
  f.bag.length +
  f.id.length +
  f.recorder.length +
  f.livestock.length +
  f.species.length +
  f.year.length +
  f.month.length;

export default function FilterBar({
  meta,
  schema,
  filters,
  counts,
  fieldName = fieldLabel,
  loading,
  onChange,
  onReset,
  onRefresh,
}: Props) {
  const domains = meta?.domains ?? {};

  /** Сонголтын жагсаалтыг схемийн заасан эх сурвалжаас авна */
  const optionsFor = (f: (typeof schema.filters)[number]): string[] => {
    if (f.source === "soums") return meta?.soums ?? [];
    if (f.source === "bags") return meta?.bags ?? [];
    return domains[f.field] ?? [];
  };

  const active = countActive(filters);

  return (
    <div className="filterbar">
      {schema.filters.map((f) => (
        <MultiSelect
          key={f.field}
          label={fieldName(f.field)}
          options={optionsFor(f)}
          value={filters[f.field]}
          counts={counts[f.field]}
          searchable={f.searchable}
          width={f.width}
          onChange={(v) => onChange({ [f.field]: v } as Partial<Filters>)}
        />
      ))}

      <MultiSelect
        label="Он"
        options={meta?.years ?? []}
        value={filters.year}
        counts={counts.year}
        width={104}
        onChange={(v) => onChange({ year: v })}
      />

      <MultiSelect
        label="Сар"
        options={meta?.months?.length ? meta.months : MONTHS}
        value={filters.month}
        counts={counts.month}
        labeler={(m) => `${m}-р сар`}
        width={112}
        onChange={(v) => onChange({ month: v })}
      />

      <div className="spacer" />

      <button
        className="btn ghost"
        onClick={onReset}
        disabled={active === 0 && !filters.objectids.length}
        title="Бүх шүүлтүүрийг арилгах"
      >
        Цэвэрлэх
      </button>
      <button className="btn primary" onClick={onRefresh} disabled={loading} title="Өгөгдлийг дахин татах">
        {loading ? "Татаж байна…" : "Шинэчлэх"}
      </button>
    </div>
  );
}

export { EMPTY_FILTERS };
