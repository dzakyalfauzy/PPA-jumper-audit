/**
 * chartData.js
 * Fungsi penyusunan data chart untuk PPA Jumper Audit Automation.
 *
 * Prinsip:
 *   - Urutan weekLabels SELALU mengikuti urutan eksplisit dari input pengguna (§9.1, OQ-07).
 *     Tidak ada sort alfabetis atau numeris terhadap label minggu.
 *   - Fungsi bersifat PURE: tidak mengubah state sumber.
 *   - Nilai null dipertahankan (null ≠ 0) — posisi data kosong ditampilkan sebagai null
 *     sehingga chart dapat membedakan "data tidak diisi" dari "nilai nol".
 *   - Setiap grafik diidentifikasi oleh pasangan (areaId, category).
 *   - CHART_MATRIX dari constants.js menentukan 12 kombinasi yang harus dirender.
 *
 * Fungsi yang diekspor:
 *   getChartSeriesForCell(weeklyChartData, weekLabels, areaId, category)
 *     → { labels, planSeries, actualSeries }
 *   getAllChartSeries(weeklyChartData, weekLabels)
 *     → Map keyed by "areaId|category" → { areaId, category, labels, planSeries, actualSeries }
 *   getChartKey(areaId, category)
 *     → string key untuk lookup
 */

"use strict";

import { CHART_MATRIX } from "../model/constants.js";

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

/**
 * Menghasilkan string key yang konsisten untuk satu sel grafik.
 * @param {string} areaId
 * @param {string} category
 * @returns {string}
 */
export function getChartKey(areaId, category) {
  return `${areaId}|${category}`;
}

// ---------------------------------------------------------------------------
// FUNGSI UTAMA: SATU SEL GRAFIK
// ---------------------------------------------------------------------------

/**
 * Menyusun data seri Plan dan Actual untuk satu grafik (areaId × category).
 *
 * Urutan output SELALU mengikuti weekLabels — tidak disortir ulang.
 * Jika suatu label minggu tidak memiliki data, nilai Plan dan Actual = null
 * (bukan 0) untuk membedakan data kosong dari data nol.
 *
 * @param {object[]} weeklyChartData — dari state.weeklyChartData
 * @param {string[]} weekLabels      — urutan eksplisit dari config.weekLabels
 * @param {string} areaId
 * @param {string} category
 * @returns {{
 *   areaId: string,
 *   category: string,
 *   labels: string[],       — sama dengan weekLabels, urutan dipertahankan
 *   planSeries: (number|null)[],
 *   actualSeries: (number|null)[]
 * }}
 */
export function getChartSeriesForCell(weeklyChartData, weekLabels, areaId, category) {
  // Bangun lookup cepat: week → { plan, actual }
  // Filter hanya baris yang cocok dengan areaId dan category ini
  const lookup = new Map();
  for (const row of weeklyChartData) {
    if (row.areaId === areaId && row.category === category) {
      lookup.set(row.week, { plan: row.plan, actual: row.actual });
    }
  }

  // Susun seri mengikuti urutan eksplisit weekLabels
  const planSeries = [];
  const actualSeries = [];

  for (const label of weekLabels) {
    const entry = lookup.get(label);
    // null jika tidak ada data untuk minggu ini — BUKAN 0
    planSeries.push(entry !== undefined ? entry.plan : null);
    actualSeries.push(entry !== undefined ? entry.actual : null);
  }

  return {
    areaId,
    category,
    labels: [...weekLabels], // salinan — tidak mengubah sumber
    planSeries,
    actualSeries,
  };
}

// ---------------------------------------------------------------------------
// FUNGSI UTAMA: SEMUA 12 GRAFIK
// ---------------------------------------------------------------------------

/**
 * Menyusun data seri untuk semua 12 grafik sekaligus.
 * Menggunakan CHART_MATRIX (4 area × 3 category) dari constants.js.
 *
 * @param {object[]} weeklyChartData
 * @param {string[]} weekLabels
 * @returns {Map<string, object>}
 *   Key: "areaId|category" — Value: { areaId, category, labels, planSeries, actualSeries }
 */
export function getAllChartSeries(weeklyChartData, weekLabels) {
  const result = new Map();

  for (const { areaId, category } of CHART_MATRIX) {
    const key = getChartKey(areaId, category);
    const series = getChartSeriesForCell(weeklyChartData, weekLabels, areaId, category);
    result.set(key, series);
  }

  return result;
}

// ---------------------------------------------------------------------------
// FUNGSI DIAGNOSTIK: STATUS KELENGKAPAN DATA CHART
// ---------------------------------------------------------------------------

/**
 * Memeriksa kelengkapan data chart: kombinasi mana yang memiliki Plan atau Actual null.
 * Digunakan untuk warning "data belum lengkap" di UI dan validasi sebelum export.
 *
 * @param {object[]} weeklyChartData
 * @param {string[]} weekLabels
 * @returns {{
 *   complete: boolean,
 *   incompleteCells: { areaId, category, week, missingPlan: boolean, missingActual: boolean }[]
 * }}
 */
export function checkChartDataCompleteness(weeklyChartData, weekLabels) {
  const incompleteCells = [];

  for (const { areaId, category } of CHART_MATRIX) {
    for (const week of weekLabels) {
      const row = weeklyChartData.find(
        (d) => d.areaId === areaId && d.category === category && d.week === week
      );
      const missingPlan   = !row || row.plan   === null || row.plan   === undefined;
      const missingActual = !row || row.actual  === null || row.actual === undefined;

      if (missingPlan || missingActual) {
        incompleteCells.push({ areaId, category, week, missingPlan, missingActual });
      }
    }
  }

  return {
    complete: incompleteCells.length === 0,
    incompleteCells,
  };
}
