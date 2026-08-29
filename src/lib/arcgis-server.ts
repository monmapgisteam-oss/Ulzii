/**
 * Серверийн талд ажиллах ArcGIS хандалтын давхарга.
 *
 * Уг FeatureServer нь editor tracking + ownership access control-той тул
 * нэр нууцгүй (anonymous) хандалтад бичлэг буцаадаггүй. Иймд токеныг
 * зөвхөн серверт хадгалж, хөтөч рүү дамжуулахгүй байхаар зохион байгуулав.
 *
 * Дэмжих нэвтрэлтийн хувилбарууд (.env.local):
 *   1) ARCGIS_TOKEN                                — бэлэн токен
 *   2) ARCGIS_CLIENT_ID / ARCGIS_CLIENT_SECRET     — OAuth 2.0 (client credentials)
 *   3) ARCGIS_USERNAME / ARCGIS_PASSWORD           — ArcGIS Online хэрэглэгч
 */

import { LAYERS, LayerKey, MAX_RECORD_COUNT, SERVICE_URL } from "./config";

const PORTAL = process.env.ARCGIS_PORTAL_URL ?? "https://www.arcgis.com";

type CachedToken = { token: string; expires: number };
let cache: CachedToken | null = null;

async function postForm(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });
  return res.json();
}

