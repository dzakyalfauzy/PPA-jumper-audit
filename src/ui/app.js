/**
 * app.js
 * Entry point aplikasi PPA Jumper Audit Automation (revisi).
 *
 * Tanggung jawab:
 *   - Mount semua form section ke DOM.
 *   - Menerima callback onStateChange dari setiap form.
 *   - Memanggil selectors untuk menghitung discrepancy warning dan status KPI.
 *   - Merender dan memperbarui slide preview setiap state berubah.
 *   - Menampilkan status validasi global (blokir export jika ada error).
 *   - Tidak mengandung business logic — hanya orchestration.
 *
 * Arsitektur data flow:
 *   User input → form module → state (state.js) → app.js onStateChange
 *   → selectors → update discrepancy / status panel → renderSlidePreview()
 *
 * Tidak ada database, backend, API, atau import Excel.
 */

"use strict";

import { getState, initInitialDataset, savePersistedState } from "../model/state.js";
import { validateFullState } from "../model/validation.js";
import { APP_CONFIG } from "../model/config.js";
import { areaSummaryDiscrepancy } from "../logic/selectors.js";
import { mountFormReportInfo, setDiscrepancyWarnings } from "./formReportInfo.js";
import { mountFormWeeklyChart, refreshFormWeeklyChart } from "./formWeeklyChart.js";
import { mountFormRegister, refreshFormRegister } from "./formRegister.js";
import { renderSlidePreview } from "../preview/slidePreview.js";
import { exportToPowerPoint } from "../export/pptxExporter.js";

// ---------------------------------------------------------------------------
// MODULE STATE
// ---------------------------------------------------------------------------
let _isValidationPanelExpanded = false;

// ---------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------

export function initApp() {
  // Inisialisasi initial dataset atau muat draft dari localStorage
  initInitialDataset();

  // Mount form modules
  mountFormReportInfo(
    document.getElementById("section-report-info"),
    document.getElementById("section-area-summary"),
    { onStateChange: _onStateChange }
  );

  mountFormWeeklyChart(
    document.getElementById("section-weekly-chart"),
    { onStateChange: _onStateChange }
  );

  mountFormRegister(
    document.getElementById("section-register"),
    { onStateChange: _onStateChange }
  );

  // Bind Export PPTX button
  const exportPptxBtn = document.getElementById("btn-export-pptx");
  if (exportPptxBtn) {
    exportPptxBtn.addEventListener("click", async () => {
      try {
        exportPptxBtn.disabled = true;
        exportPptxBtn.textContent = "Mengunduh PPTX...";
        const currentState = getState();
        await exportToPowerPoint(currentState);
      } catch (err) {
        alert(`Gagal mengekspor PowerPoint: ${err.message}`);
      } finally {
        exportPptxBtn.disabled = false;
        exportPptxBtn.textContent = "Download PPTX";
      }
    });
  }

  // Initial render
  _onStateChange();
}

// ---------------------------------------------------------------------------
// STATE CHANGE HANDLER
// ---------------------------------------------------------------------------

function _onStateChange() {
  const state = getState();

  // Simpan perubahan ke LocalStorage
  savePersistedState();

  // 1. Discrepancy warnings untuk area summary
  _updateDiscrepancyWarnings(state);

  // 2. Refresh weekly chart form
  const wcContainer = document.getElementById("section-weekly-chart");
  if (wcContainer) refreshFormWeeklyChart(wcContainer);

  // 3. Refresh register form (for search, etc)
  const regContainer = document.getElementById("section-register");
  if (regContainer) refreshFormRegister(regContainer);

  // 4. Update global status panel
  _updateStatusPanel(state);

  // 5. Render / update slide preview
  _updatePreview(state);
}

// ---------------------------------------------------------------------------
// DISCREPANCY WARNINGS
// ---------------------------------------------------------------------------

function _updateDiscrepancyWarnings(state) {
  const disc = areaSummaryDiscrepancy(state.areaSummary, state.jumperRegister);
  const riContainer = document.getElementById("section-report-info");
  if (riContainer) setDiscrepancyWarnings(disc.warnings, riContainer);
}

// ---------------------------------------------------------------------------
// GLOBAL STATUS PANEL
// ---------------------------------------------------------------------------

function _updateStatusPanel(state) {
  const panel = document.getElementById("app-status-panel");
  if (!panel) return;

  const result      = validateFullState(state);
  const hasErrors   = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  const exportPptxBtn = document.getElementById("btn-export-pptx");
  if (exportPptxBtn) {
    exportPptxBtn.disabled = hasErrors;
    if (hasErrors) {
      exportPptxBtn.title = "Export diblokir karena terdapat error validasi";
    } else {
      exportPptxBtn.title = "Download PowerPoint Editable (16:9)";
    }
  }

  if (!hasErrors && !hasWarnings) {
    panel.innerHTML = `<div class="alert alert--info">✓ Tidak ada error. Preview aktif. Klik "Download PPTX" untuk mengunduh laporan editable.</div>`;
    return;
  }

  const totalIssues = result.errors.length + result.warnings.length;
  const errorText = hasErrors ? `<span class="text-danger">${result.errors.length} error</span>` : "";
  const warnText = hasWarnings ? `<span class="text-warning">${result.warnings.length} warning</span>` : "";
  const sep = hasErrors && hasWarnings ? " & " : "";
  const summaryText = `<strong>${totalIssues} item perlu perhatian:</strong> ${errorText}${sep}${warnText}. Export diblokir jika ada error.`;

  const toggleLabel = _isValidationPanelExpanded ? "Sembunyikan detail" : "Lihat detail";
  const displayStyle = _isValidationPanelExpanded ? "block" : "none";

  const errorListHTML = hasErrors
    ? `<div class="alert alert--error" style="margin-top:10px;">
        <strong>Error (Memblokir Export):</strong>
        <ul style="margin-left:20px;">${result.errors.map((e) => `<li>${_esc(e)}</li>`).join("")}</ul>
       </div>`
    : "";

  const warnListHTML = hasWarnings
    ? `<div class="alert alert--warning" style="margin-top:10px;">
        <strong>Perhatian (Tidak Memblokir):</strong>
        <ul style="margin-left:20px;">${result.warnings.map((w) => `<li>${_esc(w)}</li>`).join("")}</ul>
       </div>`
    : "";

  panel.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="flex:1;">${summaryText}</div>
      <button class="btn btn--ghost btn--sm" id="toggle-validation-btn" type="button">
        ${toggleLabel}
      </button>
    </div>
    <div id="validation-details-container" style="display:${displayStyle}; margin-top: 8px;">
      ${errorListHTML}
      ${warnListHTML}
    </div>
  `;

  const toggleBtn = document.getElementById("toggle-validation-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      _isValidationPanelExpanded = !_isValidationPanelExpanded;
      _updateStatusPanel(getState());
    });
  }
}

// ---------------------------------------------------------------------------
// SLIDE PREVIEW
// ---------------------------------------------------------------------------

function _updatePreview(state) {
  const previewContainer = document.getElementById("section-preview");
  if (!previewContainer) return;

  // Chart.js diakses dari window (dimuat via CDN di index.html)
  const ChartJS = window.Chart || null;

  renderSlidePreview(previewContainer, state, ChartJS);
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function _esc(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}