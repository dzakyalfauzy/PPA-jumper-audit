/**
 * constants.js
 * Enum terpusat untuk PPA Jumper Audit Automation.
 *
 * Perubahan Revision:
 *   - Menghapus enum lama: AUTH_STATUS, MOC_STATUS, REMOVAL_STATUS, DUE_DATE_STATUS
 *   - Menambahkan JUMPER_STATUS 3-status (Active / Expiring Soon / Expired)
 *   - Menambahkan PLC_BY_AREA mapping resmi dari user
 *   - Threshold terpusat untuk perhitungan status
 */

"use strict";

// ---------------------------------------------------------------------------
// AREA IDs
// ---------------------------------------------------------------------------
export const AREA_IDS = Object.freeze({
  DRYER_CM:  "dryer_cm",
  KILN_CTS:  "kiln_cts",
  FURNACE:   "furnace",
  CONVERTER: "converter",
});

export const AREA_ID_LIST = Object.freeze([
  AREA_IDS.DRYER_CM,
  AREA_IDS.KILN_CTS,
  AREA_IDS.FURNACE,
  AREA_IDS.CONVERTER,
]);

export const AREA_LABELS = Object.freeze({
  [AREA_IDS.DRYER_CM]:  "Dryer–CM",
  [AREA_IDS.KILN_CTS]:  "Kiln–CTS",
  [AREA_IDS.FURNACE]:   "Furnace",
  [AREA_IDS.CONVERTER]: "Converter",
});

// ---------------------------------------------------------------------------
// KATEGORI JUMPER
// ---------------------------------------------------------------------------
export const CATEGORIES = Object.freeze({
  SHORTBRANCHES: "Shortbranches",
  FORCES:        "Forces",
  AFI:           "AFI",
});

export const CATEGORY_LIST = Object.freeze([
  CATEGORIES.SHORTBRANCHES,
  CATEGORIES.FORCES,
  CATEGORIES.AFI,
]);

// ---------------------------------------------------------------------------
// WEEK DEFINITIONS — W1 sampai W52 untuk dropdown
// ---------------------------------------------------------------------------
export const STANDARD_WEEKS = Object.freeze(
  Array.from({ length: 52 }, (_, i) => `W${i + 1}`)
);

/**
 * Normalisasi dan parse week label.
 * @param {string|number} raw
 * @returns {{ weekNumber: number|null, label: string, year: number|null }}
 */
