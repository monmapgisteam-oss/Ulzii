/**
 * Esri-ийн нээлттэй суурь зураглалын сан (ArcGIS Online basemap gallery).
 * Бүгд services.arcgisonline.com дээрх нийтийн үйлчилгээ тул түлхүүр шаардахгүй.
 */

export type Basemap = {
  name: string;
  url: string;
  /** Нэршил, хилийн нэмэлт давхарга (hybrid, canvas, terrain зэрэгт) */
  reference?: string;
  attribution: string;
  maxZoom?: number;
};

const AGOL = "https://services.arcgisonline.com/ArcGIS/rest/services";

export const BASEMAPS = {
  darkGray: {
    name: "Хар саарал зураглал",
    url: `${AGOL}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    reference: `${AGOL}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
    maxZoom: 16,
  },
  lightGray: {
    name: "Цайвар саарал зураглал",
    url: `${AGOL}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    reference: `${AGOL}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
    maxZoom: 16,
  },
  imagery: {
    name: "Хиймэл дагуулын зураг",
    url: `${AGOL}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, Maxar, Earthstar Geographics, GIS Community",
    maxZoom: 19,
  },
  hybrid: {
    name: "Хиймэл дагуул + нэршил",
    url: `${AGOL}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    reference: `${AGOL}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  topo: {
    name: "Байр зүйн зураглал",
    url: `${AGOL}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, HERE, Garmin, FAO, NOAA, USGS",
    maxZoom: 19,
  },
  streets: {
    name: "Гудамж, замын сүлжээ",
    url: `${AGOL}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, HERE, Garmin, USGS, NGA",
    maxZoom: 19,
  },
  terrain: {
    name: "Газрын гадаргын хэлбэр",
    url: `${AGOL}/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}`,
    reference: `${AGOL}/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, USGS, NOAA",
    maxZoom: 13,
  },
  shadedRelief: {
    name: "Сүүдэрлэсэн байр зүй",
    url: `${AGOL}/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, USGS, NOAA",
    maxZoom: 13,
  },
  physical: {
    name: "Физик газрын зураг",
    url: `${AGOL}/World_Physical_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, US National Park Service",
    maxZoom: 8,
  },
  natgeo: {
    name: "National Geographic",
    url: `${AGOL}/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: "National Geographic, Esri, DeLorme, HERE, UNEP-WCMC, USGS, NASA",
    maxZoom: 16,
  },
  ocean: {
    name: "Далай, усны сан",
    url: `${AGOL}/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}`,
    reference: `${AGOL}/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Esri, GEBCO, NOAA, National Geographic, Garmin, HERE",
    maxZoom: 13,
  },
} as const satisfies Record<string, Basemap>;

export type BasemapKey = keyof typeof BASEMAPS;

/**
 * Галерейд харуулах жижиг зураг — Монгол орны нутгийг хамарсан
 * (z=4, y=5, x=12) хайрцаг дахь нэг хавтанг ашиглана.
 */
export function thumbUrl(b: Basemap): string {
  return b.url.replace("{z}", "4").replace("{y}", "5").replace("{x}", "12");
}
