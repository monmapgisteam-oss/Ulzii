import { NextResponse } from "next/server";
import { availableFields, getToken, queryAll, queryCount, queryGroupCount } from "@/lib/arcgis-server";
import { buildSurveyWhere, chunkedIn, inClause, Filters } from "@/lib/where";
import { demoBundle } from "@/lib/demo";
import { LP_ROW_LIMIT, PLANT_ONLY_SQL, serviceUrlFor } from "@/lib/config";
import { schemaOf } from "@/lib/projects";

export const dynamic = "force-dynamic";

/** ArcGIS руу олон дараалсан хүсэлт явуулдаг тул хугацааны нөөц нэмэв */
export const maxDuration = 30;

type Row = Record<string, any>;

const NON_PLANT = new Set(["Bare ground", "Litter"]);

/** Демо горимын статистикийг бодит хариултын бүтцээр бэлтгэнэ */
function demoStats(lpdata: Row[]) {
  const group = (rows: Row[], field: string) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = String(r[field] ?? "");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m, ([key, count]) => ({ key, count }));
  };
  return {
    lpSpecies: group(lpdata, "speciesLP"),
    lpPlotTotal: group(lpdata, "parentglobalid"),
    lpPlotPlant: group(
      lpdata.filter((r) => r.speciesLP && !NON_PLANT.has(String(r.speciesLP))),
      "parentglobalid",
    ),
  };
}

function attrs(features: any[]): Row[] {
  return features.map((f) => ({ ...f.attributes }));
}

function withGeometry(features: any[]): Row[] {
  return features.map((f) => ({
    ...f.attributes,
    __lon: f.geometry?.x ?? null,
    __lat: f.geometry?.y ?? null,
  }));
}

/** Эцэг бүртгэлийн GlobalID-аар хүүхэд хүснэгтэд хэрэглэх нөхцөл */
function childWhere(parentIds: string[], extra: string | null): string {
  const clause = chunkedIn("parentglobalid", parentIds).join(" OR ");
  return extra ? `(${clause}) AND (${extra})` : `(${clause})`;
}

