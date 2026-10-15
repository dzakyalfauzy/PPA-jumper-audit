/**
 * formReportInfo.js
 * Form A: Report Information dan Area Summary (revisi).
 *
 * Tanggung jawab:
 *   - Render dan bind field Report Information ke state.config.
 *   - Render dan bind Area Summary (4 area manual) ke state.areaSummary.
 *   - Chart Week Labels DIHAPUS — minggu diambil dari weeklyChartData rows.
 *   - identificationYearFilter DIHAPUS — tidak digunakan (BR-03 dihapus).
 *   - Tampilkan error validasi dekat field masing-masing.
 *   - Tampilkan discrepancy warning area summary (informatif, tidak mengubah nilai).
 *   - Memanggil onStateChange setiap ada perubahan data.
 *
 * Prinsip:
 *   - Tidak mengandung business logic — hanya membaca/menulis state.
 *   - Semua validasi menggunakan fungsi dari validation.js.
 */

"use strict";

import { AREA_ID_LIST, AREA_LABELS } from "../model/constants.js";
import {
  getConfig,
  getAreaSummary,
  updateConfig,
  updateAreaSummary,
} from "../model/state.js";
import {
  validateConfig,
  validateAreaSummary,
} from "../model/validation.js";
import { APP_CONFIG } from "../model/config.js";

// ---------------------------------------------------------------------------
// MODUL STATE (lokal — hanya untuk UI sesi ini)
// ---------------------------------------------------------------------------

let _onStateChange = () => {};
let _discrepancyWarnings = []; // injected dari luar (dari selectors)

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Inisialisasi dan mount form ke dalam container element.
 * @param {HTMLElement} containerInfo
 * @param {HTMLElement} containerArea
 * @param {{ onStateChange: Function }} options
 */
export function mountFormReportInfo(containerInfo, containerArea, { onStateChange } = {}) {
  if (typeof onStateChange === "function") _onStateChange = onStateChange;

  if (containerInfo) {
    containerInfo.innerHTML = _buildReportInfoHTML();
    _bindReportInfoEvents(containerInfo);
    _populateReportInfo(containerInfo);
  }

  if (containerArea) {
    containerArea.innerHTML = _buildAreaSummaryHTML();
    _bindAreaSummaryEvents(containerArea);
    _populateAreaSummary(containerArea);
  }
}

/**
 * Inject discrepancy warnings dari luar (dari areaSummaryDiscrepancy selector).
 * Dipanggil oleh app.js setiap kali state berubah.
 * @param {object[]} warnings
 * @param {HTMLElement} containerArea
 */
export function setDiscrepancyWarnings(warnings, containerArea) {
  _discrepancyWarnings = warnings || [];
  _renderDiscrepancyWarnings(containerArea);
}

/**
 * Mengembalikan error validasi saat ini (array string).
 * Digunakan app.js untuk memblokir export.
 */
export function getValidationErrors() {
  const state = { config: getConfig(), areaSummary: getAreaSummary() };
  const configResult = validateConfig(state.config);
  const summaryResult = validateAreaSummary(state.areaSummary);
  return [...configResult.errors, ...summaryResult.errors];
}

// ---------------------------------------------------------------------------
// HTML BUILDER
// ---------------------------------------------------------------------------

