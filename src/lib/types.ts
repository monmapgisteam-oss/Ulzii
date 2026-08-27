export type Row = Record<string, any>;

export type SurveyRow = Row & {
  objectid: number;
  globalid: string;
  date: number | null;
  area_id: string | null;
  id: string | null;
  elevation: number | null;
  biome: string | null;
  soumname: string | null;
  operater: string | null;
  recorder: string | null;
  livestock: string | null;
  comments: string | null;
  treatment: string | null;
  __lon: number | null;
  __lat: number | null;
};

export type GroupCount = { key: string; count: number };

export type DataBundle = {
  authenticated: boolean;
  demo?: boolean;
  error?: string;
  where: { survey: string; bichiglel: string; lpdata: string };
  /** Шүүлтэд тохирох нийт бичлэгийн тоо (татсан мөрийн тооноос ялгаатай байж болно) */
  counts: { survey: number; bichiglel: number; lpdata: number };
  /** Хязгаарлаж татсан эсэх */
  truncated: { lpdata: boolean };
  /** ArcGIS-ийн бүлэглэсэн статистикаар тооцсон үзүүлэлт */
  stats: {
    /** Зүйл тус бүрээр таарсан цэгийн тоо */
    lpSpecies: GroupCount[];
    /** Талбай тус бүрийн нийт цэг */
    lpPlotTotal: GroupCount[];
    /** Талбай тус бүрийн ургамал тохиосон цэг */
    lpPlotPlant: GroupCount[];
  };
  survey: SurveyRow[];
  bichiglel: Row[];
  lpdata: Row[];
};

/** Сонгосон талбайн бүрэн хүүхэд бичлэг */
export type PlotChildren = { gid: string; bichiglel: Row[]; lpdata: Row[] };

export type Meta = {
  authenticated: boolean;
  demo?: boolean;
  serviceUrl: string;
  domains: Record<string, string[]>;
  soums: string[];
  bags: string[];
  /** Өгөгдөлд байгаа он, сар */
  years: string[];
  months: string[];
  /** Талбарын нэршил — ArcGIS сервис дээр бүртгэгдсэн alias */
  aliases: Record<string, string>;
  fields: { survey: string[]; bichiglel: string[]; lpdata: string[] };
  error?: string;
};