export function parseWeekLabel(raw) {
  if (raw === null || raw === undefined) return { weekNumber: null, label: "", year: null };
  const str = String(raw).trim();
  if (!str) return { weekNumber: null, label: "", year: null };

  // Format dengan tahun: wk1('25) atau W1 ('25) atau W1(2025)
  const yearMatch = str.match(/(?:wk|w)\s*(\d{1,2})\s*\(['"]?(\d{2,4})['"]?\)/i);
  if (yearMatch) {
    const wNum = parseInt(yearMatch[1], 10);
    let y = parseInt(yearMatch[2], 10);
    if (y < 100) y = 2000 + y;
    return {
      weekNumber: wNum,
      label: `W${wNum} ('${String(y).slice(-2)})`,
      year: y,
    };
  }

  // Format sederhana: wk40, W40, atau hanya angka 40
  const simpleMatch = str.match(/^(?:wk|w)?\s*(\d{1,2})$/i);
  if (simpleMatch) {
    const wNum = parseInt(simpleMatch[1], 10);
    return {
      weekNumber: wNum,
      label: `W${wNum}`,
      year: null,
    };
  }

  return { weekNumber: null, label: str, year: null };
}

/**
 * Sort array week labels secara kronologis.
 * @param {string[]} labels
 * @param {number} [fallbackYear]
 * @returns {string[]}
 */
export function sortWeekLabelsChronologically(labels, fallbackYear = 2026) {
  if (!Array.isArray(labels)) return [];
  return [...labels].sort((a, b) => {
    const pa = parseWeekLabel(a);
    const pb = parseWeekLabel(b);
    const ya = pa.year ?? fallbackYear;
    const yb = pb.year ?? fallbackYear;
    if (ya !== yb) return ya - yb;
    const wa = pa.weekNumber ?? 999;
    const wb = pb.weekNumber ?? 999;
    if (wa !== wb) return wa - wb;
    return a.localeCompare(b);
  });
}

// ---------------------------------------------------------------------------
// MATRIKS GRAFIK — 12 kombinasi Area × Category
// ---------------------------------------------------------------------------
export const CHART_MATRIX = Object.freeze(
  AREA_ID_LIST.flatMap((areaId) =>
    CATEGORY_LIST.map((category) => Object.freeze({ areaId, category }))
  )
);

// ---------------------------------------------------------------------------
// PLC MAPPING PER AREA (Official mapping dari user)
// ---------------------------------------------------------------------------
export const PLC_BY_AREA = Object.freeze({
  [AREA_IDS.DRYER_CM]: Object.freeze([
    "D1C", "D2C", "D3C", "CMS1", "CM1", "CM BMS", "D1 BMS", "D2 BMS", "D3 BMS",
    "RCS", "PUGM", "FEED", "D12 DUST WEST"
  ]),
  [AREA_IDS.KILN_CTS]: Object.freeze([
    "K1", "K2", "K3", "K4", "K5", "K1 BMS", "K2 BMS", "K3 BMS",
    "CTT 1", "CTT2", "CTT3", "CTT4", "CTT5",
    "CC1", "CC2", "CC3", "CC4", "CC5", "CC5A",
    "DOS 1", "DOS 2", "KGS", "SLCU", "HSFO1", "HSFO2"
  ]),
  [AREA_IDS.FURNACE]: Object.freeze([
    "F1 FPC MPC", "F1 Motor", "F1 Feed", "F1 Insmon",
    "F2 FPC MPC", "F2 Motor", "F2 Feed", "F2 Mud Gun", "F2 Insmon",
    "F3 FPC MPC", "F3 Motor", "F3 Feed", "F3 Insmon",
    "F4 FPC MPC", "F4 Motor", "F4 Feed", "F4 Insmon", "F4 FCDS"
  ]),
  [AREA_IDS.CONVERTER]: Object.freeze([
    "C2", "C3", "C4", "GPX", "SSX", "C_BMS"
  ]),
});

// ---------------------------------------------------------------------------
// AUTHORIZATION TYPE — klasifikasi otorisasi jumper
// ---------------------------------------------------------------------------
export const AUTH_TYPE = Object.freeze({
  AUTHORIZED:     "Authorized",
  NON_AUTHORIZED: "Non-Authorized",
});

export const AUTH_TYPE_LIST = Object.freeze([
  AUTH_TYPE.AUTHORIZED,
  AUTH_TYPE.NON_AUTHORIZED,
]);

// ---------------------------------------------------------------------------
// JUMPER STATUS — 3-status system berdasarkan Due Date
// ---------------------------------------------------------------------------
export const JUMPER_STATUS = Object.freeze({
  ACTIVE:         "Active",          // Due Date > 7 hari ke depan (8+ hari)
  EXPIRING_SOON:  "Expiring Soon",   // Due Date hari ini sampai 7 hari ke depan (0-7 hari)
  EXPIRED:        "Expired",         // Due Date < hari ini
});

export const JUMPER_STATUS_LIST = Object.freeze([
  JUMPER_STATUS.ACTIVE,
  JUMPER_STATUS.EXPIRING_SOON,
  JUMPER_STATUS.EXPIRED,
]);

/**
 * Threshold hari (perbandingan kalender, bukan timestamp):
 *   - diff < 0                    → Expired
 *   - 0   .. EXPIRING_SOON_MAX_DAYS → Expiring Soon (inklusif hari ini)
 *   - > EXPIRING_SOON_MAX_DAYS    → Active
 * Satu lokasi terpusat — dipakai form, preview, PPTX, dan validasi.
 */
export const EXPIRING_SOON_MAX_DAYS = 7;

/** Palet warna setiap status jumper — digunakan di UI, Preview, dan PPTX. */
export const STATUS_COLORS = Object.freeze({
  [JUMPER_STATUS.ACTIVE]:         { bg: "#DCFCE7", text: "#166534" }, // light green
  [JUMPER_STATUS.EXPIRING_SOON]:  { bg: "#FEF3C7", text: "#92400E" }, // light amber
  [JUMPER_STATUS.EXPIRED]:        { bg: "#FEE2E2", text: "#991B1B" }, // light red
});

// ---------------------------------------------------------------------------
// WARNA KATEGORI UNTUK CHART
// ---------------------------------------------------------------------------
export const CATEGORY_COLORS = Object.freeze({
  Shortbranches: { base: "#BFBFBF", planBg: "rgba(191, 191, 191, 0.75)", planBorder: "#8C8C8C", actual: "#A52A98", actualPoint: "#A52A98" },
  Forces:        { base: "#008577", planBg: "rgba(0, 133, 119, 0.75)", planBorder: "#005a50", actual: "#A52A98", actualPoint: "#A52A98" },
  AFI:           { base: "#00B0F0", planBg: "rgba(0, 176, 240, 0.75)", planBorder: "#008dbf", actual: "#A52A98", actualPoint: "#A52A98" },
});

export const ACTUAL_COLOR = "#A52A98";