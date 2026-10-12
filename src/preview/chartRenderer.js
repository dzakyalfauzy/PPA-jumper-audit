/**
 * chartRenderer.js
 * Render dan kelola 12 Chart.js instances untuk preview browser.
 *
 * Prinsip:
 *   - Satu fungsi untuk render semua 12 grafik dari getAllChartSeries().
 *   - Urutan weekLabels dipertahankan eksplisit — tidak di-sort.
 *   - null tetap null; Chart.js dikonfigurasi agar melewati titik null (spanGaps:false).
 *   - Warna Plan dan Actual konsisten di semua 12 grafik.
 *   - Tidak ada Chart.js instance yang bocor — destroy sebelum re-render.
 *   - Tidak mengandung business logic; data datang dari getAllChartSeries().
 *
 * Digunakan hanya di browser (DOM + Chart.js CDN). Tidak dapat diuji di Node.js.
 */

"use strict";

import { getAllChartSeries, getChartKey } from "../logic/chartData.js";
import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST } from "../model/constants.js";

// ---------------------------------------------------------------------------
// KONSTANTA VISUAL
// ---------------------------------------------------------------------------

export const CHART_COLORS = Object.freeze({
  plan:         "#1f4e78",                   // dark blue navy — Plan bar
  planBorder:   "#123250",
  planBg:       "rgba(31, 78, 120, 0.75)",
  actual:       "#c000c0",                   // magenta/purple — Actual line
  actualBorder: "#c000c0",
  actualBg:     "rgba(192, 0, 192, 0.15)",
});

// Registry chart instances agar dapat di-destroy saat re-render
const _chartInstances = new Map(); // key → Chart instance

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Render semua 12 grafik ke dalam container yang berisi canvas elements.
 * Canvas harus sudah ada di DOM dengan id "chart-{areaId}-{category}".
 *
 * @param {object[]} weeklyChartData — dari state.weeklyChartData
 * @param {string[]} weekLabels      — urutan eksplisit dari config.weekLabels
 * @param {object}   ChartJS         — window.Chart dari CDN; diinjeksi agar testable
 */
export function renderAllCharts(weeklyChartData, weekLabels, ChartJS) {
  if (!ChartJS) {
    console.warn("[chartRenderer] Chart.js belum tersedia.");
    return;
  }

  const allSeries = getAllChartSeries(weeklyChartData, weekLabels);

  for (const areaId of AREA_ID_LIST) {
    for (const category of CATEGORY_LIST) {
      const key    = getChartKey(areaId, category);
      const series = allSeries.get(key);
      if (!series) continue;

      const canvasId = _canvasId(areaId, category);
      const canvas   = document.getElementById(canvasId);
      if (!canvas) continue;

      _renderOneChart(canvas, canvasId, series, ChartJS);
    }
  }
}

/**
 * Hapus semua Chart.js instances yang terdaftar.
 * Dipanggil sebelum re-render atau saat preview di-unmount.
 */
export function destroyAllCharts() {
  for (const [, chart] of _chartInstances) {
    try { chart.destroy(); } catch (_) { /* ignore */ }
  }
  _chartInstances.clear();
}

/**
 * Menghasilkan ID canvas yang konsisten untuk satu sel grafik.
 * Format: "chart-{areaId}-{category}" dengan kategori di-lowercase dan spasi dihapus.
 */
export function canvasId(areaId, category) {
  return _canvasId(areaId, category);
}

// ---------------------------------------------------------------------------
// INTERNAL
// ---------------------------------------------------------------------------

function _canvasId(areaId, category) {
  return `chart-${areaId}-${category.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "")}`;
}

function _renderOneChart(canvas, canvasId, series, ChartJS) {
  // Destroy existing instance untuk canvas ini
  if (_chartInstances.has(canvasId)) {
    try { _chartInstances.get(canvasId).destroy(); } catch (_) { /* ignore */ }
    _chartInstances.delete(canvasId);
  }

  // Tandai titik data null agar label sumbu-X tetap tampil tapi titik tidak dirender
  const planData   = series.planSeries.map((v) => (v === null || v === undefined ? null : v));
  const actualData = series.actualSeries.map((v) => (v === null || v === undefined ? null : v));

  // Konfigurasi mixed chart: Plan sebagai bar chart, Actual sebagai line chart (magenta/purple dengan visible markers)
  const chart = new ChartJS(canvas, {
    data: {
      labels: series.labels, // urutan kronologis weekLabels
      datasets: [
        {
          type:            "bar",
          label:           "Plan",
          data:            planData,
          backgroundColor: CHART_COLORS.planBg,
          borderColor:     CHART_COLORS.planBorder,
          borderWidth:     1,
          barPercentage:   0.6,
          categoryPercentage: 0.8,
          order:           2,
        },
        {
          type:            "line",
          label:           "Actual",
          data:            actualData,
          borderColor:     CHART_COLORS.actualBorder,
          backgroundColor: CHART_COLORS.actual,
          pointBackgroundColor: CHART_COLORS.actual,
          pointBorderColor:     "#ffffff",
          pointBorderWidth:     1,
          borderWidth:     2.5,
          pointRadius:     4,
          pointHoverRadius:6,
          spanGaps:        false, // data null tidak disambung
          tension:         0.1,
          fill:            false,
          order:           1,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 200 },
      plugins: {
        legend: {
          display:  true,
          position: "top",
          labels:   { boxWidth: 10, font: { size: 9 }, padding: 4 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y;
              return val === null ? `${ctx.dataset.label}: —` : `${ctx.dataset.label}: ${val}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 8 }, maxRotation: 0 },
          grid:  { color: "rgba(0,0,0,0.05)" },
        },
        y: {
          beginAtZero: true,
          ticks:       { font: { size: 8 }, precision: 0 },
          grid:        { color: "rgba(0,0,0,0.08)" },
        },
      },
    },
  });

  _chartInstances.set(canvasId, chart);
}
