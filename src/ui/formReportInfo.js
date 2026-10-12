/**
 * formReportInfo.js
 * Form A: Report Information dan Area Summary.
 *
 * Tanggung jawab:
 *   - Render dan bind field Report Information ke state.config.
 *   - Render dan bind Area Summary (4 area manual) ke state.areaSummary.
 *   - Kelola Chart Week Labels dengan urutan eksplisit (add/remove chip).
 *   - Kelola identificationYearFilter sebagai konfigurasi terpisah (OQ-01).
 *   - Tampilkan error validasi dekat field masing-masing.
 *   - Tampilkan discrepancy warning area summary (informatif, tidak mengubah nilai).
 *   - Memanggil onStateChange setiap ada perubahan data.
 *
 * Prinsip:
 *   - Tidak mengandung business logic — hanya membaca/menulis state.
 *   - Semua validasi menggunakan fungsi dari validation.js.
 *   - Enum placeholder ditandai dengan badge "[sementara]".
 */

"use strict";

import { AREA_ID_LIST, AREA_LABELS, STANDARD_WEEKS, sortWeekLabelsChronologically } from "../model/constants.js";
import {
  getConfig,
  getAreaSummary,
  getWeeklyChartData,
  updateConfig,
  updateAreaSummary,
} from "../model/state.js";
import {
  validateConfig,
  validateAreaSummary,
} from "../model/validation.js";
import { APP_CONFIG } from "../model/config.js";
import { calculateAreaSummariesFromWeeklyChart } from "../logic/selectors.js";

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
 * @param {HTMLElement} container
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
        <input type="number" id="ri-plc-total" class="form-input" min="1" step="1" placeholder="Misal: 24" />
        <div class="field-error" id="err-plc-total"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="ri-id-year">
          ID Year Filter <span class="required">*</span> <span class="placeholder-badge" title="OQ-01">OQ-01</span>
        </label>
        <input type="number" id="ri-id-year" class="form-input" min="2000" max="2100" placeholder="Tahun ID" />
        <div class="field-error" id="err-id-year"></div>
      </div>

      <div class="form-group form-group--full" style="border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px;">
        <label class="form-label">
          Chart Week Labels <span class="required">*</span>
          <span class="text-muted" style="font-weight:400;text-transform:none;">(urutan eksplisit — tidak diurutkan)</span>
        </label>
        <div class="week-labels-container" id="week-chips"></div>
        <div class="week-label-add mt-8" style="display:flex;gap:8px;align-items:center;">
          <select id="week-label-select" class="form-select" style="max-width:180px;">
            <option value="">-- Pilih W1–W52 --</option>
            ${Array.from({ length: 52 }, (_, i) => `<option value="W${i + 1}">W${i + 1}</option>`).join("")}
          </select>
          <input type="text" id="week-label-input" placeholder="Atau ketik custom (cth: W1 ('26))" maxlength="20" aria-label="Tambah label" style="max-width:240px;" />
          <button class="btn btn--secondary btn--sm" id="week-label-add-btn" type="button">+ Tambah</button>
        </div>
        <div class="field-error" id="err-week-labels"></div>
      </div>
    </div>
  `;
}

function _buildAreaSummaryHTML() {
  const cfg = getConfig();
  const weeklyData = getWeeklyChartData();
  const calculatedSummaries = calculateAreaSummariesFromWeeklyChart(weeklyData, cfg.reportingWeek, cfg.reportingYear);

  const areaSummaryCards = AREA_ID_LIST.map((areaId) => {
    const calc = calculatedSummaries[areaId];
    const displayVal = calc.totalActual !== null ? calc.totalActual : "—";
    const statusNote = calc.isComplete
      ? `<span class="badge badge--success" style="font-size:10px;">Lengkap</span>`
      : `<span class="badge badge--warning" style="font-size:10px;" title="Beberapa kategori belum memiliki nilai Actual">Data Belum Lengkap</span>`;

    return `
    <div class="area-card" id="area-card-${areaId}">
      <div class="area-card__label" style="display:flex;justify-content:space-between;align-items:center;">
        <span>${AREA_LABELS[areaId]}</span>
        ${statusNote}
      </div>
      <div class="area-card__value-display" style="font-size:2rem;font-weight:700;text-align:center;padding:12px 0;">
        ${displayVal} <span style="font-size:1rem;font-weight:400;color:var(--color-text-muted);">jumpers</span>
      </div>
      <input
        type="hidden"
        id="area-${areaId}"
        data-area="${areaId}"
        value="${calc.totalActual !== null ? calc.totalActual : ''}"
      />
      <div class="field-error" id="area-err-${areaId}"></div>
      <div class="field-warning" id="area-disc-${areaId}"></div>
    </div>
  `;
  }).join("");

  return `
    <div id="area-discrepancy-banner"></div>
    <div class="area-summary-grid">
      ${areaSummaryCards}
    </div>
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

  const idYearInput = container.querySelector("#ri-id-year");
  if (idYearInput) {
    idYearInput.addEventListener("change", () => {
      const raw = idYearInput.value.trim();
      const val = raw === "" ? null : parseInt(raw, 10);
      updateConfig({ identificationYearFilter: val });
      _validateIdYear(container, val);
      _onStateChange();
    });
  }

  const addBtn = container.querySelector("#week-label-add-btn");
  const weekInput = container.querySelector("#week-label-input");
  const weekSelect = container.querySelector("#week-label-select");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const selected = weekSelect ? weekSelect.value.trim() : "";
      const typed = weekInput ? weekInput.value.trim() : "";
      const val = typed || selected;
      if (val) {
        _addWeekLabelValue(container, val);
        if (weekInput) weekInput.value = "";
        if (weekSelect) weekSelect.value = "";
      }
    });
  }
  if (weekInput) {
    weekInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const typed = weekInput.value.trim();
        if (typed) {
          _addWeekLabelValue(container, typed);
          weekInput.value = "";
        }
      }
    });
  }

  const chipsContainer = container.querySelector("#week-chips");
  if (chipsContainer) {
    chipsContainer.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-remove-week]");
      if (!removeBtn) return;
      const label = removeBtn.dataset.removeWeek;
      _removeWeekLabel(container, label);
    });
  }
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
// WEEK LABEL MANAGEMENT
// ---------------------------------------------------------------------------

