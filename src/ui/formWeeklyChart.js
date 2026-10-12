/**
 * formWeeklyChart.js
 * Form A: Weekly Chart Data — tabel Plan/Actual per Area × Category × Week.
 *
 * Tanggung jawab:
 *   - Render tabel baris weekly chart data dari state.
 *   - Add baris baru via form input row.
 *   - Edit baris inline (klik Edit → row menjadi editable).
 *   - Hapus baris (dengan konfirmasi singkat).
 *   - Cegah kombinasi Area + Category + Week duplikat (BR-11).
 *   - Pertahankan perbedaan null dan 0 untuk Plan/Actual (BR-02).
 *   - Dropdown Week hanya menampilkan label yang ada di config.weekLabels.
 *   - Tidak membuat 12 form grafik terpisah.
 *   - Memanggil onStateChange setiap ada perubahan.
 *
 * Prinsip:
 *   - Tidak mengandung business logic.
 *   - Validasi menggunakan validateWeeklyChartRow/validateWeeklyChartData.
 */

"use strict";

import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST, STANDARD_WEEKS } from "../model/constants.js";
import {
  getConfig,
  getWeeklyChartData,
  upsertWeeklyChartRow,
  deleteWeeklyChartRow,
} from "../model/state.js";
import {
  validateWeeklyChartRow,
} from "../model/validation.js";

// ---------------------------------------------------------------------------
// MODULE STATE
// ---------------------------------------------------------------------------

let _onStateChange = () => {};
let _editingKey    = null; // "areaId|category|week" saat row sedang diedit

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export function mountFormWeeklyChart(container, { onStateChange } = {}) {
  if (typeof onStateChange === "function") _onStateChange = onStateChange;
  _render(container);
}

/** Dipanggil ulang oleh app.js setiap state berubah (misal weekLabels bertambah). */
export function refreshFormWeeklyChart(container) {
  _render(container);
}

// ---------------------------------------------------------------------------
// RENDER
// ---------------------------------------------------------------------------

function _render(container) {
  const cfg  = getConfig();
  const data = getWeeklyChartData();
  const weekLabels = cfg.weekLabels || [];
  
  // Jika sedang menambah row baru (editingKey === "NEW"), tampilkan inline form di baris pertama
  const renderNewRow = _editingKey === "NEW" ? _renderInlineFormRow() : "";

  container.innerHTML = `
    <!-- Toolbar / Add row -->
    <div class="table-toolbar">
      <span class="text-muted">
        ${data.length} baris · ${weekLabels.length} minggu dikonfigurasi
      </span>
      <span class="toolbar-spacer"></span>
      <button class="btn btn--primary btn--sm" id="wc-add-btn" type="button" ${_editingKey ? 'disabled' : ''}>
        + Tambah Baris
      </button>
    </div>

    <div class="alert alert--error" id="wc-form-errors" style="display:none; margin-bottom:12px;"></div>
    <div class="alert alert--warning" id="wc-form-warnings" style="display:none; margin-bottom:8px;"></div>

    <!-- Data table -->
    <div class="data-table-wrap">
      <table class="data-table" id="wc-table">
        <thead>
          <tr>
            <th style="width:20%">Area</th>
            <th style="width:20%">Category</th>
            <th style="width:15%">Week</th>
            <th style="width:15%">Plan</th>
            <th style="width:15%">Actual</th>
            <th style="width:15%">Aksi</th>
          </tr>
        </thead>
        <tbody id="wc-tbody">
          ${renderNewRow}
          ${_renderRows(data)}
        </tbody>
      </table>
    </div>
  `;

  _bindEvents(container);
}

function _renderRows(data) {
  if (data.length === 0 && !_editingKey) return `<tr><td colspan="6" class="empty-state">Belum ada data.</td></tr>`;
  
  return data.map((row) => {
    const key = _rowKey(row);
    if (_editingKey === key) {
      // Render mode Edit (inline)
      return _renderInlineFormRow(row.areaId, row.category, row.week, row.plan, row.actual, true);
    }
    
    // Render mode View
    const planDisplay   = row.plan   !== null && row.plan   !== undefined ? row.plan   : '<span class="text-muted">—</span>';
    const actualDisplay = row.actual !== null && row.actual !== undefined ? row.actual : '<span class="text-muted">—</span>';
    return `
      <tr data-key="${key}">
        <td>${AREA_LABELS[row.areaId] || row.areaId}</td>
        <td>${_esc(row.category)}</td>
        <td>${_esc(row.week)}</td>
        <td>${planDisplay}</td>
        <td>${actualDisplay}</td>
        <td class="cell-actions">
          <button class="btn btn--ghost btn--sm" data-edit-key="${key}" type="button">Edit</button>
          <button class="btn btn--danger btn--sm" data-delete-key="${key}" type="button">Hapus</button>
        </td>
      </tr>
    `;
  }).join("");
}

