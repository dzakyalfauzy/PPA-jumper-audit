/**
 * slidePreview.js
 * Render preview laporan PPA Jumper Audit dalam satu "slide" 16:9.
 *
 * Tanggung jawab:
 *   - Menerima state dan menghitung semua KPI via selectors.js (tidak menduplikasi logik).
 *   - Membangun HTML layout satu slide.
 *   - Memanggil chartRenderer.js untuk render 12 Chart.js grafik.
 *   - Menampilkan status "belum tersedia" jika konfigurasi OQ belum lengkap.
 *   - Menampilkan overflow warning jika Remaining Jumper List terlalu panjang.
 *   - Memperbarui preview setiap kali dipanggil (tidak stateful sendiri).
 *
 * Layout zona dalam slide (mengikuti struktur slide 2 referensi):
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ HEADER: Judul · Plant Area · Week/Year                              │
 *  ├────────────────────────────────┬────────────────────────────────────┤
 *  │ AREA SUMMARY (4 kartu)         │ REMAINING JUMPER LIST (panel kanan)│
 *  ├──────────┬─────────────────────┤                                    │
 *  │ CHARTS   │  12 grafik          │ TOTAL REMOVED                      │
 *  │ 4×3 grid │  (area × category) │                                    │
 *  ├──────────┴─────────────────────┼────────────────────────────────────┤
 *  │ AUTHORIZED/MOC KPI             │ REMAINING PLC RATIO                │
 *  │ JUMPER UPDATE TABLE            │ COUNT PER PLC CHART                │
 *  └────────────────────────────────┴────────────────────────────────────┘
 *
 * Catatan: layout menggunakan CSS Grid di dalam container rasio 16:9.
 * Di browser, container discale agar muat di layar.
 * Di export PPTX (Phase 6), posisi dan ukuran akan dikonversi ke unit inci/EMU.
 */

"use strict";

import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST } from "../model/constants.js";
import {
  remainingJumperList,
  authorizedMocCount,
  removedJumperCount,
  remainingPlcRatio,
  jumperCountPerPlc,
  calculateAreaSummariesFromWeeklyChart,
} from "../logic/selectors.js";
import { getAllChartSeries, checkChartDataCompleteness } from "../logic/chartData.js";
import { renderAllCharts, destroyAllCharts, canvasId, CATEGORY_COLORS } from "./chartRenderer.js";
import { APP_CONFIG } from "../model/config.js";

// ---------------------------------------------------------------------------
// KONSTANTA LAYOUT
// ---------------------------------------------------------------------------

// Jumlah baris maksimal Remaining Jumper List sebelum overflow warning
const MAX_REMAINING_LIST_ROWS = 12;

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
    renderAllCharts(state.weeklyChartData, state.config.weekLabels || [], ChartJS);
  }

  // 5. Render grafik Count per PLC (bar chart)
  if (ChartJS && computed.jumperPerPlc.length > 0) {
    _renderPlcChart(computed.jumperPerPlc, ChartJS);
  }
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

  // Buat appConfig dengan identificationYearFilter dari state.config (OQ-01)
  const appConfig = {
    ...APP_CONFIG,
    reporting: {
      identificationYearFilter: config.identificationYearFilter ?? null,
    },
    discrepancyWarning: APP_CONFIG.discrepancyWarning,
  };

  // Tentukan label minggu laporan secara EKSPLISIT dari config.reportingWeek
  // Jangan gunakan label terakhir dalam weekLabels sebagai pengganti reporting period
  const reportingWeekNum = config.reportingWeek ?? null;
  const reportingWeekLabel = reportingWeekNum != null ? `W${reportingWeekNum}` : null;
  const weekLabels = config.weekLabels || [];

  const remainingResult  = remainingJumperList(jumperRegister, appConfig);
  const authorizedResult = authorizedMocCount(jumperRegister);
  const removedResult    = reportingWeekLabel
    ? removedJumperCount(jumperRegister, config.reportingYear, reportingWeekLabel)
    : { count: 0, records: [] };
  const plcRatioResult   = remainingPlcRatio(jumperRegister, config.totalPlcInScope);
  const jumperPerPlc     = jumperCountPerPlc(jumperRegister);

  // Completeness check untuk chart data
  const chartCompleteness = checkChartDataCompleteness(weeklyChartData, weekLabels);

  // Perhitungan Area Summary Otomatis dari weeklyChartData pada Reporting Week (Task C)
  const calculatedAreaSummaries = calculateAreaSummariesFromWeeklyChart(
    weeklyChartData,
    config.reportingWeek,
    config.reportingYear
  );

  return {
    appConfig,
    remainingResult,
    authorizedResult,
    removedResult,
    plcRatioResult,
    jumperPerPlc,
    chartCompleteness,
    reportingWeekLabel,
    calculatedAreaSummaries,
  };
}