/** Токеныг авах / кэшлэх. Тохиргоо байхгүй бол null буцаана. */
export async function getToken(): Promise<string | null> {
  if (process.env.ARCGIS_TOKEN) return process.env.ARCGIS_TOKEN;

  if (cache && cache.expires > Date.now() + 60_000) return cache.token;

  const { ARCGIS_CLIENT_ID, ARCGIS_CLIENT_SECRET, ARCGIS_USERNAME, ARCGIS_PASSWORD } = process.env;

  if (ARCGIS_CLIENT_ID && ARCGIS_CLIENT_SECRET) {
    const json = await postForm(`${PORTAL}/sharing/rest/oauth2/token`, {
      client_id: ARCGIS_CLIENT_ID,
      client_secret: ARCGIS_CLIENT_SECRET,
      grant_type: "client_credentials",
      expiration: "1440",
      f: "json",
    });
    if (json?.access_token) {
      cache = { token: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
      return cache.token;
    }
    throw new Error(`OAuth алдаа: ${json?.error?.message ?? JSON.stringify(json)}`);
  }

  if (ARCGIS_USERNAME && ARCGIS_PASSWORD) {
    const json = await postForm(`${PORTAL}/sharing/rest/generateToken`, {
      username: ARCGIS_USERNAME,
      password: ARCGIS_PASSWORD,
      referer: process.env.ARCGIS_REFERER ?? "http://localhost:3000",
      expiration: "1440",
      f: "json",
    });
    if (json?.token) {
      cache = { token: json.token, expires: json.expires ?? Date.now() + 3600_000 };
      return cache.token;
    }
    throw new Error(`Нэвтрэх алдаа: ${json?.error?.message ?? JSON.stringify(json)}`);
  }

  return null;
}

export type QueryParams = {
  where?: string;
  outFields?: string;
  returnGeometry?: boolean;
  orderByFields?: string;
  groupByFieldsForStatistics?: string;
  outStatistics?: string;
  returnDistinctValues?: boolean;
  resultRecordCount?: number;
  resultOffset?: number;
  returnCountOnly?: boolean;
};

async function queryOnce(layerId: number, params: QueryParams, service: string = SERVICE_URL) {
  const token = await getToken();
  const body: Record<string, string> = {
    f: "json",
    where: params.where ?? "1=1",
    outFields: params.outFields ?? "*",
    returnGeometry: String(params.returnGeometry ?? false),
    outSR: "4326",
  };
  if (params.orderByFields) body.orderByFields = params.orderByFields;
  if (params.groupByFieldsForStatistics) body.groupByFieldsForStatistics = params.groupByFieldsForStatistics;
  if (params.outStatistics) body.outStatistics = params.outStatistics;
  if (params.returnDistinctValues) body.returnDistinctValues = "true";
  if (params.returnCountOnly) body.returnCountOnly = "true";
  if (params.resultRecordCount !== undefined) body.resultRecordCount = String(params.resultRecordCount);
  if (params.resultOffset !== undefined) body.resultOffset = String(params.resultOffset);
  if (token) body.token = token;

  const json = await postForm(`${service}/${layerId}/query`, body);
  if (json?.error) {
    throw new Error(`ArcGIS алдаа ${json.error.code}: ${json.error.message}`);
  }
  return json;
}

/**
 * Давхаргад бодитоор байгаа талбаруудын нэр (кэштэй).
 * Маягтын зохиогч талбар нэмэх/устгах үед хүсэлт унахаас сэргийлнэ.
 */
const fieldCache = new Map<string, { names: string[]; expires: number }>();

export async function layerFieldNames(
  layer: LayerKey,
  service: string = SERVICE_URL,
): Promise<string[]> {
  const key = `${service}#${LAYERS[layer]}`;
  const hit = fieldCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.names;

  try {
    const res = await fetch(`${service}/${LAYERS[layer]}?f=json`, { cache: "no-store" });
    const def = await res.json();
    const names: string[] = (def?.fields ?? []).map((f: any) => String(f.name));
    if (names.length) {
      fieldCache.set(key, { names, expires: Date.now() + 5 * 60_000 });
      return names;
    }
  } catch {
    /* тодорхойлолт татаж чадаагүй бол хязгаарлахгүй */
  }
  return [];
}

/**
 * Хүссэн талбаруудаас давхаргад байгаагий нь л үлдээнэ.
 * Жагсаалт хоосон бол бүх талбарыг (*) авна.
 */
export async function availableFields(
  layer: LayerKey,
  wanted: string[],
  service: string = SERVICE_URL,
): Promise<string> {
  const names = await layerFieldNames(layer, service);
  if (!names.length) return "*";
  const ok = wanted.filter((f) => names.includes(f));
  return ok.length ? ok.join(",") : "*";
}

/** Нөхцөлд тохирох бичлэгийн тоог тооцно */
export async function queryCount(
  layer: LayerKey,
  where: string,
  service: string = SERVICE_URL,
): Promise<number> {
  const json = await queryOnce(LAYERS[layer], { where, returnCountOnly: true }, service);
  return Number(json?.count ?? 0);
}

/**
 * Бүлэглэсэн статистик (groupBy + count).
 * Олон мянган мөрийг татахгүйгээр графикийн үзүүлэлтийг өгөгдлийн сангийн
 * талд тооцуулах зориулалттай.
 */
export async function queryGroupCount(
  layer: LayerKey,
  where: string,
  field: string,
  service: string = SERVICE_URL,
): Promise<{ key: string; count: number }[]> {
  const out: { key: string; count: number }[] = [];
  let offset = 0;

  for (let page = 0; page < 40; page++) {
    const json = await queryOnce(
      LAYERS[layer],
      {
        where,
        groupByFieldsForStatistics: field,
        outStatistics: JSON.stringify([
          { statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "n" },
        ]),
        resultOffset: offset,
        resultRecordCount: MAX_RECORD_COUNT,
      },
      service,
    );
    const batch: any[] = json.features ?? [];
    for (const f of batch) {
      out.push({ key: String(f.attributes?.[field] ?? ""), count: Number(f.attributes?.n ?? 0) });
    }
    if (batch.length < MAX_RECORD_COUNT) break;
    offset += batch.length;
  }

  return out;
}

/**
 * Бүх хуудсыг татаж нэгтгэнэ.
 * Эхлээд бичлэгийн тоог тодорхойлж, хуудсуудыг зэрэгцээ (concurrency 6)
 * татдаг тул олон мянган мөртэй хүснэгтэд мэдэгдэхүйц хурдан.
 * `limit` өгвөл тэр тооны мөрөөр таслана.
 */
export async function queryAll(
  layer: LayerKey,
  params: QueryParams & { limit?: number },
  service: string = SERVICE_URL,
) {
  const layerId = LAYERS[layer];
  const first = await queryOnce(
    layerId,
    { ...params, resultOffset: 0, resultRecordCount: MAX_RECORD_COUNT },
    service,
  );
  const features: any[] = first.features ?? [];

  if (!first.exceededTransferLimit && features.length < MAX_RECORD_COUNT) return features;
  if (params.limit && features.length >= params.limit) return features.slice(0, params.limit);

  const total = params.limit ?? (await queryCount(layer, params.where ?? "1=1", service));
  const offsets: number[] = [];
  for (let o = MAX_RECORD_COUNT; o < total; o += MAX_RECORD_COUNT) offsets.push(o);

  const CONCURRENCY = 6;
  const pages: any[][] = new Array(offsets.length);
  for (let i = 0; i < offsets.length; i += CONCURRENCY) {
    const slice = offsets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map((o) =>
        queryOnce(
          layerId,
          { ...params, resultOffset: o, resultRecordCount: MAX_RECORD_COUNT },
          service,
        ),
      ),
    );
    results.forEach((json, j) => {
      pages[i + j] = json.features ?? [];
    });
  }

  for (const p of pages) if (p) features.push(...p);
  return params.limit ? features.slice(0, params.limit) : features;
}

/** WHERE илэрхийллийн мөр утгыг SQL-д аюулгүй хэлбэрт шилжүүлнэ. */
export function sqlLiteral(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}