function _buildReportInfoHTML() {
  return `
    <div class="form-grid" id="report-info-grid">
      <div class="form-group form-group--full">
        <label class="form-label" for="ri-title">
          Report Title <span class="required">*</span>
        </label>
        <input type="text" id="ri-title" class="form-input" placeholder="Misal: PPA Jumper Audit Week-40 2026" />
        <div class="field-error" id="err-title"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="ri-plant-area">Plant Area <span class="required">*</span></label>
        <input type="text" id="ri-plant-area" class="form-input" placeholder="Misal: PP Area" />
        <div class="field-error" id="err-plant-area"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="ri-year">Reporting Year <span class="required">*</span></label>
        <input type="number" id="ri-year" class="form-input" min="2000" max="2100" placeholder="2026" />
        <div class="field-error" id="err-year"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="ri-week">Reporting Week <span class="required">*</span></label>
        <select id="ri-week" class="form-select">
          <option value="">-- Pilih Minggu (W1-W52) --</option>
          ${Array.from({ length: 52 }, (_, i) => `<option value="${i + 1}">W${i + 1}</option>`).join("")}
        </select>
        <div class="field-error" id="err-week"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="ri-plc-total">Total PLC in Scope <span class="required">*</span></label>
        <input type="number" id="ri-plc-total" class="form-input" min="1" step="1" placeholder="Misal: 69" />
        <div class="field-error" id="err-plc-total"></div>
      </div>
    </div>
  `;
}

function _buildAreaSummaryHTML() {
  const areaSummaryCards = AREA_ID_LIST.map((areaId) => `
    <div class="area-card" id="area-card-${areaId}">
      <div class="area-card__label">${AREA_LABELS[areaId]}</div>
      <input
        type="number"
        id="area-${areaId}"
        data-area="${areaId}"
        class="area-card__input"
        min="0"
        step="1"
        placeholder="Manual input"
      />
      <div class="field-error" id="area-err-${areaId}"></div>
      <div class="field-warning" id="area-disc-${areaId}"></div>
    </div>
  `).join("");

  return `
    <div id="area-discrepancy-banner"></div>
    <div class="area-summary-grid">
      ${areaSummaryCards}
    </div>
    <p class="text-muted" style="font-size: 0.85rem; margin-top: 8px;">
      Nilai Area Summary adalah input manual (tidak ditimpa Register). Weekly Chart Data mengatur Plan dan Actual.
    </p>
  `;
}

// ---------------------------------------------------------------------------
// EVENT BINDING
// ---------------------------------------------------------------------------

function _bindReportInfoEvents(container) {
  _bindInput(container, "#ri-title",     (v) => updateConfig({ title: v }), "err-title");
  _bindInput(container, "#ri-plant-area",(v) => updateConfig({ plantArea: v }), "err-plant-area");
  _bindNumberInput(container, "#ri-year", (v) => updateConfig({ reportingYear: v }), "err-year");
  _bindNumberInput(container, "#ri-week", (v) => updateConfig({ reportingWeek: v }), "err-week");
  _bindNumberInput(container, "#ri-plc-total", (v) => updateConfig({ totalPlcInScope: v }), "err-plc-total");
}

function _bindAreaSummaryEvents(container) {
  AREA_ID_LIST.forEach((areaId) => {
    const input = container.querySelector(`#area-${areaId}`);
    if (!input) return;
    input.addEventListener("change", () => {
      const raw = input.value.trim();
      const val = raw === "" ? null : parseInt(raw, 10);
      updateAreaSummary(areaId, val);
      _validateAreaInput(container, areaId, val);
      _onStateChange();
    });
  });
}

function _bindInput(container, selector, updater, errId) {
  const el = container.querySelector(selector);
  if (!el) return;
  el.addEventListener("input", () => {
    const val = el.value.trim();
    updater(val);
    _clearError(container, errId);
    _onStateChange();
  });
  el.addEventListener("blur", () => {
    _runConfigValidation(container);
  });
}

function _bindNumberInput(container, selector, updater, errId) {
  const el = container.querySelector(selector);
  if (!el) return;
  el.addEventListener("change", () => {
    const raw = el.value.trim();
    const val = raw === "" ? null : Number(raw);
    updater(isNaN(val) ? null : val);
    _clearError(container, errId);
    _onStateChange();
  });
  el.addEventListener("blur", () => {
    _runConfigValidation(container);
  });
}

// ---------------------------------------------------------------------------
// POPULATE (saat mount — dari state existing)
// ---------------------------------------------------------------------------