// ---------------------------------------------------------------------------
// HTML BUILDER — SLIDE UTAMA
// ---------------------------------------------------------------------------

function _buildSlideHTML(state, computed) {
  const { config, areaSummary, jumperRegister } = state;
  const {
    remainingResult, authorizedResult, removedResult,
    plcRatioResult, jumperPerPlc, chartCompleteness, reportingWeekLabel,
  } = computed;

  const title    = config.title    || "—";
  const area     = config.plantArea || "—";
  const year     = config.reportingYear  ?? "—";
  const week     = config.reportingWeek  ?? "—";
  const weekLabels = config.weekLabels || [];

  // Overflow warning
  const remainingCount = remainingResult.ok ? remainingResult.data.length : 0;
  const overflowWarning = remainingResult.ok && remainingCount > MAX_REMAINING_LIST_ROWS;

  return `
    <!-- ── Slide warnings (luar kotak slide) ── -->
    ${_buildWarningsBanner(computed, overflowWarning)}

    <!-- ── Slide 16:9 ── -->
    <div class="slide-canvas">

      <!-- HEADER ── -->
      <div class="slide-header">
        <div class="slide-header__title">${_esc(title)}</div>
        <div class="slide-header__meta">
          ${_esc(area)} &nbsp;|&nbsp; Week ${_esc(String(week))} · ${_esc(String(year))}
          ${reportingWeekLabel ? `&nbsp;|&nbsp; Period: ${_esc(reportingWeekLabel)} (${_esc(String(year))})` : ""}
        </div>
      </div>

      <!-- BODY: 2-column layout ── -->
      <div class="slide-body">

        <!-- ── LEFT COLUMN ── -->
        <div class="slide-col-left">

          <!-- Area Summary (Otomatis dari Total Actual pada Reporting Week) -->
          <div class="slide-area-summary">
            ${AREA_ID_LIST.map((areaId) => {
              const calc = computed.calculatedAreaSummaries ? computed.calculatedAreaSummaries[areaId] : null;
              const val = calc && calc.totalActual !== null ? calc.totalActual : null;
              const note = calc && !calc.isComplete ? ' <span style="font-size:8px;color:#c00000;">*</span>' : '';
              return `
              <div class="slide-area-card">
                <div class="slide-area-card__label">${AREA_LABELS[areaId]}</div>
                <div class="slide-area-card__value">
                  ${val !== null ? `${val}${note}` : '<span class="slide-empty">—</span>'}
                </div>
              </div>
            `;
            }).join("")}
          </div>

          <!-- 12 Charts Grid: 4 area columns × 3 category rows -->
          <div class="slide-charts-grid-4col">
            ${AREA_ID_LIST.map((areaId) => {
              const calc = computed.calculatedAreaSummaries ? computed.calculatedAreaSummaries[areaId] : null;
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

          <!-- Bottom-left: Authorized/MoC KPI + Jumper Update Table -->
          <div class="slide-bottom-left">

            <div class="slide-kpi-row">
              <div class="slide-kpi-box">
                <div class="slide-kpi-box__label">Total Jumper with Authorized/MoC</div>
                <div class="slide-kpi-box__value">
                  ${authorizedResult.count}
                </div>
                <div class="slide-kpi-box__note oq-note">[OQ-02, OQ-03] Placeholder</div>
              </div>
              <div class="slide-kpi-box">
                <div class="slide-kpi-box__label">
                  Total Removed (${reportingWeekLabel ? _esc(reportingWeekLabel) : "—"}, ${_esc(String(year))})
                </div>
                <div class="slide-kpi-box__value">
                  ${removedResult.count}
                </div>
                ${!reportingWeekLabel ? '<div class="slide-kpi-box__note oq-note">Label minggu laporan belum tersedia</div>' : ""}
              </div>
            </div>

            <!-- Jumper Update Table -->
            <div class="slide-update-table-wrap">
              <div class="slide-section-title">Jumper Update Table</div>
              ${_buildUpdateTable(jumperRegister)}
            </div>

          </div>

        </div><!-- end left column -->

        <!-- ── RIGHT COLUMN ── -->
        <div class="slide-col-right">

          <!-- Remaining Jumper List -->
          <div class="slide-remaining-panel">
            <div class="slide-section-title">
              Remaining Jumper List
              ${!remainingResult.ok
                ? '<span class="oq-note">[OQ-01]</span>'
                : `<span class="slide-count-badge">${remainingResult.data.length}</span>`
              }
            </div>
            ${overflowWarning
              ? `<div class="slide-overflow-warning">⚠ Daftar melebihi ${MAX_REMAINING_LIST_ROWS} item — tampilkan ${MAX_REMAINING_LIST_ROWS} pertama. Kurangi data atau scroll di output nyata.</div>`
              : ""
            }
            ${_buildRemainingList(remainingResult, MAX_REMAINING_LIST_ROWS)}
          </div>

          <!-- Remaining PLC Ratio -->
          <div class="slide-plc-section">
            <div class="slide-section-title">Remaining PLC</div>
            ${_buildPlcRatio(plcRatioResult)}
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

  if (!computed.remainingResult.ok) {
    warnings.push(`<li><strong>OQ-01:</strong> ${_esc(computed.remainingResult.reason)}</li>`);
  }
  if (!computed.chartCompleteness.complete) {
    const n = computed.chartCompleteness.incompleteCells.length;
    warnings.push(`<li>${n} sel data chart kosong (Plan atau Actual belum diisi).</li>`);
  }
  if (!computed.plcRatioResult.ok) {
    warnings.push(`<li><strong>PLC Ratio:</strong> ${_esc(computed.plcRatioResult.reason)}</li>`);
  }
  if (overflowWarning) {
    warnings.push(`<li><strong>Overflow:</strong> Remaining Jumper List melebihi ${MAX_REMAINING_LIST_ROWS} item. Hanya ${MAX_REMAINING_LIST_ROWS} ditampilkan. Preview dan export mungkin terpotong (BR-10).</li>`);
  }

  if (warnings.length === 0) return "";
  return `
    <div class="slide-preview-warnings">
      <strong>Status Preview:</strong>
      <ul>${warnings.join("")}</ul>
    </div>
  `;
}

function _buildRemainingList(remainingResult, maxRows) {
  if (!remainingResult.ok) {
    return `<div class="slide-empty-section oq-note">${_esc(remainingResult.reason)}</div>`;
  }
  const items = remainingResult.data.slice(0, maxRows);
  if (items.length === 0) {
    return `<div class="slide-empty-section">Tidak ada jumper yang memenuhi filter (BR-03).</div>`;
  }
  return `
    <div class="slide-remaining-list">
      ${items.map((r, i) => `
        <div class="slide-remaining-item">
          <span class="slide-remaining-item__no">${i + 1}.</span>
          <span class="slide-remaining-item__id">${_esc(r.jumperId)}</span>
          <span class="slide-remaining-item__plc">${_esc(r.plc)}</span>
          <span class="slide-remaining-item__desc">${_esc(r.description || "")}</span>
        </div>
      `).join("")}
    </div>
    <div class="slide-remaining-criteria">
      Criteria: Removal=No · MOC=Not Available · ID Year filter [OQ-01]
    </div>
  `;
}

function _buildPlcRatio(plcRatioResult) {
  if (!plcRatioResult.ok) {
    return `<div class="slide-empty-section oq-note">${_esc(plcRatioResult.reason)}</div>`;
  }
  const pct = (plcRatioResult.ratio * 100).toFixed(1);
  return `
    <div class="slide-plc-ratio">
      <div class="slide-plc-ratio__fraction">
        ${plcRatioResult.activePlcCount} / ${plcRatioResult.totalPlcInScope}
      </div>
      <div class="slide-plc-ratio__pct">${pct}%</div>
      <div class="slide-plc-ratio__label">PLC with active jumpers / Total PLC in Scope</div>
    </div>
  `;
}

function _buildUpdateTable(jumperRegister) {
  // Kolom: PLC | Update Jumper (description) | Installed | Authorized Jumper | Due Date
  // Sumber: jumperRegister (semua record, termasuk removed, untuk riwayat)
  if (jumperRegister.length === 0) {
    return `<div class="slide-empty-section">Tidak ada data register.</div>`;
  }

  const rows = jumperRegister.map((r) => {
    const dueDateDisplay = r.dueDateStatus === "confirmed" && r.dueDate
      ? _esc(r.dueDate)
      : '<span class="slide-empty">Perlu konfirmasi</span>';

    // "Authorized Jumper" = apakah record memenuhi BR-04 (Auth=Authorized AND MOC=Approved/Complete)
    // Catatan: ini hanya display — tidak mengklaim sebagai final (OQ-02, OQ-03)
    const isAuth = r.authorizationStatus === "Authorized" && r.mocStatus === "Approved/Complete";
    const authDisplay = isAuth ? "✓" : "—";

    return `
      <tr>
        <td class="ut-plc">${_esc(r.plc)}</td>
        <td class="ut-desc">${_esc(r.description || "")}</td>
        <td class="ut-installed">${_esc(r.installedWeekOrDate || "")}</td>
        <td class="ut-auth" style="text-align:center;">${authDisplay}</td>
        <td class="ut-due">${dueDateDisplay}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="slide-update-table-scroll">
      <table class="slide-update-table">
        <thead>
          <tr>
            <th>PLC</th>
            <th>Update Jumper</th>
            <th>Installed</th>
            <th>Authorized<br/>Jumper</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="oq-note" style="font-size:0.68rem;margin-top:2px;">
      [OQ-02, OQ-03] Kolom "Authorized Jumper" menggunakan placeholder enum — belum final.
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
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