function _addWeekLabelValue(container, label) {
  const errEl = container.querySelector("#err-week-labels");
  if (!label) return;

  const cfg = getConfig();
  if (cfg.weekLabels.includes(label)) {
    if (errEl) errEl.textContent = `Label "${label}" sudah ada. Label harus unik.`;
    return;
  }

  const newLabels = sortWeekLabelsChronologically([...cfg.weekLabels, label], cfg.reportingYear || 2026);
  updateConfig({ weekLabels: newLabels });
  if (errEl) errEl.textContent = "";
  _renderWeekChips(container);
  _onStateChange();
}

function _addWeekLabel(container, weekInput) {
  const label = weekInput.value.trim();
  _addWeekLabelValue(container, label);
  weekInput.value = "";
}

function _removeWeekLabel(container, label) {
  const cfg = getConfig();
  updateConfig({ weekLabels: cfg.weekLabels.filter((l) => l !== label) });
  _renderWeekChips(container);
  _onStateChange();
}

function _renderWeekChips(container) {
  const chipsEl = container.querySelector("#week-chips");
  if (!chipsEl) return;
  const cfg = getConfig();
  chipsEl.innerHTML = cfg.weekLabels.map((label) => `
    <span class="week-label-chip">
      ${_esc(label)}
      <button type="button" data-remove-week="${_esc(label)}" title="Hapus ${_esc(label)}" aria-label="Hapus ${_esc(label)}">×</button>
    </span>
  `).join("");
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
  _setVal(container, "#ri-id-year",   cfg.identificationYearFilter ?? "");

  _renderWeekChips(container);
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
    "err-week-labels":"Week Labels",
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

function _validateIdYear(container, val) {
  const errEl = container.querySelector("#err-id-year");
  if (!errEl) return;
  if (val !== null && (!Number.isInteger(val) || val < 2000 || val > 2100)) {
    errEl.textContent = "Tahun tidak valid (2000–2100).";
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
      Nilai Area Summary manual berbeda dari hitungan Jumper Register (aktif, sum Quantity).
      Nilai manual <strong>tidak diubah</strong>. Basis perbandingan masih belum dikonfirmasi (OQ).
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
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
