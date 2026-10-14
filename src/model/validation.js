/**
 * validation.js
 * Fungsi validasi terpusat untuk PPA Jumper Audit Automation.
 *
 * Prinsip:
 *   - Nilai null BUKAN sama dengan 0 atau string kosong (BR-02, §1.2).
 *   - Validasi tidak mengubah nilai input — hanya melaporkan error/warning.
 *   - Error memblokir export; warning bersifat informatif dan tidak mengubah data.
 *   - Pesan error harus spesifik: sebutkan field dan tindakan yang dibutuhkan (§15.1).
 *   - Status pending/unknown tidak dianggap memenuhi kondisi bisnis (BR-09).
 *
 * Return convention:
 *   Setiap fungsi validasi mengembalikan:
 *   { valid: boolean, errors: string[], warnings: string[] }
 *   - errors: memblokir export
 *   - warnings: informatif, tidak memblokir
 */

"use strict";

import {
  AREA_ID_LIST,
  AREA_LABELS,
  CATEGORY_LIST,
  PLC_BY_AREA,
  JUMPER_STATUS,
  DUE_SOON_MAX_DAYS,
} from "./constants.js";
import { getJumperStatus } from "../logic/selectors.js";
import { APP_CONFIG } from "./config.js";

// ---------------------------------------------------------------------------
// HELPER INTERNAL
// ---------------------------------------------------------------------------

function isNullOrUndefined(v) {
  return v === null || v === undefined;
}

function isPositiveInteger(v) {
  return Number.isInteger(v) && v > 0;
}

function isNonNegativeInteger(v) {
  return Number.isInteger(v) && v >= 0;
}

function isNonNegativeNumber(v) {
  return typeof v === "number" && isFinite(v) && v >= 0;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidYear(v) {
  return (
    Number.isInteger(v) &&
    v >= APP_CONFIG.yearRange.min &&
    v <= APP_CONFIG.yearRange.max
  );
}

function isValidWeek(v) {
  return (
    Number.isInteger(v) &&
    v >= APP_CONFIG.weekRange.min &&
    v <= APP_CONFIG.weekRange.max
  );
}

function makeResult(errors = [], warnings = []) {
  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// VALIDASI CONFIG (Form A — Report Information)
// ---------------------------------------------------------------------------

/**
 * Memvalidasi object config laporan.
 * @param {object} config
 * @returns {{ valid, errors, warnings }}
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!isNonEmptyString(config.title)) {
    errors.push("Report Title wajib diisi dan tidak boleh kosong.");
  }

  if (!isNonEmptyString(config.plantArea)) {
    errors.push("Plant Area wajib diisi dan tidak boleh kosong.");
  }

  if (isNullOrUndefined(config.reportingYear)) {
    errors.push("Reporting Year wajib diisi.");
  } else if (!isValidYear(config.reportingYear)) {
    errors.push(
      `Reporting Year tidak valid (${config.reportingYear}). ` +
      `Masukkan tahun antara ${APP_CONFIG.yearRange.min} dan ${APP_CONFIG.yearRange.max}.`
    );
  }

  if (isNullOrUndefined(config.reportingWeek)) {
    errors.push("Reporting Week wajib diisi.");
  } else if (!isValidWeek(config.reportingWeek)) {
    errors.push(
      `Reporting Week tidak valid (${config.reportingWeek}). ` +
      `Masukkan angka antara ${APP_CONFIG.weekRange.min} dan ${APP_CONFIG.weekRange.max}.`
    );
  }

  if (!Array.isArray(config.weekLabels) || config.weekLabels.length === 0) {
    errors.push("Chart Week Labels wajib diisi dengan minimal satu label minggu.");
  } else {
    // Cek duplikat label
    const seen = new Set();
    config.weekLabels.forEach((label, idx) => {
      if (!isNonEmptyString(label)) {
        errors.push(`Chart Week Labels[${idx}] tidak boleh kosong.`);
      } else if (seen.has(label.trim())) {
        errors.push(`Chart Week Labels mengandung label duplikat: "${label}". Label harus unik.`);
      } else {
        seen.add(label.trim());
      }
    });
  }

  if (isNullOrUndefined(config.totalPlcInScope)) {
    errors.push("Total PLC in Scope wajib diisi (digunakan sebagai denominator Remaining PLC).");
  } else if (!isPositiveInteger(config.totalPlcInScope)) {
    errors.push(
      `Total PLC in Scope harus bilangan bulat positif (diisi: ${config.totalPlcInScope}).`
    );
  }

  return makeResult(errors, warnings);
}

// ---------------------------------------------------------------------------
// VALIDASI AREA SUMMARY (Form A — Area Summary)
// ---------------------------------------------------------------------------

/**
 * Memvalidasi array areaSummary.
 * @param {Array} areaSummary
 * @returns {{ valid, errors, warnings }}
 */
export function validateAreaSummary(areaSummary) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(areaSummary) || areaSummary.length !== AREA_ID_LIST.length) {
    errors.push(
      `Area Summary harus berisi tepat ${AREA_ID_LIST.length} area ` +
      `(${AREA_ID_LIST.join(", ")}).`
    );
    return makeResult(errors, warnings);
  }

  areaSummary.forEach(({ areaId, jumperCount }) => {
    if (!AREA_ID_LIST.includes(areaId)) {
      errors.push(`Area Summary: areaId tidak valid ("${areaId}").`);
    }
    if (isNullOrUndefined(jumperCount)) {
      errors.push(`Area Summary "${areaId}": Jumper Count wajib diisi.`);
    } else if (!isNonNegativeInteger(jumperCount)) {
      errors.push(
        `Area Summary "${areaId}": Jumper Count harus bilangan bulat >= 0 ` +
        `(diisi: ${jumperCount}).`
      );
    }
  });

  return makeResult(errors, warnings);
}