function _populateReportInfo(container) {
  const cfg = getConfig();

  _setVal(container, "#ri-title",     cfg.title);
  _setVal(container, "#ri-plant-area",cfg.plantArea);
  _setVal(container, "#ri-year",      cfg.reportingYear ?? "");
  _setVal(container, "#ri-week",      cfg.reportingWeek ?? "");
  _setVal(container, "#ri-plc-total", cfg.totalPlcInScope ?? "");
}

function _populateAreaSummary(container) {
  const summary = getAreaSummary();
  summary.forEach(({ areaId, jumperCount }) => {
    const el = container.querySelector(`#area-${areaId}`);
    if (el) el.value = jumperCount !== null ? jumperCount : "";
  });
}

// ---------------------------------------------------------------------------
// VALIDATION DISPLAY
// ---------------------------------------------------------------------------

function _runConfigValidation(container) {
  const cfg = getConfig();
  const result = validateConfig(cfg);

  // Map error message ke field ID (heuristic match)
  const fieldMap = {
    "err-title":     "Report Title",
    "err-plant-area":"Plant Area",
    "err-year":      "Reporting Year",
    "err-week":      "Reporting Week",
    "err-plc-total": "Total PLC",
  };

  // Clear semua dulu
  Object.keys(fieldMap).forEach((id) => _clearError(container, id));

  result.errors.forEach((msg) => {
    for (const [errId, keyword] of Object.entries(fieldMap)) {
      if (msg.includes(keyword)) {
        _showError(container, errId, msg);
        break;
      }
    }
  });
}

function _validateAreaInput(container, areaId, val) {
  const errEl = container.querySelector(`#area-err-${areaId}`);
  if (!errEl) return;
  if (val === null) {
    errEl.textContent = "Wajib diisi.";
  } else if (!Number.isInteger(val) || val < 0) {
    errEl.textContent = "Harus bilangan bulat ≥ 0.";
  } else {
    errEl.textContent = "";
  }
}

function _renderDiscrepancyWarnings(container) {
  if (!container) return;
  const banner = container.querySelector("#area-discrepancy-banner");
  if (!banner) return;

  const discrepant = _discrepancyWarnings.filter((w) => w.discrepancy);
  if (discrepant.length === 0) {
    banner.innerHTML = "";
    AREA_ID_LIST.forEach((areaId) => {
      const el = container.querySelector(`#area-disc-${areaId}`);
      if (el) el.textContent = "";
      const card = container.querySelector(`#area-card-${areaId}`);
      if (card) card.classList.remove("has-discrepancy");
    });
    return;
  }

  banner.innerHTML = `
    <div class="alert alert--warning">
      <strong>⚠ Discrepancy Warning:</strong>
      Nilai Area Summary manual berbeda dari hitungan Jumper Authorized Register (aktif).
      Nilai manual <strong>tidak diubah</strong>.
      <ul>
        ${discrepant.map((w) => `
          <li>
            <strong>${AREA_LABELS[w.areaId] || w.areaId}</strong>:
            manual = ${w.manualCount}, register = ${w.computedCount}
          </li>
        `).join("")}
      </ul>
    </div>
  `;

  AREA_ID_LIST.forEach((areaId) => {
    const w = _discrepancyWarnings.find((x) => x.areaId === areaId);
    const discEl = container.querySelector(`#area-disc-${areaId}`);
    const card   = container.querySelector(`#area-card-${areaId}`);
    if (discEl) discEl.textContent = w && w.discrepancy ? `Register: ${w.computedCount}` : "";
    if (card)   card.classList.toggle("has-discrepancy", !!(w && w.discrepancy));
  });
}

// ---------------------------------------------------------------------------
// DOM HELPERS
// ---------------------------------------------------------------------------

function _setVal(container, selector, value) {
  const el = container.querySelector(selector);
  if (el) el.value = value ?? "";
}

function _clearError(container, id) {
  const el = container.querySelector(`#${id}`);
  if (el) el.textContent = "";
}

function _showError(container, id, msg) {
  const el = container.querySelector(`#${id}`);
  if (el) el.textContent = msg;
}

function _esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}