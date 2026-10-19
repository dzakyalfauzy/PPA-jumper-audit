/**
 * selectors.js
 * Fungsi kalkulasi dan agregasi terpusat untuk PPA Jumper Audit Automation (revisi).
 *
 * Prinsip:
 *   - Semua fungsi bersifat PURE: tidak mengubah state sumber, tidak ada side effect.
 *   - Jumper "aktif" = Due Date status Active atau Expiring Soon (bukan Expired, bukan null).
 *   - Penghitungan PLC selalu berdasarkan PLC unik, bukan jumlah record.
 *   - Fungsi yang bergantung pada definisi bisnis yang belum dikonfirmasi akan mengembalikan
 *     status yang jelas (unavailable) agar pemanggil dapat menampilkan status yang benar.
 *
 * Business Rules yang diimplementasikan (revisi):
 *   - NEW: getJumperStatus — 3-status dari Due Date
 *   - NEW: plcsWithoutActiveJumpers — PLC tanpa jumper aktif (metric terbalik)
 *   - BR-07: jumperCountPerPlc — agregasi per PLC & kategori (jumper aktif saja)
 *   - BR-12: areaSummaryDiscrepancy — WARNING ONLY
 *   - Task C: calculateAreaSummariesFromWeeklyChart — Area Summary dari Actual
 *
 * Dihapus (field dasar tidak ada lagi):
 *   - BR-03: remainingJumperList (filter Removal/MOC/Identification Year)
 *   - BR-04: authorizedMocCount (filter Authorization/MOC)
 *   - BR-05: removedJumperCount (filter Removal Week/Year)
 *   - OQ-01: identificationYearFilter
 */

"use strict";

import {
  JUMPER_STATUS,
  EXPIRING_SOON_MAX_DAYS,
  AREA_ID_LIST,
  CATEGORY_LIST,
  AUTH_TYPE,
} from "../model/constants.js";
import { APP_CONFIG } from "../model/config.js";

// ---------------------------------------------------------------------------
// DERIVED JUMPER STATUS (dari Due Date)
// ---------------------------------------------------------------------------
// Status TIDAK disimpan di state — selalu dihitung ulang dari dueDate + today.
// Threshold terpusat di EXPIRING_SOON_MAX_DAYS (constants.js).
// Valid: jika dueDate null / format tidak valid → null (bukan Active — data belum lengkap).

