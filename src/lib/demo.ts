/**
 * ЗӨВХӨН ЗАГВАР ХАРАХ ЗОРИУЛАЛТТАЙ ДЕМО ӨГӨГДӨЛ.
 *
 * ArcGIS сервис нэвтрэлт шаарддаг тул итгэмжлэл бэлэн болтол интерфэйсийг
 * шалгах боломж олгоно. DEMO_DATA=1 үед л ажиллана; хариу нь demo: true
 * тэмдэглэгээтэй буцах бөгөөд дэлгэц дээр "ДЕМО ӨГӨГДӨЛ" гэж анхааруулна.
 * Бодит судалгааны мэдээлэл БИШ.
 */

import { Filters } from "./where";

const BIOMES = ["Desert steppe", "Semi Desert", "True Desert"];
const TREATMENTS = ["Post rehab", "Control"];
const SOUMS = ["Цогтцэций", "Ханбогд", "Манлай", "Баян-Овоо", "Даланзадгад"];
const RECORDERS = ["Narangerel.Ts", "Nasanjargal", "Erdenezul", "Margad.O", "Teshuu.B"];
const SPECIES = [
  "Allium polyrhizum",
  "Anabasis brevifolia",
  "Stipa gobica",
  "Salsola passerina",
  "Artemisia frigida",
  "Cleistogenes squarrosa",
  "Reaumuria soongorica",
  "Caragana leucophloea",
  "Zygophyllum xanthoxylon",
  "Haloxylon ammodendron",
];
const NON_PLANT = ["Bare ground", "Litter"];

/** Тогтвортой (deterministic) санамсаргүй тоо үүсгэгч */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildDemo() {
  const rnd = rng(20260827);
  const survey: any[] = [];
  const bichiglel: any[] = [];
  const lpdata: any[] = [];
  let bOid = 1;
  let lOid = 1;

  for (let i = 1; i <= 48; i++) {
    const biome = BIOMES[Math.floor(rnd() * BIOMES.length)];
    const treatment = TREATMENTS[i % 2];
    const soum = SOUMS[Math.floor(rnd() * SOUMS.length)];
    const gid = `{DEMO-${String(i).padStart(4, "0")}}`;
    const day = 1 + Math.floor(rnd() * 27);
    const month = 6 + Math.floor(rnd() * 3);

    survey.push({
      objectid: i,
      globalid: gid,
      date: Date.UTC(2025, month - 1, day),
      area_id: `MN-${biome.slice(0, 2).toUpperCase()}-${100 + i}`,
      id: String(i),
      elevation: 900 + Math.floor(rnd() * 800),
      biome,
      soumname: soum,
      operater: RECORDERS[Math.floor(rnd() * RECORDERS.length)],
      recorder: RECORDERS[Math.floor(rnd() * RECORDERS.length)],
      livestock: rnd() > 0.55 ? "Yes" : "No",
      comments: rnd() > 0.75 ? "Хөрсний элэгдэл ажиглагдав" : null,
      treatment,
      CreationDate: Date.UTC(2025, month - 1, day, 8),
      Creator: "demo_user",
      EditDate: Date.UTC(2025, month - 1, day, 12),
      Editor: "demo_user",
      __lon: 104 + (rnd() - 0.5) * 6,
      __lat: 43.5 + (rnd() - 0.5) * 3,
    });

    // 10 минутын бичиглэл: нэг талбайд 60 бүртгэл
    const coverRate = treatment === "Post rehab" ? 0.42 : 0.3;
    for (let p = 0; p < 60; p++) {
      const isPlant = rnd() < coverRate;
      const species = isPlant
        ? SPECIES[Math.floor(rnd() * SPECIES.length)]
        : NON_PLANT[rnd() < 0.7 ? 0 : 1];
      bichiglel.push({
        objectid: bOid++,
        globalid: `{DEMO-B-${bOid}}`,
        species,
        species_other: null,
        parent_id_10: `MN-${100 + i}`,
        parentglobalid: gid,
        CreationDate: Date.UTC(2025, month - 1, day, 9),
        Creator: "demo_user",
        EditDate: Date.UTC(2025, month - 1, day, 9),
        Editor: "demo_user",
      });
    }

    // LP data: 4 шугам × 12 хэмжилт
    for (let line = 1; line <= 4; line++) {
      for (let m = 0; m < 12; m++) {
        const zai = Math.round(5 + rnd() * (treatment === "Post rehab" ? 90 : 180));
        lpdata.push({
          objectid: lOid++,
          globalid: `{DEMO-L-${lOid}}`,
          line_2: String(line),
          lpdataID_1: `${i}-${line}-${m + 1}`,
          speciesLP:
            rnd() < coverRate ? SPECIES[Math.floor(rnd() * SPECIES.length)] : NON_PLANT[0],
          speciesLP_other: null,
          zai,
          zai_text: String(zai),
          parent_id_LP: `MN-${100 + i}`,
          parentglobalid: gid,
          CreationDate: Date.UTC(2025, month - 1, day, 10),
          Creator: "demo_user",
          EditDate: Date.UTC(2025, month - 1, day, 10),
          Editor: "demo_user",
        });
      }
    }
  }

  return { survey, bichiglel, lpdata };
}

let cached: ReturnType<typeof buildDemo> | null = null;

/** Демо өгөгдөлд шүүлтүүрийг хэрэглэж, жинхэнэ хариултын бүтцээр буцаана */
export function demoBundle(f: Partial<Filters>) {
  if (!cached) cached = buildDemo();

  const inSet = (arr: string[] | undefined, v: unknown) =>
    !arr || !arr.length || arr.includes(String(v ?? ""));

  let survey = cached.survey.filter(
    (s) =>
      inSet(f.biome, s.biome) &&
      inSet(f.treatment, s.treatment) &&
      inSet(f.soumname, s.soumname) &&
      inSet(f.id, s.id) &&
      inSet(f.recorder, s.recorder) &&
      inSet(f.livestock, s.livestock) &&
      (!f.dateFrom || s.date >= Date.parse(f.dateFrom)) &&
      (!f.dateTo || s.date <= Date.parse(f.dateTo) + 86_400_000) &&
      (!f.search ||
        [s.area_id, s.soumname, s.id, s.comments]
          .join(" ")
          .toLowerCase()
          .includes(String(f.search).toLowerCase())),
  );

  const species = f.species ?? [];
  if (species.length) {
    const parents = new Set(
      [
        ...cached.bichiglel.filter((r) => species.includes(r.species)),
        ...cached.lpdata.filter((r) => species.includes(r.speciesLP)),
      ].map((r) => r.parentglobalid),
    );
    survey = survey.filter((s) => parents.has(s.globalid));
  }

  const gids = new Set(survey.map((s) => s.globalid));
  const bichiglel = cached.bichiglel.filter(
    (r) => gids.has(r.parentglobalid) && (!species.length || species.includes(r.species)),
  );
  const lpdata = cached.lpdata.filter(
    (r) => gids.has(r.parentglobalid) && (!species.length || species.includes(r.speciesLP)),
  );

  return { survey, bichiglel, lpdata };
}
