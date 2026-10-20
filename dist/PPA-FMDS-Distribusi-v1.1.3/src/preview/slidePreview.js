/**
 * slidePreview.js
 * Render preview laporan PPA Jumper Audit dalam satu "slide" 16:9 (revisi).
 *
 * Tanggung jawab:
 *   - Menerima state dan menghitung semua KPI via selectors.js (tidak menduplikasi logik).
 *   - Membangun HTML layout satu slide.
 *   - Memanggil chartRenderer.js untuk render 12 Chart.js grafik.
 *   - Menampilkan status "belum tersedia" untuk tabel yang bergantung field yg dihapus.
 *   - Menampilkan overflow warning jika Jumper Without MOC/Authorized Jumper terlalu panjang.
 *   - Memperbarui preview setiap kali dipanggil (tidak stateful sendiri).
 *
 * Layout zona dalam slide (revisi — tanpa Area Summary cards):
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ HEADER: Judul · Plant Area · Week/Year                              │
 *  ├────────────────────────────────┬────────────────────────────────────┤
 *  │ 12 CHARTS (4×3 grid)           │ JUMPER WITHOUT MOC/AUTHORIZED      │
 *  │ (area × category)              │ JUMPER (was: Remaining Jumper List)│
 *  ├────────────────────────────────┼────────────────────────────────────┤
 *  │ TOTAL JUMPER WITH MOC/         │ PLCs WITHOUT ACTIVE JUMPER /       │
 *  │ AUTHORIZED JUMPER              │ TOTAL PLCs — PERCENTAGE            │
 *  │ (was: Jumper Update Table)     │ COUNT PER PLC CHART                │
 *  └────────────────────────────────┴────────────────────────────────────┘
 *
 * Catatan: layout menggunakan CSS Grid di dalam container rasio 16:9.
 * Di browser, container discale agar muat di layar.
 * Di export PPTX, posisi dan ukuran akan dikonversi ke unit inci/EMU.
 */

"use strict";

import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST, STATUS_COLORS, EXPIRING_SOON_MAX_DAYS } from "../model/constants.js";
import {
  plcsWithoutActiveJumpers,
  jumperCountPerPlc,
  calculateAreaSummariesFromWeeklyChart,
  getJumperStatus,
  getAuthorizedJumpers,
  getNonAuthorizedJumpers,
} from "../logic/selectors.js";
import { getAllChartSeries, checkChartDataCompleteness } from "../logic/chartData.js";
import { renderAllCharts, destroyAllCharts, canvasId, CATEGORY_COLORS } from "./chartRenderer.js";
import { APP_CONFIG } from "../model/config.js";

// ---------------------------------------------------------------------------
// KONSTANTA LAYOUT
// ---------------------------------------------------------------------------

// Jumlah baris maksimal Jumper Without MOC/Authorized Jumper sebelum overflow warning
const MAX_JUMPER_WITHOUT_MOC_ROWS = 12;

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Render atau update preview ke dalam container.
 * Dipanggil setiap kali state berubah (dari app.js onStateChange).
 *
 * @param {HTMLElement} container
 * @param {object} state — hasil getState()
 * @param {object} ChartJS — window.Chart (diinjeksi agar testable)
 */
export function renderSlidePreview(container, state, ChartJS) {
  // 1. Hitung semua KPI dari selectors (tidak ada logik bisnis di sini)
  const computed = _computeAll(state);

  // 2. Destroy chart lama sebelum rebuild DOM
  destroyAllCharts();

  // 3. Build HTML
  container.innerHTML = _buildSlideHTML(state, computed);

  // 4. Render 12 Chart.js instances
  if (ChartJS) {
    renderAllCharts(state.weeklyChartData, _getSortedWeekLabels(state), ChartJS);
  }

  // 5. Render grafik Count per PLC (bar chart)
  if (ChartJS && computed.jumperPerPlc.length > 0) {
    _renderPlcChart(computed.jumperPerPlc, ChartJS);
  }
}