/** Parse string YYYY-MM-DD menjadi Date (lokal, tanpa timezone shift), atau null. */
function parseIsoDate(value) {
  if (typeof value !== "string") return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  // Verifikasi tidak ada overflow (mis. 2026-02-31)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/** Hitung selisih hari kalender (bukan timestamp) target - today. */
function calendarDayDiff(target, today) {
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((utcTarget - utcToday) / 86400000);
}

/**
 * Menentukan status jumper dari Due Date (3-status system).
 *
 * Aturan (selisih hari kalender = Due Date - hari ini):
 *   - diff < 0                            → "Expired"
 *   - 0 .. EXPIRING_SOON_MAX_DAYS (0–7)   → "Expiring Soon" (inklusif hari ini)
 *   - > EXPIRING_SOON_MAX_DAYS (> 7)      → "Active"
 *   - dueDate null / tidak valid          → null (BUKAN Active — data belum lengkap)
 *
 * Perbandingan memakai tanggal kalender, bukan timestamp (hindari selisih timezone).
 *
 * @param {string|null} dueDate — "YYYY-MM-DD"
 * @param {Date} [today] — injection untuk test deterministik
 * @returns {string|null} JUMPER_STATUS value atau null
 */
export function getJumperStatus(dueDate, today = new Date()) {
  const due = parseIsoDate(dueDate);
  if (!due) return null;

  const diff = calendarDayDiff(due, today);

  if (diff < 0) return JUMPER_STATUS.EXPIRED;
  if (diff <= EXPIRING_SOON_MAX_DAYS) return JUMPER_STATUS.EXPIRING_SOON;
  return JUMPER_STATUS.ACTIVE;
}

/**
 * Menghitung distribusi status seluruh register.
 * Record tanpa Due Date valid dihitung dalam `noDate`, bukan sebagai Active.
 *
 * @param {object[]} jumperRegister
 * @param {Date} [today]
 * @returns {{ active: number, expiringSoon: number, expired: number, noDate: number, total: number }}
 */
export function jumperStatusCounts(jumperRegister, today = new Date()) {
  const counts = { active: 0, expiringSoon: 0, expired: 0, noDate: 0, total: jumperRegister.length };
  for (const r of jumperRegister) {
    const s = getJumperStatus(r.dueDate, today);
    if (s === JUMPER_STATUS.ACTIVE) counts.active++;
    else if (s === JUMPER_STATUS.EXPIRING_SOON) counts.expiringSoon++;
    else if (s === JUMPER_STATUS.EXPIRED) counts.expired++;
    else counts.noDate++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// HELPER INTERNAL
// ---------------------------------------------------------------------------

/**
 * Mengembalikan true jika record adalah jumper aktif.
 * Sesuai aturan bisnis:
 * - Active: Due Date > 7 hari
 * - Expiring Soon: Due Date 0–7 hari
 * - Expired: Due Date telah lewat
 * Jumper berstatus Expired tetap dihitung sebagai jumper aktif selama record
 * jumper tersebut masih ada dan belum dinyatakan tidak aktif melalui aturan bisnis yang berlaku.
 * Record tanpa Due Date valid (null / kosong / format tidak valid) TIDAK aktif (status belum tersedia).
 *
 * @param {object} record
 * @param {Date} [today]
 * @returns {boolean}
 */
function isActiveJumper(record, today = new Date()) {
  const status = getJumperStatus(record.dueDate, today);
  return (
    status === JUMPER_STATUS.ACTIVE ||
    status === JUMPER_STATUS.EXPIRING_SOON ||
    status === JUMPER_STATUS.EXPIRED
  );
}

// ---------------------------------------------------------------------------
// PLC METRIC — PLCs With Active Jumper / Total PLCs
// ---------------------------------------------------------------------------

/**
 * Menghitung metrik PLC: PLCs With Active Jumper / Total PLCs.
 *
 * Aturan bisnis:
 *   - Label tampilan: PLCs With Active Jumper / Total PLCs.
 *   - Pembilang yang ditampilkan: jumlah PLC unik yang memiliki jumper aktif (plcsWithActive).
 *   - Penyebut: Total PLCs in Scope (totalPlcInScope).
 *   - Persentase: tetap menggunakan jumlah PLC tanpa active jumper dibagi total PLC:
 *       (plcsWithoutActive / totalPlcInScope) * 100.
 *   - Jumper berstatus Expired tetap dihitung sebagai jumper aktif.
 *   - PLC unik: PLC yang sama dengan beberapa jumper hanya dihitung satu kali.
 *   - Record tanpa Due Date valid (null / kosong) tidak dihitung sebagai jumper aktif.
 *
 * @param {object[]} jumperRegister
 * @param {number|null} totalPlcInScope — dari config.totalPlcInScope
 * @param {Date} [today]
 * @returns {{
 *   ok: boolean,
 *   reason?: string,
 *   plcsWithoutActive: number,
 *   plcsWithActive: number,
 *   totalPlcInScope: number|null,
 *   percentage: number|null,
 *   activePlcList: string[],
 *   warning?: string
 * }}
 */
export function plcsWithoutActiveJumpers(jumperRegister, totalPlcInScope, today = new Date()) {
  const total = Number(totalPlcInScope);
  if (!Number.isInteger(total) || total <= 0) {
    return {
      ok: false,
      reason: "Total PLC in Scope harus bilangan bulat positif untuk menghitung PLC metric.",
      plcsWithoutActive: 0,
      plcsWithActive: 0,
      totalPlcInScope: totalPlcInScope ?? null,
      percentage: null,
      activePlcList: [],
    };
  }

  // Kumpulkan PLC unik dari jumper aktif (PLC yang sama hanya dihitung satu kali)
  const activePlcSet = new Set(
    (Array.isArray(jumperRegister) ? jumperRegister : [])
      .filter((r) => r && isActiveJumper(r, today))
      .map((r) => r.plc)
      .filter(Boolean)
  );

  const plcsWithActive = activePlcSet.size;
  const plcsWithoutActive = Math.max(0, total - plcsWithActive);
  const percentage = (plcsWithoutActive / total) * 100;

  // Warning jika known PLCs > totalPlcInScope (data inconsistent)
  let warning = null;
  const knownPlcs = new Set(
    (Array.isArray(jumperRegister) ? jumperRegister : [])
      .map((r) => r && r.plc)
      .filter(Boolean)
  );
  if (knownPlcs.size > total) {
    warning = `Known PLCs in register (${knownPlcs.size}) melebihi Total PLC in Scope (${total}). Hasil mungkin tidak akurat.`;
  }

  return {
    ok: true,
    plcsWithoutActive,
    plcsWithActive,
    totalPlcInScope: total,
    percentage,
    activePlcList: Array.from(activePlcSet).sort(),
    warning,
  };
}

// ---------------------------------------------------------------------------
// BR-07: JUMPER COUNT PER PLC (untuk grafik) — hanya jumper aktif
// ---------------------------------------------------------------------------

/**
 * Mengagregasikan Quantity per PLC dan Category, hanya jumper aktif.
 * Quantity default = 1 (field quantity dihapus dari schema).
 *
 * @param {object[]} jumperRegister
 * @param {Date} [today]
 * @returns {object[]} Array { plc, byCategory: { [category]: number }, total: number }
 *   — diurutkan berdasarkan plc string (untuk konsistensi tampilan)
 */
export function jumperCountPerPlc(jumperRegister, today = new Date()) {
  const activeRecords = jumperRegister.filter((r) => isActiveJumper(r, today));

  // Bangun map: plc → { category → totalQuantity }
  const plcMap = new Map();

  for (const record of activeRecords) {
    const plc = record.plc;
    if (!plc) continue;

    if (!plcMap.has(plc)) {
      plcMap.set(plc, {});
    }
    const catMap = plcMap.get(plc);
    const cat = record.category;
    if (!cat) continue;

    catMap[cat] = (catMap[cat] ?? 0) + 1; // quantity default 1
  }

  // Konversi ke array yang terstruktur
  const result = [];
  for (const [plc, catMap] of plcMap.entries()) {
    const byCategory = {};
    let total = 0;
    for (const cat of CATEGORY_LIST) {
      const qty = catMap[cat] ?? 0;
      byCategory[cat] = qty;
      total += qty;
    }
    result.push({ plc, byCategory, total });
  }

  // Sort berdasarkan nama PLC untuk konsistensi tampilan
  result.sort((a, b) => a.plc.localeCompare(b.plc));
  return result;
}

// ---------------------------------------------------------------------------
// BR-12: DISCREPANCY WARNING (area summary manual vs register)
// ---------------------------------------------------------------------------

/**
 * Menghasilkan warning discrepancy antara areaSummary manual dan register.
 *
 * PENTING:
 *   - Fungsi ini TIDAK mengubah nilai areaSummary (BR-01, BR-12).
 *   - Hasil hanya digunakan untuk menampilkan warning informatif.
 *   - Basis perbandingan: sum(Quantity=1) dari record aktif per areaId.
 *
 * @param {object[]} areaSummary   — dari state.areaSummary (nilai manual)
 * @param {object[]} jumperRegister
 * @returns {{ basis: string, warnings: object[] }}
 *   warnings: array { areaId, manualCount, computedCount, discrepancy: boolean }
 */
export function areaSummaryDiscrepancy(areaSummary, jumperRegister) {
  // Hitung kuantitas aktif per area dari register (default quantity = 1)
  const computedByArea = {};
  for (const areaId of AREA_ID_LIST) {
    computedByArea[areaId] = jumperRegister
      .filter((r) => r.areaId === areaId && isActiveJumper(r))
      .length; // quantity = 1 per record
  }

  const warnings = areaSummary.map(({ areaId, jumperCount }) => {
    const computedCount = computedByArea[areaId] ?? 0;
    return {
      areaId,
      manualCount: jumperCount,
      computedCount,
      discrepancy: jumperCount !== null && jumperCount !== computedCount,
      basisNote: "Basis: jumlah record aktif (Due Date valid) per area. Quantity default 1.",
    };
  });

  return {
    basis: "active_record_count_per_area",
    warnings,
  };
}

// ---------------------------------------------------------------------------
// TASK C: AUTOMATIC AREA SUMMARY (Berdasarkan Total Actual pada Reporting Week)
// ---------------------------------------------------------------------------

/**
 * Menghitung Area Summary otomatis untuk area dan periode pelaporan tertentu (Task C):
 * Area Summary(area, reporting period) = sum of Actual values for all applicable categories
 * belonging to that area and reporting period.
 *
 * Persyaratan:
 * 1. Menggunakan Reporting Year dan Reporting Week secara eksplisit.
 * 2. Tidak menggunakan nilai Plan.
 * 3. Tidak dihitung dari Jumper Register.
 * 4. Tidak mengubah null/missing Actual menjadi 0 secara diam-diam.
 * 5. Jika ada kategori yang Actual-nya null atau belum terisi, tandai status data tidak lengkap ({ isComplete: false }).
 *
 * @param {object[]} weeklyChartData - state.weeklyChartData
 * @param {string|number} reportingWeek - misal 40 atau "W40"
 * @param {number|null} [reportingYear] - misal 2026
 * @returns {Record<string, { totalActual: number|null, isComplete: boolean, categoryValues: Record<string, number|null> }>}
 */
export function calculateAreaSummariesFromWeeklyChart(weeklyChartData, reportingWeek, reportingYear = null) {
  const result = {};

  // Normalisasi target week label
  const targetWeekStr = reportingWeek != null ? String(reportingWeek).trim().toUpperCase() : "";
  const targetWNum = parseInt(targetWeekStr.replace(/\D/g, ""), 10);

  for (const areaId of AREA_ID_LIST) {
    let sum = 0;
    let hasAnyValue = false;
    let isComplete = true;
    const categoryValues = {};

    for (const category of CATEGORY_LIST) {
      // Cari row di weeklyChartData yang cocok dengan areaId, category, dan week
      const matchingRows = weeklyChartData.filter((row) => {
        if (row.areaId !== areaId || row.category !== category) return false;
        const rowWeekStr = String(row.week || "").trim().toUpperCase();
        const rowWNum = parseInt(rowWeekStr.replace(/\D/g, ""), 10);
        return rowWeekStr === targetWeekStr || (targetWNum && rowWNum === targetWNum);
      });

      if (matchingRows.length === 0) {
        categoryValues[category] = null;
        isComplete = false;
      } else {
        const actualVal = matchingRows[0].actual;
        categoryValues[category] = actualVal;
        if (actualVal === null || actualVal === undefined) {
          isComplete = false;
        } else {
          hasAnyValue = true;
          sum += actualVal;
        }
      }
    }

    result[areaId] = {
      totalActual: isComplete ? sum : (hasAnyValue ? sum : null),
      isComplete,
      categoryValues,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// AGREGASI JUMLAH JUMPER AKTIF PER AREA
// ---------------------------------------------------------------------------

/**
 * Menghitung total Quantity (default 1) semua jumper aktif per area.
 * Digunakan untuk perbandingan discrepancy dan statistik internal.
 *
 * @param {object[]} jumperRegister
 * @param {Date} [today]
 * @returns {object} { [areaId]: number }
 */
export function activeJumperQuantityByArea(jumperRegister, today = new Date()) {
  const result = {};
  for (const areaId of AREA_ID_LIST) {
    result[areaId] = jumperRegister
      .filter((r) => r.areaId === areaId && isActiveJumper(r, today))
      .length; // quantity = 1 per record
  }
  return result;
}

// ---------------------------------------------------------------------------
// FILTER REGISTER BERDASARKAN AUTHORIZATION TYPE (Phase 3.1)
// ---------------------------------------------------------------------------

/**
 * Mengembalikan daftar record yang berstatus Authorized secara eksak.
 * Tidak menggunakan status, due date, PLC, area, category, atau keberadaan record sebagai pengganti.
 * PURE function: tidak memutasi array atau record sumber.
 *
 * @param {object[]} jumperRegister
 * @returns {object[]}
 */
export function getAuthorizedJumpers(jumperRegister) {
  if (!Array.isArray(jumperRegister)) return [];
  return jumperRegister.filter((r) => r && r.authorizationType === AUTH_TYPE.AUTHORIZED);
}

/**
 * Mengembalikan daftar record yang berstatus Non-Authorized secara eksak.
 * Tidak menggunakan status, due date, PLC, area, category, atau keberadaan record sebagai pengganti.
 * PURE function: tidak memutasi array atau record sumber.
 *
 * @param {object[]} jumperRegister
 * @returns {object[]}
 */
export function getNonAuthorizedJumpers(jumperRegister) {
  if (!Array.isArray(jumperRegister)) return [];
  return jumperRegister.filter((r) => r && r.authorizationType === AUTH_TYPE.NON_AUTHORIZED);
}