function _renderInlineFormRow(areaId = "", category = "", week = "", plan = null, actual = null, isEdit = false) {
  const cfg  = getConfig();
  // Ambil union dari config.weekLabels dan STANDARD_WEEKS agar dropdown W1-W52 selalu tersedia
  const combinedWeeks = Array.from(new Set([...(cfg.weekLabels || []), ...STANDARD_WEEKS]));
  
  const areaOpts = AREA_ID_LIST.map((id) => `<option value="${id}" ${id === areaId ? 'selected' : ''}>${AREA_LABELS[id]}</option>`).join("");
  const catOpts  = CATEGORY_LIST.map((c) => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join("");
  const weekOpts = combinedWeeks.map((l) => `<option value="${_esc(l)}" ${l === week ? 'selected' : ''}>${_esc(l)}</option>`).join("");
  
  const pVal = plan !== null ? plan : "";
  const aVal = actual !== null ? actual : "";

  return `
    <tr class="is-editing" id="wc-inline-form">
      <td><select id="wc-area" class="inline-select" ${isEdit ? 'disabled' : ''}><option value="">Pilih Area</option>${areaOpts}</select></td>
      <td><select id="wc-category" class="inline-select" ${isEdit ? 'disabled' : ''}><option value="">Pilih Category</option>${catOpts}</select></td>
      <td><select id="wc-week" class="inline-select" ${isEdit ? 'disabled' : ''}><option value="">Pilih Week</option>${weekOpts}</select></td>
      <td><input type="number" id="wc-plan" class="inline-input" min="0" step="any" placeholder="Plan" value="${pVal}" /></td>
      <td><input type="number" id="wc-actual" class="inline-input" min="0" step="any" placeholder="Actual" value="${aVal}" /></td>
      <td class="cell-actions">
        <button class="btn btn--primary btn--sm" id="wc-save-btn" type="button">Simpan</button>
        <button class="btn btn--ghost btn--sm" id="wc-cancel-btn" type="button">Batal</button>
      </td>
    </tr>
  `;
}

// ---------------------------------------------------------------------------
// EVENT BINDING
// ---------------------------------------------------------------------------

function _bindEvents(container) {
  // Add button
  container.querySelector("#wc-add-btn")?.addEventListener("click", () => {
    _openAddForm(container);
  });

  // Table action delegation
  const tbody = container.querySelector("#wc-tbody");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const editBtn   = e.target.closest("[data-edit-key]");
      const deleteBtn = e.target.closest("[data-delete-key]");
      const saveBtn   = e.target.closest("#wc-save-btn");
      const cancelBtn = e.target.closest("#wc-cancel-btn");

      if (editBtn)   _openEditForm(container, editBtn.dataset.editKey);
      if (deleteBtn) _deleteRow(container, deleteBtn.dataset.deleteKey);
      if (saveBtn)   _saveForm(container);
      if (cancelBtn) _closeForm(container);
    });
  }
}

// ---------------------------------------------------------------------------
// ADD FORM
// ---------------------------------------------------------------------------

function _openAddForm(container) {
  _editingKey = "NEW";
  _render(container);
  
  // Focus ke input pertama
  setTimeout(() => container.querySelector("#wc-area")?.focus(), 50);
}

function _openEditForm(container, key) {
  _editingKey = key;
  _render(container);
  
  // Focus ke input plan
  setTimeout(() => container.querySelector("#wc-plan")?.focus(), 50);
}

function _closeForm(container) {
  _editingKey = null;
  _render(container);
}

function _saveForm(container) {
  const cfg = getConfig();
  const weekLabels = cfg.weekLabels || [];

  const areaId   = container.querySelector("#wc-area").value;
  const category = container.querySelector("#wc-category").value;
  const week     = container.querySelector("#wc-week").value;
  const planRaw  = container.querySelector("#wc-plan").value.trim();
  const actRaw   = container.querySelector("#wc-actual").value.trim();

  // null jika kosong (null ≠ 0, BR-02)
  const plan   = planRaw  === "" ? null : Number(planRaw);
  const actual = actRaw   === "" ? null : Number(actRaw);

  const row = { areaId, category, week, plan, actual };
  const result = validateWeeklyChartRow(row, weekLabels);

  // Cek duplikat hanya saat add (editingKey = "NEW")
  if (_editingKey === "NEW") {
    const existing = getWeeklyChartData().find((r) => _rowKey(r) === _rowKey(row));
    if (existing) {
      _showFormError(container,
        [`Kombinasi Area "${AREA_LABELS[areaId]}", Category "${category}", Week "${week}" ` +
         `sudah ada. Gunakan Edit untuk mengubah nilainya.`]
      );
      return;
    }
  }

  // Tampilkan error jika ada
  if (!result.valid) {
    _showFormError(container, result.errors);
    return;
  }

  _clearFormAlert(container);

  // Tampilkan warning tapi tetap simpan
  if (result.warnings.length > 0) {
    _showFormWarning(container, result.warnings);
  }

  // Upsert ke state
  upsertWeeklyChartRow(row);
  _editingKey = null;
  _onStateChange();
  _render(container); // re-render tabel
}

function _deleteRow(container, key) {
  const [areaId, category, week] = key.split("|");
  if (!confirm(`Hapus data "${AREA_LABELS[areaId]} / ${category} / ${week}"?`)) return;
  deleteWeeklyChartRow(areaId, category, week);
  _onStateChange();
  _render(container);
}

// ---------------------------------------------------------------------------
// FORM HELPERS
// ---------------------------------------------------------------------------

function _showFormError(container, errors) {
  const el = container.querySelector("#wc-form-errors");
  if (!el) return;
  el.style.display = "";
  el.innerHTML = `<ul>${errors.map((e) => `<li>${_esc(e)}</li>`).join("")}</ul>`;
}

function _showFormWarning(container, warnings) {
  const el = container.querySelector("#wc-form-warnings");
  if (!el) return;
  el.style.display = "";
  el.innerHTML = `<strong>Perhatian:</strong><ul>${warnings.map((w) => `<li>${_esc(w)}</li>`).join("")}</ul>`;
}

function _clearFormAlert(container) {
  const errEl  = container.querySelector("#wc-form-errors");
  const warnEl = container.querySelector("#wc-form-warnings");
  if (errEl)  { errEl.style.display  = "none"; errEl.innerHTML  = ""; }
  if (warnEl) { warnEl.style.display = "none"; warnEl.innerHTML = ""; }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function _rowKey(row) { return `${row.areaId}|${row.category}|${row.week}`; }

function _esc(str) {
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
