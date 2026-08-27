/**
 * Албан ёсны нэр томьёоны толь.
 * ArcGIS дахь англи хэлний талбарын нэр, кодыг Монгол улсын байгаль орчны
 * салбарт хэрэглэгддэг албан ёсны нэршилд буулгана.
 */

export const LAYER_TITLE: Record<string, string> = {
  survey: "Судалгааны талбайн бүртгэл",
  bichiglel: "10 минутын бичиглэл",
  lpdata: "LP data (шугам-цэгийн хэмжилт)",
};

export const LAYER_SUBTITLE: Record<string, string> = {
  survey: "Хээрийн судалгааны үндсэн мэдээллийн сан",
  bichiglel: "Талбай тус бүрт 10 минутын хугацаанд бүртгэсэн ургамлын зүйлийн жагсаалт",
  lpdata: "Шугам-цэгийн (line-point) хэмжилт — 4 шугам × 120 цэг, 0.25 м алхамтай",
};

/** Талбарын албан ёсны нэршил */
export const FIELD_LABEL: Record<string, string> = {
  // survey
  objectid: "Бүртгэлийн дугаар",
  globalid: "Дэлхийн дугаар (GlobalID)",
  date: "Судалгаа хийсэн огноо",
  area_id: "Судалгааны талбайн код",
  id: "Plot ID",
  elevation: "Далайн түвшнээс дээш өндөр, м",
  biome: "Байгалийн бүс, бүслүүр",
  soumname: "Сум",
  operater: "Цэгэн хүрээ ажиллуулсан",
  recorder: "Мэдээлэл бүртгэсэн",
  livestock: "Талбай дахь малын ялгадас",
  comments: "Тайлбар",
  treatment: "Судалгааны хувилбар",
  plot_id_name: "Талбайн нэр",
  bag: "Баг",
  // bichiglel
  species: "Ургамлын зүйл",
  species_other: "Бусад зүйл",
  parent_id_10: "Эх талбайн код",
  parent_plot_id: "Эх талбайн Plot ID",
  species1: "Нэмэлт зүйл 1",
  species2: "Нэмэлт зүйл 2",
  species3: "Нэмэлт зүйл 3",
  parentglobalid: "Эх бүртгэлийн дугаар",
  // lpdata
  line_2: "Шугамын дугаар",
  line: "Шугамын дугаар",
  specieslp_other: "Бусад зүйл",
  zai_Txt: "Зай (тэмдэглэсэн утга)",
  lpdataID_1: "Шугам дээрх байршил, м",
  speciesLP: "Ургамлын зүйл",
  speciesLP_other: "Бусад зүйл",
  zai: "Ургамал хоорондын зай, см",
  zai_text: "Зай (тэмдэглэсэн утга)",
  parent_id_LP: "Эх талбайн код",
  // editor tracking
  CreationDate: "Үүсгэсэн огноо",
  Creator: "Үүсгэсэн ажилтан",
  EditDate: "Сүүлд зассан огноо",
  Editor: "Зассан ажилтан",
};

/**
 * Кодчилсон утгын орчуулга.
 * Ургамлын зүйл (латин нэр), байгалийн бүс, судалгааны хувилбар зэрэг
 * ангиллын нэрийг мэдээллийн санд бичигдсэн эх хэлбэрээр нь үлдээнэ —
 * зөвхөн утга илэрхийлэх энгийн кодыг орчуулна.
 */
export const CODE_LABEL: Record<string, string> = {
  Yes: "Тийм",
  No: "Үгүй",
};

/** Богино хэлбэр — график, шошгонд ашиглана */
export const CODE_LABEL_SHORT: Record<string, string> = {
  Yes: "Тийм",
  No: "Үгүй",
};

export function fieldLabel(name: string): string {
  return FIELD_LABEL[name] ?? name;
}

export type FieldLabeler = (name: string) => string;

/**
 * Талбарын нэршлийг ArcGIS сервис дээр бүртгэгдсэн alias-аар харуулна
 * (эх сурвалж дээр латинаар бичигдсэнийг латинаар нь үлдээнэ).
 * Alias байхгүй үед л дотоод толийг ашиглана.
 */
export function makeFieldLabeler(aliases?: Record<string, string>): FieldLabeler {
  return (name: string) => aliases?.[name] ?? FIELD_LABEL[name] ?? name;
}

export function codeLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const key = String(value);
  return CODE_LABEL[key] ?? key;
}

export function codeLabelShort(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const key = String(value);
  return CODE_LABEL_SHORT[key] ?? CODE_LABEL[key] ?? key;
}
