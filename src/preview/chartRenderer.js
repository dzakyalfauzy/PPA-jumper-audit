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
// KONSTANTA VISUAL — WARNA PER KATEGORI (Excel Reference)
// Plan (Bar):
//   - Shortbranches: #BFBFBF (abu-abu)
//   - Forces: #008577 (teal/hijau)
//   - AFI: #00B0F0 (cyan/biru)
// Actual (Line):
//   - Semua kategori: #A52A98 (ungu/magenta) dengan marker kotak (rect)
// ---------------------------------------------------------------------------

export const ACTUAL_COLOR = "#A52A98";

export const CATEGORY_COLORS = Object.freeze({
  Shortbranches: {
    base:       "#BFBFBF",                   // abu-abu Plan
    planBg:     "rgba(191, 191, 191, 0.75)", // Bar Plan
    planBorder: "#8C8C8C",
    actual:     ACTUAL_COLOR,                // Line solid ungu
    actualPoint:ACTUAL_COLOR,                // Marker kotak ungu
  },
  Forces: {
    base:       "#008577",                   // teal/hijau Plan
    planBg:     "rgba(0, 133, 119, 0.75)",   // Bar Plan
    planBorder: "#005a50",
    actual:     ACTUAL_COLOR,                // Line solid ungu
    actualPoint:ACTUAL_COLOR,                // Marker kotak ungu
  },
  AFI: {
    base:       "#00B0F0",                   // cyan/biru Plan
    planBg:     "rgba(0, 176, 240, 0.75)",   // Bar Plan
    planBorder: "#008dbf",
    actual:     ACTUAL_COLOR,                // Line solid ungu
    actualPoint:ACTUAL_COLOR,                // Marker kotak ungu
  },
});

export const CHART_COLORS = Object.freeze({
  default: CATEGORY_COLORS.Shortbranches,
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

  // Ambil palet warna spesifik berdasarkan kategori
  const catTheme = CATEGORY_COLORS[series.category] || CATEGORY_COLORS.Shortbranches;

  // Plugin kustom data label untuk Plan (di dalam/atas bar) dan Actual (di dalam/dekat marker kotak ungu)
  // Menghindari tabrakan teks saat Plan dan Actual bernilai sama atau berdekatan
  const dataLabelsPlugin = {
    id: `customDataLabels_${canvasId}`,
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const barMeta = chart.getDatasetMeta(0);
      const lineMeta = chart.getDatasetMeta(1);

      const count = series.labels.length;
      for (let i = 0; i < count; i++) {
        const pVal = planData[i];
        const aVal = actualData[i];
        const barElem = barMeta && barMeta.data ? barMeta.data[i] : null;
        const lineElem = lineMeta && lineMeta.data ? lineMeta.data[i] : null;

        // 1. Gambar batang Plan label
        if (pVal !== null && barElem) {
          const barHeight = Math.abs(barElem.base - barElem.y);
          let labelY;
          let labelColor;

          // Cek apakah Actual dan Plan berdekatan secara vertikal
          const isOverlapRisk = aVal !== null && lineElem && Math.abs(barElem.y - lineElem.y) < 18;

          if (barHeight >= 14 && pVal > 0 && !isOverlapRisk) {
            // Cukup ruang di dalam batang
            labelY = barElem.y + 8;
            labelColor = "#ffffff";
          } else {
            // Letakkan di atas atau di dasar batang dengan penyesuaian offset jika risiko overlap
            if (isOverlapRisk && aVal >= pVal) {
              // Jika Actual di atas atau sama dengan Plan, geser label Plan ke bawah/ke dalam
              labelY = barHeight >= 8 ? barElem.y + 7 : barElem.base - 6;
              labelColor = barHeight >= 8 ? "#ffffff" : "#333333";
            } else {
              labelY = barElem.y - 7;
              labelColor = "#1e293b";
            }
          }

          ctx.fillStyle = labelColor;
          ctx.fillText(String(pVal), barElem.x, labelY);
        }

        // 2. Gambar Actual label (kotak ungu dengan teks putih)
        if (aVal !== null && lineElem) {
          const x = lineElem.x;
          let y = lineElem.y;

          // Jika nilai Actual sama dengan Plan, letakkan kotak Actual sedikit di atas atau di posisi target
          const boxW = 14;
          const boxH = 12;

          ctx.fillStyle = ACTUAL_COLOR;
          ctx.fillRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(String(aVal), x, y);
        }
      }

      ctx.restore();
    },
  };

  // Konfigurasi mixed chart: Plan sebagai bar chart, Actual sebagai line chart dengan marker kotak
  const chart = new ChartJS(canvas, {
    plugins: [dataLabelsPlugin],
    data: {
      labels: series.labels, // urutan kronologis weekLabels
      datasets: [
        {
          type:            "bar",
          label:           "Plan",
          data:            planData,
          backgroundColor: catTheme.planBg,
          borderColor:     catTheme.planBorder,
          borderWidth:     1,
          barPercentage:   0.65,
          categoryPercentage: 0.85,
          order:           2,
        },
        {
          type:            "line",
          label:           "Actual",
          data:            actualData,
          borderColor:     ACTUAL_COLOR,
          backgroundColor: ACTUAL_COLOR,
          pointBackgroundColor: ACTUAL_COLOR,
          pointBorderColor:     "#ffffff",
          pointBorderWidth:     1.5,
          pointStyle:      "rect",
          borderWidth:     2,
          pointRadius:     6,
          pointHoverRadius:8,
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
      layout: {
        padding: { top: 16, bottom: 8, left: 8, right: 8 },
      },
      plugins: {
        legend: {
          display:  true,
          position: "top",
          labels:   {
            boxWidth: 14,
            boxHeight: 10,
            font: { size: 10 },
            padding: 6,
            generateLabels: (chart) => {
              return [
                {
                  text: "Plan",
                  fillStyle: catTheme.planBg,
                  strokeStyle: catTheme.planBorder,
                  lineWidth: 1,
                  hidden: false,
                  pointStyle: "rect",
                  datasetIndex: 0,
                },
                {
                  text: "Actual",
                  fillStyle: ACTUAL_COLOR,
                  strokeStyle: ACTUAL_COLOR,
                  lineWidth: 2,
                  hidden: false,
                  pointStyle: "rect",
                  datasetIndex: 1,
                },
              ];
            },
          },
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
          ticks: { font: { size: 9 }, maxRotation: 0 },
          grid:  { color: "rgba(0,0,0,0.05)" },
        },
        y: {
          beginAtZero: true,
          grace:       "18%", // beri ruang vertikal agar label tidak terpotong
          ticks:       { font: { size: 9 }, precision: 0 },
          grid:        { color: "rgba(0,0,0,0.08)" },
        },
      },
    },
  });

  _chartInstances.set(canvasId, chart);
}