/**
 * Ambil week labels yang diurutkan kronologis dari weeklyChartData rows.
 * Digunakan untuk chart rendering agar urutan konsisten.
 */
function _getSortedWeekLabels(state) {
  const weeks = new Set();
  for (const row of state.weeklyChartData) {
    if (row.week) weeks.add(row.week);
  }
  // Sort chronologically using parseWeekLabel logic
  return Array.from(weeks).sort((a, b) => {
    const pa = _parseWeekForSort(a);
    const pb = _parseWeekForSort(b);
    if (pa.year !== pb.year) return pa.year - pb.year;
    if (pa.weekNumber !== pb.weekNumber) return pa.weekNumber - pb.weekNumber;
    return a.localeCompare(b);
  });
}

function _parseWeekForSort(label) {
  const str = String(label).trim();
  const yearMatch = str.match(/(?:wk|w)\s*(\d{1,2})\s*\(['"]?(\d{2,4})['"]?\)/i);
  if (yearMatch) {
    const wNum = parseInt(yearMatch[1], 10);
    let y = parseInt(yearMatch[2], 10);
    if (y < 100) y = 2000 + y;
    return { weekNumber: wNum, year: y };
  }
  const simpleMatch = str.match(/^(?:wk|w)?\s*(\d{1,2})$/i);
  if (simpleMatch) {
    return { weekNumber: parseInt(simpleMatch[1], 10), year: 2026 };
  }
  return { weekNumber: 999, year: 2026 };
}

/**
 * Unmount preview — destroy semua chart instances.
 */
export function unmountSlidePreview() {
  destroyAllCharts();
}

// ---------------------------------------------------------------------------
// KALKULASI TERPUSAT (wrapper selectors — tidak menduplikasi logik)
// ---------------------------------------------------------------------------

function _computeAll(state) {
  const { config, areaSummary, weeklyChartData, jumperRegister } = state;

  const weekLabels = _getSortedWeekLabels(state);

  const plcMetricResult = plcsWithoutActiveJumpers(jumperRegister, config.totalPlcInScope);
  const jumperPerPlc    = jumperCountPerPlc(jumperRegister);

  const authorizedJumpers    = getAuthorizedJumpers(jumperRegister);
  const nonAuthorizedJumpers = getNonAuthorizedJumpers(jumperRegister);

  // Completeness check untuk chart data
  const chartCompleteness = checkChartDataCompleteness(weeklyChartData, weekLabels);

  // Perhitungan Area Summary Otomatis dari weeklyChartData pada Reporting Week (Task C)
  const calculatedAreaSummaries = calculateAreaSummariesFromWeeklyChart(
    weeklyChartData,
    config.reportingWeek,
    config.reportingYear
  );

  return {
    plcMetricResult,
    jumperPerPlc,
    chartCompleteness,
    calculatedAreaSummaries,
    weekLabels,
    authorizedJumpers,
    nonAuthorizedJumpers,
  };
}

// ---------------------------------------------------------------------------
// HTML BUILDER — SLIDE UTAMA
// ---------------------------------------------------------------------------

function _buildSlideHTML(state, computed) {
  const { config, areaSummary, jumperRegister } = state;
  const {
    plcMetricResult,
    jumperPerPlc,
    chartCompleteness,
    calculatedAreaSummaries,
    authorizedJumpers,
    nonAuthorizedJumpers,
  } = computed;

  const title    = (config.title || "PPA JUMPER AUDIT").trim();
  const year     = config.reportingYear != null ? String(config.reportingYear).trim() : "—";
  const rawWeek  = config.reportingWeek != null ? String(config.reportingWeek).trim() : "";
  const weekNum  = rawWeek.replace(/^W/i, "");
  const weekLabel = weekNum !== "" && weekNum !== "—" ? `Week ${weekNum}` : "Week —";
  const headerTitle = `${title} | ${weekLabel} - ${year}`;

  // Overflow warning untuk Jumper Without MOC/Authorized Jumper (Non-Authorized)
  const jumperWithoutMocCount = nonAuthorizedJumpers.length;
  const overflowWarning = jumperWithoutMocCount > MAX_JUMPER_WITHOUT_MOC_ROWS;

  return `
    <!-- ── Slide warnings (luar kotak slide) ── -->
    ${_buildWarningsBanner(computed, overflowWarning)}

    <!-- ── Slide 16:9 ── -->
    <div class="slide-canvas">

      <!-- HEADER ── -->
      <div class="slide-header">
        <div class="slide-header__title">${_esc(headerTitle)}</div>
        <div class="slide-header__logos">
          <img src="assets/logo_mindid.png" alt="MIND ID" class="slide-header__logo-img" />
          <img src="assets/logo_vale.png" alt="Vale" class="slide-header__logo-img" />
        </div>
      </div>

      <!-- BODY: 2-column layout ── -->
      <div class="slide-body">

        <!-- ── LEFT COLUMN: Charts (12) + Total Jumper With MOC/Authorized Jumper ── -->
        <div class="slide-col-left">

          <!-- 12 Charts Grid: 4 area columns × 3 category rows -->
          <div class="slide-charts-grid-4col">
            ${AREA_ID_LIST.map((areaId) => {
              const calc = calculatedAreaSummaries ? calculatedAreaSummaries[areaId] : null;
              const jumperHeaderCount = calc && calc.totalActual !== null ? ` (${calc.totalActual} jumpers)` : "";
              return `
              <div class="slide-chart-area-col">
                <div class="slide-chart-area-header">${AREA_LABELS[areaId]}${jumperHeaderCount}</div>
                <div class="slide-chart-col-body">
                  ${CATEGORY_LIST.map((category) => {
                    const theme = CATEGORY_COLORS[category];
                    const indicatorColor = theme ? theme.base : "#475569";
                    return `
                    <div class="slide-chart-cell">
                      <div class="slide-chart-cell__title" style="display:flex;align-items:center;justify-content:center;gap:4px;">
                        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:${indicatorColor};"></span>
                        <span>${_esc(category)}</span>
                      </div>
                      <div class="slide-chart-cell__canvas-wrap">
                        <canvas id="${canvasId(areaId, category)}"></canvas>
                      </div>
                    </div>
                  `;
                  }).join("")}
                </div>
              </div>
            `;
            }).join("")}
          </div>

          <!-- Bottom-left: Total Jumper With MOC/Authorized Jumper -->
          <div class="slide-bottom-left">

            <div class="slide-update-table-wrap">
              <div class="slide-section-title">Total Jumper With MOC/Authorized Jumper</div>
              ${_buildTotalJumperWithMocAuthorizedTable(authorizedJumpers)}
            </div>

          </div>

        </div><!-- end left column -->

        <!-- ── RIGHT COLUMN ── -->
        <div class="slide-col-right">

          <!-- Jumper Without MOC/Authorized Jumper -->
          <div class="slide-remaining-panel">
            <div class="slide-section-title">
              Jumper Without MOC/Authorized Jumper
              <span class="slide-count-badge">${nonAuthorizedJumpers.length}</span>

            </div>
            ${overflowWarning
              ? `<div class="slide-overflow-warning">⚠ Daftar melebihi ${MAX_JUMPER_WITHOUT_MOC_ROWS} item — tampilkan ${MAX_JUMPER_WITHOUT_MOC_ROWS} pertama. Kurangi data atau scroll di output nyata.</div>`
              : ""
            }
            ${_buildJumperWithoutMocAuthorizedList(nonAuthorizedJumpers, MAX_JUMPER_WITHOUT_MOC_ROWS)}
          </div>

          <!-- PLCs With Active Jumper / Total PLCs — Percentage -->
          <div class="slide-plc-section">
            <div class="slide-section-title">PLCs With Active Jumper / Total PLCs</div>
            ${_buildPlcsWithoutActiveMetric(plcMetricResult)}
          </div>

          <!-- Count per PLC bar chart -->
          <div class="slide-plc-chart-section">
            <div class="slide-section-title">Count of Remaining Jumper on PLC PP Area</div>
            ${jumperPerPlc.length > 0
              ? `<div class="slide-plc-chart-wrap"><canvas id="chart-plc-per-area"></canvas></div>`
              : `<div class="slide-empty-section">Tidak ada data jumper aktif.</div>`
            }
          </div>

        </div><!-- end right column -->

      </div><!-- end body -->

    </div><!-- end slide-canvas -->
  `;
}

// ---------------------------------------------------------------------------
// COMPONENT BUILDERS
// ---------------------------------------------------------------------------

function _buildWarningsBanner(computed, overflowWarning) {
  const warnings = [];

  if (!computed.chartCompleteness.complete) {
    const n = computed.chartCompleteness.incompleteCells.length;
    warnings.push(`<li>${n} sel data chart kosong (Plan atau Actual belum diisi).</li>`);
  }
  if (!computed.plcMetricResult.ok) {
    warnings.push(`<li><strong>PLC Metric:</strong> ${_esc(computed.plcMetricResult.reason)}</li>`);
  }
  if (computed.plcMetricResult.warning) {
    warnings.push(`<li><strong>Warning:</strong> ${_esc(computed.plcMetricResult.warning)}</li>`);
  }
  if (overflowWarning) {
    warnings.push(`<li><strong>Overflow:</strong> Jumper Without MOC/Authorized Jumper melebihi ${MAX_JUMPER_WITHOUT_MOC_ROWS} item. Hanya ${MAX_JUMPER_WITHOUT_MOC_ROWS} ditampilkan. Preview dan export mungkin terpotong.</li>`);
  }

  if (warnings.length === 0) return "";
  return `
    <div class="slide-preview-warnings">
      <strong>Status Preview:</strong>
      <ul>${warnings.join("")}</ul>
    </div>
  `;
}

function _buildJumperWithoutMocAuthorizedList(nonAuthorizedJumpers, maxRows) {
  const items = (nonAuthorizedJumpers || []).slice(0, maxRows);
  if (items.length === 0) {
    return `<div class="slide-empty-section">Belum ada data Jumper Non-Authorized.</div>`;
  }
  return `
    <div class="slide-remaining-list">
      ${items.map((r, i) => `
        <div class="slide-remaining-item">
          <span class="slide-remaining-item__no">${i + 1}.</span>
          <span class="slide-remaining-item__id">${_esc(r.jumperId)}</span>
          <span class="slide-remaining-item__plc">${_esc(r.plc)}</span>
          <span class="slide-remaining-item__area">${_esc(AREA_LABELS[r.areaId] || r.areaId || "")}</span>
          <span class="slide-remaining-item__cat">${_esc(r.category || "")}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function _buildPlcsWithoutActiveMetric(plcMetricResult) {
  if (!plcMetricResult.ok) {
    return `<div class="slide-empty-section oq-note">${_esc(plcMetricResult.reason)}</div>`;
  }
  const pct = plcMetricResult.percentage !== null ? plcMetricResult.percentage.toFixed(1) : "—";
  return `
    <div class="slide-plc-kpi-card">
      <div class="slide-plc-kpi-left">
        <div class="slide-plc-kpi-val">${plcMetricResult.plcsWithActive} / ${plcMetricResult.totalPlcInScope}</div>
        <div class="slide-plc-kpi-lbl">PLCs with active jumper / Total PLCs in Scope</div>
      </div>
      <div class="slide-plc-kpi-divider"></div>
      <div class="slide-plc-kpi-right">
        <div class="slide-plc-kpi-pct">${pct}%</div>
        <div class="slide-plc-kpi-lbl">PLCs without active jumper</div>
      </div>
    </div>
  `;
}

function _buildTotalJumperWithMocAuthorizedTable(authorizedJumpers) {
  // Kolom: ID | PLC | Area | Category | Installed | Due Date | Status
  // Status dihitung dari Due Date (bukan input pengguna).
  // Hanya menampilkan record dengan authorizationType === "Authorized".
  if (!authorizedJumpers || authorizedJumpers.length === 0) {
    return `<div class="slide-empty-section">Belum ada data Jumper Authorized.</div>`;
  }

  const rows = authorizedJumpers.map((r) => {
    const status = getJumperStatus(r.dueDate);
    const statusDisplay = status
      ? (() => {
          const c = STATUS_COLORS[status];
          return `<span style="background:${c.bg};color:${c.text};padding:1px 8px;border-radius:8px;font-weight:600;white-space:nowrap;">${_esc(status)}</span>`;
        })()
      : '<span class="slide-empty">—</span>';

    return `
      <tr>
        <td class="ut-id"><strong>${_esc(r.jumperId)}</strong></td>
        <td class="ut-plc">${_esc(r.plc)}</td>
        <td class="ut-area">${_esc(AREA_LABELS[r.areaId] || r.areaId || "")}</td>
        <td class="ut-cat">${_esc(r.category || "")}</td>
        <td class="ut-installed">${_esc(r.installedDate || "")}</td>
        <td class="ut-due">${_esc(r.dueDate || "")}</td>
        <td class="ut-status" style="text-align:center;">${statusDisplay}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="slide-update-table-scroll">
      <table class="slide-update-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>PLC</th>
            <th>Area</th>
            <th>Category</th>
            <th>Installed</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="oq-note" style="font-size:0.68rem;margin-top:2px;">
      Status dihitung otomatis dari Due Date: Active (> ${EXPIRING_SOON_MAX_DAYS} hari) · Expiring Soon (0–${EXPIRING_SOON_MAX_DAYS} hari) · Expired (lewat).
    </div>
  `;
}

// ---------------------------------------------------------------------------
// PLC BAR CHART
// ---------------------------------------------------------------------------

function _renderPlcChart(jumperPerPlc, ChartJS) {
  const canvas = document.getElementById("chart-plc-per-area");
  if (!canvas) return;

  const plcLabels = jumperPerPlc.map((p) => p.plc);
  const afiData   = jumperPerPlc.map((p) => p.byCategory["AFI"]          ?? 0);
  const sbData    = jumperPerPlc.map((p) => p.byCategory["Shortbranches"] ?? 0);
  const forcData  = jumperPerPlc.map((p) => p.byCategory["Forces"]       ?? 0);

  // Destroy jika sudah ada
  if (window.__plcChartInstance) {
    try { window.__plcChartInstance.destroy(); } catch (_) { /* ignore */ }
  }

  window.__plcChartInstance = new ChartJS(canvas, {
    type: "bar",
    data: {
      labels: plcLabels,
      datasets: [
        { label: "AFI",           data: afiData,  backgroundColor: CATEGORY_COLORS.AFI?.base || "#00B0F0" },
        { label: "Shortbranches", data: sbData,   backgroundColor: CATEGORY_COLORS.Shortbranches?.base || "#BFBFBF" },
        { label: "Forces",        data: forcData, backgroundColor: CATEGORY_COLORS.Forces?.base || "#008577" },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 200 },
      plugins: {
        legend: { display: true, position: "top", labels: { boxWidth: 10, font: { size: 9 }, padding: 4 } },
      },
      scales: {
        x: { stacked: false, ticks: { font: { size: 8 } } },
        y: { beginAtZero: true, ticks: { font: { size: 8 }, precision: 0 } },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

function _esc(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}