export async function POST(req: Request) {
  try {
    const token = await getToken();
    const body = (await req.json()) as Partial<Filters> & { project?: string };
    const filters = body;
    const service = serviceUrlFor(body.project);
    const schema = schemaOf(body.project);

    if (!service) {
      return NextResponse.json({
        authenticated: Boolean(token),
        error:
          "Rangeland төслийн FeatureServer хаяг тохируулаагүй байна. .env.local файлд ARCGIS_RANGELAND_SERVICE_URL утгыг оруулаад серверийг дахин ачаална уу.",
        where: { survey: "—", bichiglel: "—", lpdata: "—" },
        counts: { survey: 0, bichiglel: 0, lpdata: 0 },
        truncated: { lpdata: false },
        stats: { lpSpecies: [], lpPlotTotal: [], lpPlotPlant: [] },
        survey: [],
        bichiglel: [],
        lpdata: [],
      });
    }

    let surveyWhere = buildSurveyWhere(filters);

    // Итгэмжлэл байхгүй үед зөвхөн загвар харах горим (DEMO_DATA=1)
    if (!token && process.env.DEMO_DATA === "1") {
      const demo = demoBundle(filters);
      return NextResponse.json({
        authenticated: false,
        demo: true,
        where: { survey: surveyWhere, bichiglel: "parentglobalid IN (…)", lpdata: "parentglobalid IN (…)" },
        counts: { survey: demo.survey.length, bichiglel: demo.bichiglel.length, lpdata: demo.lpdata.length },
        truncated: { lpdata: false },
        stats: demoStats(demo.lpdata),
        ...demo,
      });
    }

    // Зүйлийн шүүлтүүр: тухайн зүйл бүртгэгдсэн талбайг эхлээд өгөгдлийн сангаас
    // ялгаж авах (cross-filter) — дараа нь survey давхаргыг хязгаарлана.
    const speciesSel = filters.species ?? [];
    const speciesWhereB = inClause("species", speciesSel);
    const speciesWhereL = inClause("speciesLP", speciesSel);

    if (speciesSel.length) {
      const [b, l] = await Promise.all([
        queryAll("bichiglel", { where: speciesWhereB!, outFields: "parentglobalid" }, service),
        queryAll("lpdata", { where: speciesWhereL!, outFields: "parentglobalid" }, service),
      ]);
      const parents = Array.from(
        new Set(
          [...attrs(b), ...attrs(l)]
            .map((r) => r.parentglobalid)
            .filter((v): v is string => typeof v === "string" && v.length > 0),
        ),
      );
      if (!parents.length) {
        return NextResponse.json({
          authenticated: Boolean(token),
          where: { survey: `${surveyWhere} AND 1=0`, bichiglel: speciesWhereB, lpdata: speciesWhereL },
          counts: { survey: 0, bichiglel: 0, lpdata: 0 },
          truncated: { lpdata: false },
          stats: { lpSpecies: [], lpPlotTotal: [], lpPlotPlant: [] },
          survey: [],
          bichiglel: [],
          lpdata: [],
        });
      }
      const parentClause = chunkedIn("globalid", parents).join(" OR ");
      surveyWhere = surveyWhere === "1=1" ? `(${parentClause})` : `${surveyWhere} AND (${parentClause})`;
    }

    const surveyFeatures = await queryAll(
      "survey",
      { where: surveyWhere, outFields: "*", returnGeometry: true, orderByFields: "date DESC" },
      service,
    );
    const survey = withGeometry(surveyFeatures);

    const parentIds = survey
      .map((r) => r.globalid)
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (!parentIds.length) {
      return NextResponse.json({
        authenticated: Boolean(token),
        where: { survey: surveyWhere, bichiglel: "—", lpdata: "—" },
        counts: { survey: survey.length, bichiglel: 0, lpdata: 0 },
        truncated: { lpdata: false },
        stats: { lpSpecies: [], lpPlotTotal: [], lpPlotPlant: [] },
        survey,
        bichiglel: [],
        lpdata: [],
      });
    }

    const whereB = childWhere(parentIds, speciesWhereB);
    const whereL = childWhere(parentIds, speciesWhereL);

    // Давхаргад бодитоор байгаа талбаруудыг л нэхнэ (схем өөрчлөгдөж болно)
    const lpFields = await availableFields("lpdata", schema.lpdata.fields, service);

    // Бичиглэлийн хүснэгт харьцангуй бага тул бүрэн татна.
    // Шугам-цэгийн хүснэгт хэдэн арван мянган мөртэй байж болох тул
    // графикийн үзүүлэлтийг ArcGIS-ийн бүлэглэсэн статистикаар тооцож,
    // хүснэгтэд эхний хэсгийг нь л татна.
    const [bichiglel, lpCount, lpRows, lpSpecies, lpPlotTotal, lpPlotPlant] = await Promise.all([
      queryAll("bichiglel", { where: whereB, outFields: "*" }, service).then(attrs),
      queryCount("lpdata", `(${whereL}) AND speciesLP IS NOT NULL`, service),
      queryAll(
        "lpdata",
        {
          where: whereL,
          outFields: lpFields,
          orderByFields: "objectid ASC",
          limit: LP_ROW_LIMIT,
        },
        service,
      ).then(attrs),
      queryGroupCount("lpdata", whereL, "speciesLP", service),
      queryGroupCount("lpdata", `(${whereL}) AND speciesLP IS NOT NULL`, "parentglobalid", service),
      queryGroupCount("lpdata", `(${whereL}) AND ${PLANT_ONLY_SQL}`, "parentglobalid", service),
    ]);

    return NextResponse.json({
      authenticated: Boolean(token),
      where: {
        survey: surveyWhere,
        bichiglel: speciesWhereB ?? "parentglobalid IN (…)",
        lpdata: speciesWhereL ?? "parentglobalid IN (…)",
      },
      counts: { survey: survey.length, bichiglel: bichiglel.length, lpdata: lpCount },
      truncated: { lpdata: lpCount > lpRows.length },
      stats: { lpSpecies, lpPlotTotal, lpPlotPlant },
      survey,
      bichiglel,
      lpdata: lpRows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Тодорхойгүй алдаа", survey: [], bichiglel: [], lpdata: [] },
      { status: 500 },
    );
  }
}
