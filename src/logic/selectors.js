/**
 * selectors.js
 * Fungsi kalkulasi dan agregasi terpusat untuk PPA Jumper Audit Automation.
 *
 * Prinsip:
 *   - Semua fungsi bersifat PURE: tidak mengubah state sumber, tidak ada side effect.
 *   - Semua kalkulasi menggunakan Quantity untuk agregasi jumlah jumper (BR-04, BR-05, BR-07).
 *   - Penghitungan PLC selalu berdasarkan PLC unik, bukan jumlah record (BR-06, BR-07).
 *   - Jumper aktif = Removal Status = No (asumsi sementara, OQ-06 belum dikonfirmasi).
 *   - Fungsi yang bergantung pada OQ yang belum dikonfirmasi akan mengembalikan
 *     { ok: false, reason, data } agar pemanggil dapat menampilkan status yang jelas.
 *
 * Business Rules yang diimplementasikan:
 *   BR-03  remainingJumperList()
 *   BR-04  authorizedMocCount()
 *   BR-05  removedJumperCount()
 *   BR-06  remainingPlcRatio()
 *   BR-07  jumperCountPerPlc()
 *   BR-12  areaSummaryDiscrepancy() — WARNING ONLY, basis masih OQ
 *
 * Open Questions yang mempengaruhi kalkulasi:
 *   OQ-01  identificationYearFilter (BR-03)
 *   OQ-02  MOC_STATUS_QUALIFYING dan MOC_STATUS_REMAINING (BR-03, BR-04)
 *   OQ-03  AUTH_STATUS_QUALIFYING (BR-04)
 *   OQ-06  Definisi "jumper aktif" (BR-06, BR-07)
 *   OQ (discrepancy)  basis perbandingan area summary (BR-12)
 */

"use strict";

import {
  REMOVAL_STATUS,
  AUTH_STATUS_QUALIFYING,
  MOC_STATUS_QUALIFYING,
  MOC_STATUS_REMAINING,
  AREA_ID_LIST,
  CATEGORY_LIST,
} from "../model/constants.js";
import { APP_CONFIG } from "../model/config.js";

// ---------------------------------------------------------------------------
// HELPER INTERNAL
// ---------------------------------------------------------------------------

/**
 * Mengembalikan true jika record adalah jumper aktif.
 * [OQ-06] Asumsi sementara: aktif = Removal Status = No.
 * Jika aturan aktif berubah, hanya fungsi ini yang perlu diperbarui.
 * @param {object} record
 * @returns {boolean}
 */
function isActiveJumper(record) {
  return record.removalStatus === REMOVAL_STATUS.NO;
}

/**
 * Mengembalikan true jika record telah di-removed pada periode (week, year) yang diminta.
 *
 * [OQ-07] Konvensi pencocokan minggu: removalWeek (string label) dibandingkan langsung
 * dengan reportingWeekLabel (string label eksplisit dari pemanggil).
 * Ini menghindari asumsi tentang format label atau konversi integer → label.
 * Pemanggil bertanggung jawab menyediakan label yang tepat.
 *
 * @param {object} record
 * @param {number} reportingYear
 * @param {string} reportingWeekLabel — label string eksplisit minggu laporan (misal "W40")
 * @returns {boolean}
 */
function isRemovedInPeriod(record, reportingYear, reportingWeekLabel) {
  if (record.removalStatus !== REMOVAL_STATUS.YES) return false;
  if (record.removalYear !== reportingYear) return false;
  // Pencocokan label-ke-label: keduanya string eksplisit tanpa asumsi format.
  // [OQ-07] Jika konvensi minggu berubah, hanya pemanggil yang perlu menyesuaikan label.
  return record.removalWeek === reportingWeekLabel;
}

// ---------------------------------------------------------------------------
// BR-03: REMAINING JUMPER LIST
// ---------------------------------------------------------------------------

/**
 * Mengembalikan daftar record yang memenuhi filter Remaining Jumper List (BR-03).
 *
 * Filter:
 *   1. Removal Status = No
 *   2. MOC Status = Not Available (atau nilai di MOC_STATUS_REMAINING)
 *   3. Identification Year memenuhi identificationYearFilter dari config
 *
 * Jika identificationYearFilter = null (OQ-01 belum dikonfirmasi):
 *   Mengembalikan { ok: false, reason, data: [] }
 *   JANGAN menganggap hasil filter sebagai final.
 *
 * @param {object[]} jumperRegister
 * @param {object} appConfig — APP_CONFIG atau subset { reporting: { identificationYearFilter } }
 * @returns {{ ok: boolean, reason?: string, data: object[] }}
 */