// ---------------------------------------------------------------------------
// VALIDASI WEEKLY CHART DATA (Form A — §8.3)
// ---------------------------------------------------------------------------

/**
 * Memvalidasi satu baris weekly chart data.
 * @param {object} row — { areaId, category, week, plan, actual }
 * @param {string[]} validWeekLabels — daftar label minggu yang valid dari config
 * @returns {{ valid, errors, warnings }}
 */
export function validateWeeklyChartRow(row, validWeekLabels) {
  const errors = [];
  const warnings = [];

  if (!AREA_ID_LIST.includes(row.areaId)) {
    errors.push(`Weekly Chart: areaId tidak valid ("${row.areaId}").`);
  }

  if (!CATEGORY_LIST.includes(row.category)) {
    errors.push(`Weekly Chart: category tidak valid ("${row.category}").`);
  }

  if (!isNonEmptyString(row.week)) {
    errors.push("Weekly Chart: Week label wajib diisi.");
  } else if (!validWeekLabels.includes(row.week)) {
    errors.push(
      `Weekly Chart: Week "${row.week}" tidak ada dalam Chart Week Labels yang dikonfigurasi.`
    );
  }

  // plan dan actual: null = belum diisi (berbeda dari 0); nilai negatif ditolak
  if (!isNullOrUndefined(row.plan)) {
    if (!isNonNegativeNumber(row.plan)) {
      errors.push(
        `Weekly Chart (${row.areaId}/${row.category}/${row.week}): ` +
        `Plan harus bilangan nonnegatif atau dikosongkan (diisi: ${row.plan}).`
      );
    }
  }

  if (!isNullOrUndefined(row.actual)) {
    if (!isNonNegativeNumber(row.actual)) {
      errors.push(
        `Weekly Chart (${row.areaId}/${row.category}/${row.week}): ` +
        `Actual harus bilangan nonnegatif atau dikosongkan (diisi: ${row.actual}).`
      );
    }
  }

  // Warning: salah satu kosong tetapi yang lain diisi
  if (isNullOrUndefined(row.plan) && !isNullOrUndefined(row.actual)) {
    warnings.push(
      `Weekly Chart (${row.areaId}/${row.category}/${row.week}): Plan belum diisi.`
    );
  }
  if (!isNullOrUndefined(row.plan) && isNullOrUndefined(row.actual)) {
    warnings.push(
      `Weekly Chart (${row.areaId}/${row.category}/${row.week}): Actual belum diisi.`
    );
  }

  return makeResult(errors, warnings);
}

