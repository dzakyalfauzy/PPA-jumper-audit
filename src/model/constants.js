/**
 * constants.js
 * Enum terpusat untuk PPA Jumper Audit Automation.
 *
 * PENTING — Status Open Questions:
 *   OQ-02: Daftar resmi MOC Status belum dikonfirmasi pemilik proses.
 *   OQ-03: Daftar resmi Authorization Status belum dikonfirmasi pemilik proses.
 *   OQ-06: Definisi "jumper aktif" (apakah hanya Removal=No?) belum dikonfirmasi.
 *   OQ-08: Definisi persis Authorized/MoC pada judul KPI belum dikonfirmasi.
 *
 * Enum di bawah adalah PLACEHOLDER awal berdasarkan PRD §8.5 dan Lampiran A.
 * Nilai dan label harus disesuaikan dengan terminologi pemilik proses sebelum
 * digunakan dalam laporan resmi. Tandai dengan [PLACEHOLDER] pada komentar.
 *
 * Jangan ubah key internal (e.g. AUTHORIZED) tanpa memperbarui semua referensi
 * di validation.js, selectors.js, dan config.js.
 */

"use strict";

// ---------------------------------------------------------------------------
// AREA IDs
// Digunakan sebagai key internal di seluruh state, validasi, dan kalkulasi.
// Label tampilan ditentukan di AREA_LABELS.
// ---------------------------------------------------------------------------
export const AREA_IDS = Object.freeze({
  DRYER_CM:  "dryer_cm",
  KILN_CTS:  "kiln_cts",
  FURNACE:   "furnace",
  CONVERTER: "converter",
});

/** Daftar ordered area ID yang valid (urutan tampilan slide). */
export const AREA_ID_LIST = Object.freeze([
  AREA_IDS.DRYER_CM,
  AREA_IDS.KILN_CTS,
  AREA_IDS.FURNACE,
  AREA_IDS.CONVERTER,
]);

/** Label tampilan untuk setiap area ID. */
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
// AUTHORIZATION STATUS
// [PLACEHOLDER] — OQ-03: nilai resmi belum dikonfirmasi pemilik proses.
// Nilai internal (key) tidak boleh diubah tanpa memperbarui semua referensi.
// ---------------------------------------------------------------------------
export const AUTH_STATUS = Object.freeze({
  AUTHORIZED:          "Authorized",           // memenuhi BR-04 jika MOC juga memenuhi
  NOT_AUTHORIZED:      "Not Authorized",       // tidak memenuhi BR-04
  PENDING_CONFIRMATION:"Pending Confirmation", // tidak dihitung; tampilkan sebagai pending [PLACEHOLDER]
});

export const AUTH_STATUS_LIST = Object.freeze([
  AUTH_STATUS.AUTHORIZED,
  AUTH_STATUS.NOT_AUTHORIZED,
  AUTH_STATUS.PENDING_CONFIRMATION,
]);

/**
 * Status yang dianggap memenuhi syarat otorisasi pada BR-04.
 * [OQ-03] Konfirmasi dengan pemilik proses sebelum digunakan pada laporan resmi.
 */
export const AUTH_STATUS_QUALIFYING = Object.freeze([
  AUTH_STATUS.AUTHORIZED,
]);

// ---------------------------------------------------------------------------
// MOC STATUS
// [PLACEHOLDER] — OQ-02: nilai resmi belum dikonfirmasi pemilik proses.
// ---------------------------------------------------------------------------
export const MOC_STATUS = Object.freeze({
  APPROVED_COMPLETE: "Approved/Complete", // memenuhi BR-04 jika authorization juga memenuhi
  NOT_AVAILABLE:     "Not Available",     // kandidat BR-03 jika aktif dan tahun memenuhi
  PENDING:           "Pending",           // tidak memenuhi BR-04; bukan otomatis Not Available [PLACEHOLDER]
  NOT_REQUIRED:      "Not Required",      // tidak memenuhi BR-04 kecuali aturan resmi menetapkan lain [PLACEHOLDER]
});

export const MOC_STATUS_LIST = Object.freeze([
  MOC_STATUS.APPROVED_COMPLETE,
  MOC_STATUS.NOT_AVAILABLE,
  MOC_STATUS.PENDING,
  MOC_STATUS.NOT_REQUIRED,
]);

/**
 * Status MOC yang dianggap memenuhi syarat pada BR-04.
 * [OQ-02] Konfirmasi dengan pemilik proses.
 */
export const MOC_STATUS_QUALIFYING = Object.freeze([
  MOC_STATUS.APPROVED_COMPLETE,
]);

/**
 * Status MOC yang menjadikan jumper aktif masuk Remaining Jumper List (BR-03).
 * [OQ-02] Konfirmasi dengan pemilik proses.
 */
export const MOC_STATUS_REMAINING = Object.freeze([
  MOC_STATUS.NOT_AVAILABLE,
]);

// ---------------------------------------------------------------------------
// REMOVAL STATUS
// ---------------------------------------------------------------------------
export const REMOVAL_STATUS = Object.freeze({
  YES: "Yes",
  NO:  "No",
});

export const REMOVAL_STATUS_LIST = Object.freeze([
  REMOVAL_STATUS.YES,
  REMOVAL_STATUS.NO,
]);

// ---------------------------------------------------------------------------
// DUE DATE CONFIRMATION STATUS
// Digunakan bersamaan dengan nilai due date; simpan terpisah (§8.6).
// ---------------------------------------------------------------------------
export const DUE_DATE_STATUS = Object.freeze({
  CONFIRMED:   "confirmed",    // memiliki tanggal yang valid
  UNCONFIRMED: "unconfirmed",  // "Need to confirm the due date" atau setara
});

export const DUE_DATE_STATUS_LIST = Object.freeze([
  DUE_DATE_STATUS.CONFIRMED,
  DUE_DATE_STATUS.UNCONFIRMED,
]);

// ---------------------------------------------------------------------------
// WEEK DEFINITIONS & DROPDOWN CHOICES
// W1 sampai W52
// ---------------------------------------------------------------------------
export const STANDARD_WEEKS = Object.freeze(
  Array.from({ length: 52 }, (_, i) => `W${i + 1}`)
);

/**
 * Normalisasi dan parse week label legacy atau modern ke struktur terstandar.
 * Contoh:
 *   "wk40" -> { weekNumber: 40, label: "W40", year: null }
 *   "W40" -> { weekNumber: 40, label: "W40", year: null }
 *   "wk1('25)" -> { weekNumber: 1, label: "W1 ('25)", year: 2025 }
 *   "wk1('26)" -> { weekNumber: 1, label: "W1 ('26)", year: 2026 }
 *   40 -> { weekNumber: 40, label: "W40", year: null }
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
 * Menjamin tahun (jika ada) dan nomor minggu terurut numerik, bukan alfabetik.
 * Contoh: W9 sebelum W10; W1('25) sebelum W1('26).
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
// MATRIKS GRAFIK
// 12 kombinasi Area × Category yang harus dirender.
// Urutan ini menentukan urutan tampilan di slide.
// ---------------------------------------------------------------------------
export const CHART_MATRIX = Object.freeze(
  AREA_ID_LIST.flatMap((areaId) =>
    CATEGORY_LIST.map((category) => Object.freeze({ areaId, category }))
  )
);
// Hasil: 12 object { areaId, category } — index 0–11.
