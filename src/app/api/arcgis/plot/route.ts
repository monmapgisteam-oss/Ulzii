import { NextResponse } from "next/server";
import { getToken, queryAll } from "@/lib/arcgis-server";
import { lit } from "@/lib/where";
import { serviceUrlFor } from "@/lib/config";
import { schemaOf } from "@/lib/projects";

export const dynamic = "force-dynamic";

/** ArcGIS руу олон дараалсан хүсэлт явуулдаг тул хугацааны нөөц нэмэв */
export const maxDuration = 30;

/**
 * Нэг судалгааны талбайн бүх хүүхэд бичлэгийг татна.
 * Газрын зураг эсвэл хүснэгтээс талбай сонгоход дуудагдана — ингэснээр
 * ерөнхий жагсаалтад хязгаарлагдсан ч сонгосон талбайн мэдээ бүрэн харагдана.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const gid = url.searchParams.get("gid");
    if (!gid) return NextResponse.json({ error: "gid параметр дутуу" }, { status: 400 });

    const token = await getToken();
    const project = url.searchParams.get("project");
    const service = serviceUrlFor(project);
    const schema = schemaOf(project);
    if (!token || !service) return NextResponse.json({ bichiglel: [], lpdata: [] });

    const where = `parentglobalid = ${lit(gid)}`;
    const [bichiglel, lpdata] = await Promise.all([
      queryAll("bichiglel", { where, outFields: "*", orderByFields: "objectid ASC" }, service),
      queryAll("lpdata", { where, outFields: schema.lpdata.fields.join(","), orderByFields: "objectid ASC" }, service),
    ]);

    return NextResponse.json({
      gid,
      bichiglel: bichiglel.map((f: any) => ({ ...f.attributes })),
      lpdata: lpdata.map((f: any) => ({ ...f.attributes })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Алдаа", bichiglel: [], lpdata: [] }, { status: 500 });
  }
}