/**
 * Memvalidasi seluruh array weeklyChartData termasuk cek duplikasi key.
 * @param {Array} weeklyChartData
 * @param {string[]} validWeekLabels
 * @returns {{ valid, errors, warnings }}
 */
export function validateWeeklyChartData(weeklyChartData, validWeekLabels) {
  const errors = [];
  const warnings = [];
  const keys = new Set();

  weeklyChartData.forEach((row, idx) => {
    const rowResult = validateWeeklyChartRow(row, validWeekLabels);
    errors.push(...rowResult.errors);
    warnings.push(...rowResult.warnings);

    const key = `${row.areaId}|${row.category}|${row.week}`;
    if (keys.has(key)) {
      errors.push(
        `Weekly Chart: kombinasi Area+Category+Week duplikat ditemukan ` +
        `("${row.areaId}", "${row.category}", "${row.week}") pada baris ${idx}.`
      );
    } else {
      keys.add(key);
    }
  });

  return makeResult(errors, warnings);
}

// ---------------------------------------------------------------------------
// VALIDASI JUMPER RECORD (Schema baru: ID 3-digit, Installed/Due Date)
// ---------------------------------------------------------------------------

/** Validasi format tanggal YYYY-MM-DD dan keabsahan kalendernya. */
function isValidIsoDate(v) {
  if (!isNonEmptyString(v)) return false;
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, mo - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
  );
}

/**
 * Memvalidasi satu record jumper (schema baru).
 *
 * Aturan:
 *   - jumperId: string numerik 3-digit ("001"–"999"), unik (BR-11).
 *   - plc: wajib, dan harus termasuk dalam PLC_BY_AREA[areaId].
 *   - installedDate: wajib, format YYYY-MM-DD valid.
 *   - dueDate: opsional; jika diisi harus YYYY-MM-DD valid.
 *
 * @param {object} record
 * @param {Set<string>} existingIds — Set jumperId yang sudah ada (untuk cek duplikat)
 * @returns {{ valid, errors, warnings }}
 */
export function validateJumperRecord(record, existingIds = new Set()) {
  const errors = [];
  const warnings = [];
  const ctx = record.jumperId ? `Jumper "${record.jumperId}"` : "Jumper (ID kosong)";

  // --- Identity ---

  if (!isNonEmptyString(record.jumperId)) {
    errors.push("ID wajib diisi dan tidak boleh kosong.");
  } else if (!/^\d{3}$/.test(record.jumperId.trim())) {
    errors.push(
      `${ctx}: ID harus berupa angka 3 digit (001–999), contoh "007".`
    );
  } else if (existingIds.has(record.jumperId.trim())) {
    errors.push(
      `ID "${record.jumperId}" sudah digunakan. ID harus unik (BR-11).`
    );
  }

  if (!isNonEmptyString(record.plc)) {
    errors.push(`${ctx}: PLC wajib diisi.`);
  }

  if (!AREA_ID_LIST.includes(record.areaId)) {
    errors.push(`${ctx}: Area tidak valid ("${record.areaId}").`);
  } else if (isNonEmptyString(record.plc)) {
    // PLC harus berasal dari mapping area terpusat
    const allowed = PLC_BY_AREA[record.areaId] || [];
    if (!allowed.includes(record.plc.trim())) {
      errors.push(
        `${ctx}: PLC "${record.plc}" tidak terdaftar untuk area ` +
        `"${AREA_LABELS[record.areaId] || record.areaId}". ` +
        `Pilih PLC dari daftar area tersebut.`
      );
    }
  }

  if (!CATEGORY_LIST.includes(record.category)) {
    errors.push(`${ctx}: Category tidak valid ("${record.category}").`);
  }

  if (!isNonEmptyString(record.description)) {
    errors.push(`${ctx}: Description wajib diisi.`);
  }

  // equipmentTag opsional — tidak divalidasi kontennya

  // --- Tanggal (schema baru) ---

  if (!isValidIsoDate(record.installedDate)) {
    errors.push(
      `${ctx}: Installed Date wajib diisi dengan format YYYY-MM-DD.`
    );
  }

  if (!isNullOrUndefined(record.dueDate) && record.dueDate !== "" &&
      !isValidIsoDate(record.dueDate)) {
    errors.push(
      `${ctx}: Due Date tidak valid ("${record.dueDate}"). ` +
      `Gunakan format YYYY-MM-DD atau kosongkan.`
    );
  }

  // Due Date < Installed Date → warning informatif (tidak memblokir)
  if (isValidIsoDate(record.installedDate) && isValidIsoDate(record.dueDate)) {
    if (record.dueDate < record.installedDate) {
      warnings.push(
        `${ctx}: Due Date (${record.dueDate}) lebih awal dari Installed Date ` +
        `(${record.installedDate}). Periksa kembali tanggal.`
      );
    }
  }

  // Status DUE (Due Soon / Expired) bukan input pengguna — hanya informatif
  const status = getJumperStatus(record.dueDate);
  if (status === JUMPER_STATUS.EXPIRED) {
    warnings.push(`${ctx}: Due Date sudah lewat (status: Expired).`);
  } else if (status === JUMPER_STATUS.DUE_SOON) {
    warnings.push(
      `${ctx}: Due Date mendekati (status: Due Soon — ≤ ${DUE_SOON_MAX_DAYS} hari).`
    );
  } else if (!isValidIsoDate(record.dueDate)) {
    warnings.push(
      `${ctx}: Due Date kosong/tidak valid — status tidak dapat ditentukan.`
    );
  }

  return makeResult(errors, warnings);
}