export function remainingJumperList(jumperRegister, appConfig = APP_CONFIG) {
  const yearFilter = appConfig.reporting.identificationYearFilter;

  if (yearFilter === null || yearFilter === undefined) {
    return {
      ok: false,
      reason:
        "[OQ-01] identificationYearFilter belum dikonfigurasi. " +
        "Remaining Jumper List tidak dapat dihitung. " +
        "Isi APP_CONFIG.reporting.identificationYearFilter setelah konfirmasi pemilik proses.",
      data: [],
    };
  }

  const data = jumperRegister.filter(
    (r) =>
      r.removalStatus === REMOVAL_STATUS.NO &&
      MOC_STATUS_REMAINING.includes(r.mocStatus) &&
      r.identificationYear === yearFilter
  );

  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// BR-04: AUTHORIZED / MOC COUNT
// ---------------------------------------------------------------------------

/**
 * Menghitung total Quantity record yang memenuhi syarat Authorized/MoC (BR-04).
 *
 * Syarat:
 *   - Authorization Status ∈ AUTH_STATUS_QUALIFYING (placeholder OQ-03)
 *   - MOC Status ∈ MOC_STATUS_QUALIFYING (placeholder OQ-02)
 *   - Keduanya harus terpenuhi sekaligus.
 *
 * Catatan: status Pending tidak dihitung (BR-09).
 * [OQ-02, OQ-03] Nilai qualifying masih placeholder.
 *
 * @param {object[]} jumperRegister
 * @returns {{ count: number, records: object[], placeholderWarning: string }}
 */
export function authorizedMocCount(jumperRegister) {
  const records = jumperRegister.filter(
    (r) =>
      AUTH_STATUS_QUALIFYING.includes(r.authorizationStatus) &&
      MOC_STATUS_QUALIFYING.includes(r.mocStatus)
  );

  const count = records.reduce((sum, r) => sum + (r.quantity ?? 0), 0);

  return {
    count,
    records,
    placeholderWarning:
      "[OQ-02, OQ-03] Nilai AUTH_STATUS_QUALIFYING dan MOC_STATUS_QUALIFYING " +
      "masih placeholder. Konfirmasi dengan pemilik proses sebelum menggunakan " +
      "angka ini dalam laporan resmi.",
  };
}

// ---------------------------------------------------------------------------
// BR-05: TOTAL REMOVED JUMPER (periode laporan)
// ---------------------------------------------------------------------------

/**
 * Menghitung total Quantity jumper yang di-removed pada periode laporan (BR-05).
 *
 * Cocok jika:
 *   - Removal Status = Yes
 *   - Removal Year = reportingYear
 *   - Removal Week (string label) cocok tepat dengan reportingWeekLabel
 *
 * [OQ-07] Pemanggil menyediakan reportingWeekLabel sebagai string label eksplisit
 * (misalnya "W40") — tidak ada konversi integer → label di dalam fungsi ini.
 * Ini mencegah asumsi tentang format label minggu sebelum OQ-07 dikonfirmasi.
 *
 * @param {object[]} jumperRegister
 * @param {number} reportingYear
 * @param {string} reportingWeekLabel — label string eksplisit minggu laporan (misalnya "W40")
 * @returns {{ count: number, records: object[] }}
 */
export function removedJumperCount(jumperRegister, reportingYear, reportingWeekLabel) {
  const records = jumperRegister.filter((r) =>
    isRemovedInPeriod(r, reportingYear, reportingWeekLabel)
  );

  const count = records.reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  return { count, records };
}

// ---------------------------------------------------------------------------
// BR-06: REMAINING PLC RATIO
// ---------------------------------------------------------------------------

/**
 * Menghitung rasio PLC yang masih memiliki minimal satu jumper aktif (BR-06).
 *
 * Formula: uniqueActivePlcCount / totalPlcInScope
 *
 * "Jumper aktif" = Removal Status = No (OQ-06, asumsi sementara).
 * PLC dihitung berdasarkan nilai unik field `plc` — bukan jumlah record.
 *
 * Jika totalPlcInScope = null atau 0: tidak dapat dihitung.
 *
 * @param {object[]} jumperRegister
 * @param {number|null} totalPlcInScope — dari config.totalPlcInScope
 * @returns {{ ok: boolean, reason?: string, activePlcCount: number, totalPlcInScope: number, ratio: number|null, activePlcList: string[] }}
 */
export function remainingPlcRatio(jumperRegister, totalPlcInScope) {
  if (!totalPlcInScope || totalPlcInScope <= 0) {
    return {
      ok: false,
      reason:
        "Total PLC in Scope harus bilangan bulat positif untuk menghitung Remaining PLC ratio.",
      activePlcCount: 0,
      totalPlcInScope: totalPlcInScope ?? null,
      ratio: null,
      activePlcList: [],
    };
  }

  // Kumpulkan PLC unik dari jumper aktif
  const activePlcSet = new Set(
    jumperRegister.filter(isActiveJumper).map((r) => r.plc).filter(Boolean)
  );

  const activePlcCount = activePlcSet.size;
  const ratio = activePlcCount / totalPlcInScope;

  return {
    ok: true,
    activePlcCount,
    totalPlcInScope,
    ratio,
    activePlcList: Array.from(activePlcSet).sort(), // sort hanya untuk tampilan, tidak mengubah data sumber
  };
}

// ---------------------------------------------------------------------------
// BR-07: JUMPER COUNT PER PLC (untuk grafik)
// ---------------------------------------------------------------------------

/**
 * Mengagregasikan Quantity per PLC dan Category, mengecualikan jumper removed (BR-07).
 *
 * "Jumper aktif" = Removal Status = No (OQ-06, asumsi sementara).
 * PLC diidentifikasi berdasarkan nilai field `plc` (unik per string).
 * Category yang dikembalikan mengikuti urutan CATEGORY_LIST.
 *
 * @param {object[]} jumperRegister
 * @returns {object[]} Array { plc, byCategory: { [category]: number }, total: number }
 *   — diurutkan berdasarkan plc string (untuk konsistensi, bukan untuk makna bisnis)
 */
export function jumperCountPerPlc(jumperRegister) {
  const activeRecords = jumperRegister.filter(isActiveJumper);

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

    catMap[cat] = (catMap[cat] ?? 0) + (record.quantity ?? 0);
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
 *   - Basis perbandingan masih OQ (belum dikonfirmasi pemilik proses).
 *
 * Strategi sementara: bandingkan jumperCount manual dengan
 *   sum(Quantity) dari record aktif per areaId.
 * [OQ] Apakah basis adalah record_count, quantity_sum, atau active_quantity_sum
 *   belum dikonfirmasi. Tandai hasil sebagai "unconfirmed_basis".
 *
 * @param {object[]} areaSummary   — dari state.areaSummary (nilai manual)
 * @param {object[]} jumperRegister
 * @param {object} appConfig
 * @returns {{ basis: string, warnings: object[] }}
 *   warnings: array { areaId, manualCount, computedCount, discrepancy: boolean }
 */
export function areaSummaryDiscrepancy(areaSummary, jumperRegister, appConfig = APP_CONFIG) {
  const basis = appConfig.discrepancyWarning.basis;

  // Hitung kuantitas aktif per area dari register
  const computedByArea = {};
  for (const areaId of AREA_ID_LIST) {
    computedByArea[areaId] = jumperRegister
      .filter((r) => r.areaId === areaId && isActiveJumper(r))
      .reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  }

  const warnings = areaSummary.map(({ areaId, jumperCount }) => {
    const computedCount = computedByArea[areaId] ?? 0;
    return {
      areaId,
      manualCount: jumperCount,
      computedCount,
      discrepancy: jumperCount !== null && jumperCount !== computedCount,
      basisNote:
        basis === null
          ? "[OQ] Basis perbandingan belum dikonfirmasi. Angka register dihitung " +
            "sebagai sum(Quantity) jumper aktif per area (asumsi sementara)."
          : `Basis: ${basis}`,
    };
  });

  return {
    basis: basis ?? "unconfirmed_basis",
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
// AGREGASI JUMLAH JUMPER TOTAL (semua aktif)
// ---------------------------------------------------------------------------

/**
 * Menghitung total Quantity semua jumper aktif per area.
 * Digunakan untuk perbandingan discrepancy dan statistik internal.
 * [OQ-06] Asumsi aktif = Removal=No.
 *
 * @param {object[]} jumperRegister
 * @returns {object} { [areaId]: number }
 */
export function activeJumperQuantityByArea(jumperRegister) {
  const result = {};
  for (const areaId of AREA_ID_LIST) {
    result[areaId] = jumperRegister
      .filter((r) => r.areaId === areaId && isActiveJumper(r))
      .reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  }
  return result;
}
