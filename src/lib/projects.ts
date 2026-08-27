/**
 * Судалгааны төслүүдийн схем.
 *
 * Хоёр FeatureServer нь ижил бүтэцтэй (survey / bichiglel / lpdata) боловч
 * талбарын нэршил, агуулга нь зарим талаар ялгаатай:
 *
 *   Post rehab — `treatment` (Post rehab / Control), `area_id`, LP-д `line_2`
 *   Rangeland  — `treatment` байхгүй; `bag`, `plot_id_name`, LP-д `line`
 *
 * Иймд шүүлтүүр, график, хүснэгтийн багана, тэмдэглэгээг энд тодорхойлж,
 * бүх бүрэлдэхүүн хэсэг эндээс уншина.
 */

export type ProjectKey = "postRehab" | "rangeland";

/** Шүүлтүүрийн мөрөнд гаргах талбар */
export type FilterField = {
  /** survey давхаргын талбарын нэр (Filters объектын түлхүүр) */
  field: "biome" | "treatment" | "soumname" | "bag" | "id" | "recorder" | "livestock" | "species";
  label: string;
  width: number;
  searchable?: boolean;
  /** Утгын жагсаалтыг хаанаас авах: домэйн эсвэл өгөгдлөөс */
  source: "domain" | "soums" | "bags";
};

export type ProjectSchema = {
  key: ProjectKey;
  name: string;
  /** Газрын зураг, серийн графикт ашиглах үндсэн ба нэмэлт ангилал */
  category: { field: string; label: string };
  categoryAlt: { field: string; label: string };
  filters: FilterField[];
  /** Газрын зургийн тайлбар цонхонд гаргах талбарууд */
  popupFields: string[];
  survey: { columns: string[] };
  bichiglel: { columns: string[]; hidden: string[] };
  lpdata: { fields: string[]; columns: string[]; hidden: string[] };
};

const SYSTEM_HIDDEN = ["globalid", "parentglobalid", "Creator", "Editor", "CreationDate", "EditDate"];

export const PROJECT_SCHEMAS: Record<ProjectKey, ProjectSchema> = {
  postRehab: {
    key: "postRehab",
    name: "Post rehab",
    category: { field: "treatment", label: "Хувилбар" },
    categoryAlt: { field: "biome", label: "Бүс" },
    filters: [
      { field: "treatment", label: "Хувилбар", width: 118, source: "domain" },
      { field: "soumname", label: "Сум", width: 122, searchable: true, source: "soums" },
      { field: "id", label: "Plot ID", width: 104, searchable: true, source: "domain" },
      { field: "recorder", label: "Бүртгэгч", width: 118, source: "domain" },
      { field: "species", label: "Ургамлын зүйл", width: 140, searchable: true, source: "domain" },
    ],
    popupFields: ["area_id", "date", "treatment", "biome", "soumname", "elevation"],
    survey: {
      columns: [
        "objectid",
        "id",
        "area_id",
        "date",
        "biome",
        "treatment",
        "soumname",
        "elevation",
        "livestock",
        "recorder",
        "operater",
        "comments",
        "globalid",
        "CreationDate",
        "Creator",
        "EditDate",
        "Editor",
      ],
    },
    bichiglel: {
      columns: [
        "objectid",
        "parent_id_10",
        "species",
        "species_other",
        "CreationDate",
        "Creator",
        "EditDate",
        "Editor",
        "globalid",
        "parentglobalid",
      ],
      hidden: SYSTEM_HIDDEN,
    },
    lpdata: {
      fields: [
        "objectid",
        "parent_id_LP",
        "line_2",
        "lpdataID_1",
        "speciesLP",
        "speciesLP_other",
        "zai",
        "parentglobalid",
      ],
      columns: [
        "objectid",
        "parent_id_LP",
        "line_2",
        "lpdataID_1",
        "speciesLP",
        "speciesLP_other",
        "zai",
        "parentglobalid",
      ],
      hidden: [...SYSTEM_HIDDEN, "zai", "speciesLP_other"],
    },
  },

  rangeland: {
    key: "rangeland",
    name: "Rangeland",
    category: { field: "biome", label: "Бүс" },
    categoryAlt: { field: "soumname", label: "Сум" },
    filters: [
      { field: "biome", label: "Байгалийн бүс", width: 122, source: "domain" },
      { field: "soumname", label: "Сум", width: 122, searchable: true, source: "soums" },
      { field: "bag", label: "Баг", width: 112, searchable: true, source: "bags" },
      { field: "id", label: "Plot ID", width: 104, searchable: true, source: "domain" },
      { field: "recorder", label: "Бүртгэгч", width: 118, source: "domain" },
      { field: "species", label: "Ургамлын зүйл", width: 140, searchable: true, source: "domain" },
    ],
    popupFields: ["plot_id_name", "date", "biome", "bag", "soumname", "elevation"],
    survey: {
      columns: [
        "objectid",
        "id",
        "plot_id_name",
        "date",
        "biome",
        "soumname",
        "bag",
        "elevation",
        "livestock",
        "recorder",
        "operater",
        "comments",
        "globalid",
        "CreationDate",
        "Creator",
        "EditDate",
        "Editor",
      ],
    },
    bichiglel: {
      columns: [
        "objectid",
        "parent_plot_id",
        "species",
        "species1",
        "species2",
        "species3",
        "species_other",
        "zai",
        "CreationDate",
        "Creator",
        "EditDate",
        "Editor",
        "globalid",
        "parentglobalid",
      ],
      hidden: [...SYSTEM_HIDDEN, "zai", "species1", "species2", "species3", "species_other"],
    },
    lpdata: {
      fields: [
        "objectid",
        "parent_plot_id",
        "line",
        "lpdataID_1",
        "speciesLP",
        "specieslp_other",
        "zai",
        "parentglobalid",
      ],
      columns: [
        "objectid",
        "parent_plot_id",
        "line",
        "lpdataID_1",
        "speciesLP",
        "specieslp_other",
        "zai",
        "parentglobalid",
      ],
      hidden: [...SYSTEM_HIDDEN, "zai", "specieslp_other"],
    },
  },
};

export function schemaOf(project: ProjectKey | string | null | undefined): ProjectSchema {
  return project === "rangeland" ? PROJECT_SCHEMAS.rangeland : PROJECT_SCHEMAS.postRehab;
}