/**
 * Memvalidasi seluruh jumperRegister termasuk cek duplikasi jumperId.
 * @param {Array} jumperRegister
 * @returns {{ valid, errors, warnings }}
 */
export function validateJumperRegister(jumperRegister) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  jumperRegister.forEach((record) => {
    const idStr = isNonEmptyString(record.jumperId) ? record.jumperId.trim() : null;
    const rowResult = validateJumperRecord(record, seenIds);
    errors.push(...rowResult.errors);
    warnings.push(...rowResult.warnings);
    if (idStr) seenIds.add(idStr);
  });

  return makeResult(errors, warnings);
}

// ---------------------------------------------------------------------------
// VALIDASI LENGKAP STATE (digunakan sebelum export)
// ---------------------------------------------------------------------------

/**
 * Memvalidasi seluruh state sebelum export.
 * Mengembalikan daftar error (blokir export) dan warning (informatif).
 * @param {object} state — hasil getState()
 * @returns {{ valid, errors, warnings }}
 */
export function validateFullState(state) {
  const errors = [];
  const warnings = [];

  const configResult = validateConfig(state.config);
  errors.push(...configResult.errors);
  warnings.push(...configResult.warnings);

  const areaSummaryResult = validateAreaSummary(state.areaSummary);
  errors.push(...areaSummaryResult.errors);
  warnings.push(...areaSummaryResult.warnings);

  const weekLabels = Array.isArray(state.config.weekLabels) ? state.config.weekLabels : [];
  const chartResult = validateWeeklyChartData(state.weeklyChartData, weekLabels);
  errors.push(...chartResult.errors);
  warnings.push(...chartResult.warnings);

  const registerResult = validateJumperRegister(state.jumperRegister);
  errors.push(...registerResult.errors);
  warnings.push(...registerResult.warnings);

  // Warning khusus: identificationYearFilter belum dikonfigurasi (OQ-01)
  if (isNullOrUndefined(APP_CONFIG.reporting.identificationYearFilter)) {
    warnings.push(
      "[OQ-01] Identification Year Filter belum dikonfigurasi di config.js. " +
      "Remaining Jumper List (BR-03) tidak dapat dihitung dengan benar. " +
      "Konfirmasi tahun identifikasi dengan pemilik proses, lalu isi " +
      "APP_CONFIG.reporting.identificationYearFilter."
    );
  }

  // Warning khusus: discrepancy basis belum dikonfirmasi (OQ open)
  if (APP_CONFIG.discrepancyWarning.enabled && isNullOrUndefined(APP_CONFIG.discrepancyWarning.basis)) {
    warnings.push(
      "[OQ] Basis perbandingan discrepancy Area Summary vs Register belum dikonfirmasi. " +
      "Warning discrepancy ditampilkan tetapi nilai manual tidak diubah (BR-01, BR-12)."
    );
  }

  return makeResult(errors, warnings);
}
