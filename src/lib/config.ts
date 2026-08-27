/** ArcGIS FeatureServer-ийн үндсэн тохиргоо */

export const SERVICE_URL =
  process.env.ARCGIS_SERVICE_URL ??
  "https://services-ap1.arcgis.com/fwC6eN4IwtqH3A7R/arcgis/rest/services/service_99d12031bc274b73af81b5e00b05d63f/FeatureServer";

/**
 * Судалгааны төслүүд.
 * Толгой хэсгийн товчоор сонгоно. Rangeland төслийн FeatureServer URL-ыг
 * .env.local файлын ARCGIS_RANGELAND_SERVICE_URL утгаар өгнө.
 */
export const RANGELAND_SERVICE_URL =
  process.env.ARCGIS_RANGELAND_SERVICE_URL ||
  "https://services-ap1.arcgis.com/fwC6eN4IwtqH3A7R/arcgis/rest/services/service_a3e5e179afc84eebbfb2540977417ab9/FeatureServer";

/** Төслийн FeatureServer хаяг */
export function serviceUrlFor(project: string | null | undefined): string | null {
  return project === "rangeland" ? RANGELAND_SERVICE_URL : SERVICE_URL;
}

/** Давхарга / хүснэгтийн дугаар (FeatureServer доторх layer id) */
export const LAYERS = {
  /** 0 — Судалгааны талбай (цэгэн давхарга) */
  survey: 0,
  /** 1 — Бичиглэлийн арга (цэгэн хүрээний бүртгэл) */
  bichiglel: 1,
  /** 2 — Шугам-цэгийн (line-point) хэмжилт */
  lpdata: 2,
} as const;

export type LayerKey = keyof typeof LAYERS;

/** ArcGIS-ийн нэг удаагийн хүсэлтээр буцаах хамгийн их бичлэгийн тоо */
export const MAX_RECORD_COUNT = 1000;

/** Ургамлын бүрхэц тооцоход ургамал бус гэж үзэх ангилал */
export const NON_PLANT_CODES = ["Bare ground", "Litter"] as const;

/** Шугам-цэгийн хүснэгтэд нэг удаад татах мөрийн дээд хязгаар */
export const LP_ROW_LIMIT = 5000;

/** Зөвхөн ургамал тохиосон цэгийг ялгах SQL нөхцөл */
export const PLANT_ONLY_SQL =
  "speciesLP IS NOT NULL AND speciesLP NOT IN ('Bare ground','Litter')";
