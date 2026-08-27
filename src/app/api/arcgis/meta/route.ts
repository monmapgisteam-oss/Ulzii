import { NextResponse } from "next/server";
import { getToken, queryAll } from "@/lib/arcgis-server";
import { LAYERS, serviceUrlFor } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Давхаргын тодорхойлолтоос кодчилсон утгын жагсаалтыг гаргана */
async function layerDomains(layerId: number, service: string) {
  const res = await fetch(`${service}/${layerId}?f=json`, { cache: "no-store" });
  const def = await res.json();
  const domains: Record<string, string[]> = {};
  for (const f of def?.fields ?? []) {
    if (f?.domain?.type === "codedValue") {
      domains[f.name] = f.domain.codedValues.map((cv: any) => String(cv.code));
    }
  }
  return { domains, name: def?.name as string, fields: def?.fields ?? [] };
}

export async function GET(req: Request) {
  try {
    const token = await getToken();
    const project = new URL(req.url).searchParams.get("project");
    const service = serviceUrlFor(project);

    if (!service) {
      return NextResponse.json({
        authenticated: Boolean(token),
        error: "Rangeland төслийн FeatureServer хаяг тохируулаагүй байна.",
        serviceUrl: "",
        domains: {},
        soums: [],
        bags: [],
        years: [],
        months: [],
        aliases: {},
        fields: { survey: [], bichiglel: [], lpdata: [] },
      });
    }
    const [survey, bichiglel, lpdata] = await Promise.all([
      layerDomains(LAYERS.survey, service),
      layerDomains(LAYERS.bichiglel, service),
      layerDomains(LAYERS.lpdata, service),
    ]);

    const demo = !token && process.env.DEMO_DATA === "1";
    let soums: string[] = [];
    let bags: string[] = [];
    let years: string[] = [];
    let months: string[] = [];
    let speciesUsed: string[] = [];
    if (token) {
      const [s, sp, spl] = await Promise.all([
        queryAll("survey", { where: "soumname IS NOT NULL", outFields: "soumname", returnDistinctValues: true }, service),
        queryAll("bichiglel", { where: "species IS NOT NULL", outFields: "species", returnDistinctValues: true }, service),
        queryAll("lpdata", { where: "speciesLP IS NOT NULL", outFields: "speciesLP", returnDistinctValues: true }, service),
      ]);
      soums = Array.from(new Set(s.map((f: any) => f.attributes.soumname).filter(Boolean))).sort();

      // Судалгаа хийсэн он, сарыг өгөгдлөөс нь шууд гаргана
      const period = await queryAll(
        "survey",
        {
          where: "date IS NOT NULL",
          groupByFieldsForStatistics: "EXTRACT(YEAR FROM date),EXTRACT(MONTH FROM date)",
          outStatistics: JSON.stringify([
            { statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "n" },
          ]),
        },
        service,
      );
      years = Array.from(
        new Set(period.map((f: any) => String(f.attributes.EXPR_1)).filter((v) => v && v !== "null")),
      ).sort();
      months = Array.from(
        new Set(period.map((f: any) => String(f.attributes.EXPR_2)).filter((v) => v && v !== "null")),
      ).sort((a, b) => Number(a) - Number(b));
      if (survey.fields.some((f: any) => f.name === "bag")) {
        const b = await queryAll(
          "survey",
          { where: "bag IS NOT NULL", outFields: "bag", returnDistinctValues: true },
          service,
        );
        bags = Array.from(new Set(b.map((f: any) => f.attributes.bag).filter(Boolean))).sort();
      }
      speciesUsed = Array.from(
        new Set([
          ...sp.map((f: any) => f.attributes.species),
          ...spl.map((f: any) => f.attributes.speciesLP),
        ].filter(Boolean)),
      ).sort();
    }

    // Талбарын нэршлийг сервис дээр бүртгэгдсэн alias-аар нь авна
    const aliases: Record<string, string> = {};
    for (const def of [survey, bichiglel, lpdata]) {
      for (const f of def.fields as any[]) {
        const alias = String(f.alias ?? "").trim();
        if (!alias || alias === f.name) continue;
        if (!aliases[f.name]) aliases[f.name] = alias;
      }
    }

    if (demo) {
      soums = ["Цогтцэций", "Ханбогд", "Манлай", "Баян-Овоо", "Даланзадгад"];
    }

    return NextResponse.json({
      authenticated: Boolean(token),
      demo,
      serviceUrl: service,
      domains: {
        biome: survey.domains.biome ?? [],
        treatment: survey.domains.treatment ?? [],
        id: survey.domains.id ?? [],
        recorder: survey.domains.recorder ?? [],
        operater: survey.domains.operater ?? [],
        livestock: survey.domains.livestock ?? [],
        species: speciesUsed.length ? speciesUsed : bichiglel.domains.species ?? [],
        line_2: lpdata.domains.line_2 ?? [],
      },
      soums,
      bags,
      years,
      months,
      aliases,
      fields: {
        survey: survey.fields.map((f: any) => f.name),
        bichiglel: bichiglel.fields.map((f: any) => f.name),
        lpdata: lpdata.fields.map((f: any) => f.name),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Алдаа", authenticated: false }, { status: 500 });
  }
}
