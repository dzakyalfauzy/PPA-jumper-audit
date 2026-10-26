/**
 * formRegister.js
 * Form B: Jumper Authorized Register — CRUD (schema revisi).
 *
 * Tanggung jawab:
 *   - Render tabel ringkasan Jumper Authorized: ID | PLC | Area | Category |
 *     Installed | Due Date | Status | Aksi.
 *   - Modal Add/Edit: ID numerik 3-digit, Area → dropdown PLC tergantung area
 *     (PLC_BY_AREA), Installed Date & Due Date (type="date", YYYY-MM-DD).
 *   - Status (Active / Expiring Soon / Expired) DIHITUNG dari Due Date — bukan input.
 *   - Field lama (Authorization, MOC, Identification Year, Removal, Quantity,
 *     Due Date Status, installedWeekOrDate) tidak lagi ada pada form maupun data model.
 *   - Validasi semua field wajib; error ditampilkan dekat input.
 *   - Memanggil onStateChange setiap ada perubahan.
 *
 * Prinsip:
 *   - Tidak menduplikasi business logic dari selectors.js.
 *   - Tidak mengarang status bisnis baru.
 */

"use strict";

import {
  AREA_ID_LIST, AREA_LABELS,
  CATEGORY_LIST,
  PLC_BY_AREA,
  JUMPER_STATUS,
  STATUS_COLORS,
  EXPIRING_SOON_MAX_DAYS,
  AUTH_TYPE,
  AUTH_TYPE_LIST,
  AUTH_TYPE_COLORS,
} from "../model/constants.js";
import {
  getJumperRegister,
  addJumperRecord,
  updateJumperRecord,
  deleteJumperRecord,
  createJumperRecord,
  nextJumperId,
  resetToBaseline,
} from "../model/state.js";
import { validateJumperRecord } from "../model/validation.js";
import { getJumperStatus } from "../logic/selectors.js";
import { resetWeeklyChartFilters } from "./formWeeklyChart.js";

// ---------------------------------------------------------------------------
// MODULE STATE
// ---------------------------------------------------------------------------

let _onStateChange = () => {};
let _editingId     = null; // jumperId yang sedang diedit, null = add mode
let _searchQuery   = ""; // text filter local UI
let _currentPage   = 1;
const PAGE_SIZE    = 10;

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export function mountFormRegister(container, { onStateChange } = {}) {
  if (typeof onStateChange === "function") _onStateChange = onStateChange;
  _render(container);
}

export function refreshFormRegister(container) {
  _render(container);
}

// ---------------------------------------------------------------------------
// RENDER — TABEL RINGKASAN
// ---------------------------------------------------------------------------

function _render(container) {
  let data = getJumperRegister();

  if (_searchQuery) {
    const q = _searchQuery.toLowerCase();
    data = data.filter(r =>
      (r.jumperId && r.jumperId.toLowerCase().includes(q)) ||
      (r.plc && r.plc.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.authorizationType && r.authorizationType.toLowerCase().includes(q))
    );
  }

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (_currentPage > totalPages) _currentPage = totalPages;
  if (_currentPage < 1) _currentPage = 1;

  const startIndex = (_currentPage - 1) * PAGE_SIZE;
  const pageData = data.slice(startIndex, startIndex + PAGE_SIZE);

  const unclassifiedCount = getJumperRegister().filter(
    (r) => !r.authorizationType || !AUTH_TYPE_LIST.includes(r.authorizationType)
  ).length;

  container.innerHTML = `
    <!-- toolbar -->
    <div class="table-toolbar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span class="text-muted">${getJumperRegister().length} total record</span>
      <input type="text" id="reg-search" class="form-input" placeholder="Cari ID, PLC, Deskripsi..." value="${_esc(_searchQuery)}" style="max-width: 250px;" />
      <span class="toolbar-spacer"></span>
      <button class="btn btn--secondary btn--sm" id="reg-reset-baseline-btn" type="button" title="Muat ulang 6 record baseline Week-40">Reset ke Baseline W40</button>
      <button class="btn btn--primary btn--sm" id="reg-add-btn" type="button">+ Tambah Jumper Baru</button>
    </div>

    ${unclassifiedCount > 0 ? `
    <!-- warning record belum diklasifikasikan -->
    <div class="alert alert--warning" style="margin-bottom:12px;background:#FFFBEB;border:1px solid #FCD34D;color:#92400E;padding:10px 14px;border-radius:6px;font-size:0.875rem;">
      <strong>Perhatian:</strong> Terdapat ${unclassifiedCount} record lama yang belum memiliki klasifikasi Authorization Type. Silakan klik <strong>Edit</strong> pada record tersebut dan pilih <strong>Authorized</strong> atau <strong>Non-Authorized</strong>.
    </div>
    ` : ""}

    <!-- status legend -->
    <div class="oq-banner" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
      <strong>Status dihitung otomatis dari Due Date:</strong>
      <span style="background:${STATUS_COLORS[JUMPER_STATUS.ACTIVE].bg};color:${STATUS_COLORS[JUMPER_STATUS.ACTIVE].text};padding:2px 10px;border-radius:10px;font-weight:600;">Active (> ${EXPIRING_SOON_MAX_DAYS} hari)</span>
      <span style="background:${STATUS_COLORS[JUMPER_STATUS.EXPIRING_SOON].bg};color:${STATUS_COLORS[JUMPER_STATUS.EXPIRING_SOON].text};padding:2px 10px;border-radius:10px;font-weight:600;">Expiring Soon (0–${EXPIRING_SOON_MAX_DAYS} hari)</span>
      <span style="background:${STATUS_COLORS[JUMPER_STATUS.EXPIRED].bg};color:${STATUS_COLORS[JUMPER_STATUS.EXPIRED].text};padding:2px 10px;border-radius:10px;font-weight:600;">Expired (lewat)</span>
    </div>

    <!-- table -->
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>PLC</th>
            <th>Area</th>
            <th>Category</th>
            <th>Auth Type</th>
            <th>Installed</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="reg-tbody">
          ${_renderRows(pageData)}
        </tbody>
      </table>
    </div>

    <!-- pagination -->
    <div class="pagination-bar" style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding:6px 0;flex-wrap:wrap;gap:8px;">
      <span class="text-muted" style="font-size:0.875rem;">
        Menampilkan ${totalItems === 0 ? 0 : startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, totalItems)} dari ${totalItems} data (Halaman ${_currentPage} dari ${totalPages})
      </span>
      <div style="display:flex;gap:6px;">
        <button class="btn btn--secondary btn--sm" id="reg-page-prev" type="button" ${_currentPage <= 1 ? "disabled" : ""}>« Sebelumnya</button>
        <button class="btn btn--secondary btn--sm" id="reg-page-next" type="button" ${_currentPage >= totalPages ? "disabled" : ""}>Berikutnya »</button>
      </div>
    </div>

    ${getJumperRegister().length === 0 ? '<div class="empty-state">Belum ada data jumper. Klik "+ Tambah Jumper" untuk mulai.</div>' : ""}

    <!-- Modal (hidden by default) -->
    <div class="modal-backdrop" id="reg-modal-backdrop" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="reg-modal-title">
      <div class="modal">
        <div class="modal__header">
          <h3 id="reg-modal-title">Tambah Jumper</h3>
          <button class="modal-close" id="reg-modal-close" type="button" aria-label="Tutup">×</button>
        </div>
        <div class="modal__body" id="reg-modal-body">
          ${_buildModalForm()}
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" id="reg-modal-cancel" type="button">Batal</button>
          <button class="btn btn--primary" id="reg-modal-save" type="button">Simpan</button>
        </div>
      </div>
    </div>
  `;

  _bindEvents(container);
}

function _statusBadge(dueDate) {
  const status = getJumperStatus(dueDate);
  if (!status) {
    return `<span class="text-muted" title="Due Date kosong/tidak valid — status tidak dapat ditentukan">—</span>`;
  }
  const c = STATUS_COLORS[status];
  return `<span style="background:${c.bg};color:${c.text};padding:2px 10px;border-radius:10px;font-weight:600;white-space:nowrap;">${_esc(status)}</span>`;
}

function _authTypeBadge(authorizationType) {
  if (authorizationType === AUTH_TYPE.AUTHORIZED) {
    return `<span style="background:${AUTH_TYPE_COLORS[AUTH_TYPE.AUTHORIZED].bg};color:${AUTH_TYPE_COLORS[AUTH_TYPE.AUTHORIZED].text};padding:2px 10px;border-radius:10px;font-weight:600;white-space:nowrap;">Authorized</span>`;
  }
  if (authorizationType === AUTH_TYPE.NON_AUTHORIZED) {
    return `<span style="background:${AUTH_TYPE_COLORS[AUTH_TYPE.NON_AUTHORIZED].bg};color:${AUTH_TYPE_COLORS[AUTH_TYPE.NON_AUTHORIZED].text};padding:2px 10px;border-radius:10px;font-weight:600;white-space:nowrap;">Non-Authorized</span>`;
  }
  return `<span style="background:#FEE2E2;color:#991B1B;padding:2px 10px;border-radius:10px;font-weight:600;white-space:nowrap;" title="Klik Edit untuk memilih klasifikasi">Perlu Klasifikasi</span>`;
}

function _renderRows(data) {
  if (data.length === 0) {
    return `<tr><td colspan="9" class="empty-state">Belum ada data.</td></tr>`;
  }
  return data.map((r) => `
    <tr>
      <td><strong>${_esc(r.jumperId)}</strong></td>
      <td>${_esc(r.plc)}</td>
      <td>${AREA_LABELS[r.areaId] || _esc(r.areaId)}</td>
      <td>${_esc(r.category)}</td>
      <td>${_authTypeBadge(r.authorizationType)}</td>
      <td>${_esc(r.installedDate) || '<span class="text-muted">—</span>'}</td>
      <td>${_esc(r.dueDate) || '<span class="text-muted">—</span>'}</td>
      <td>${_statusBadge(r.dueDate)}</td>
      <td class="cell-actions">
        <button class="btn btn--ghost btn--sm" data-edit-id="${_esc(r.jumperId)}" type="button">Edit</button>
        <button class="btn btn--danger btn--sm" data-delete-id="${_esc(r.jumperId)}" type="button">Hapus</button>
      </td>
    </tr>
  `).join("");
}

// ---------------------------------------------------------------------------
// MODAL FORM HTML
// ---------------------------------------------------------------------------

function _buildModalForm() {
  const areaOptions = AREA_ID_LIST.map((id) => `<option value="${id}">${AREA_LABELS[id]}</option>`).join("");
  const catOptions  = CATEGORY_LIST.map((c) => `<option value="${c}">${c}</option>`).join("");
  const authOptions = AUTH_TYPE_LIST.map((a) => `<option value="${a}">${a}</option>`).join("");

  return `
    <div class="alert alert--error" id="reg-form-errors" style="display:none;"></div>

    <!-- ─── SECTION 1: Identity ─── -->
    <p class="form-label" style="margin-bottom:8px;">Identitas Jumper</p>
    <div class="form-grid">

      <div class="form-group">
        <label class="form-label" for="rf-id">ID <span class="required">*</span></label>
        <input type="text" id="rf-id" class="form-input" placeholder="Misal: 007" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" />
        <div class="field-error" id="rf-err-id"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-area">Area <span class="required">*</span></label>
        <select id="rf-area" class="form-select">
          <option value="">-- Pilih --</option>${areaOptions}
        </select>
        <div class="field-error" id="rf-err-area"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-plc">PLC <span class="required">*</span></label>
        <select id="rf-plc" class="form-select" disabled>
          <option value="">-- Pilih Area dahulu --</option>
        </select>
        <div class="field-error" id="rf-err-plc"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-category">Category <span class="required">*</span></label>
        <select id="rf-category" class="form-select">
          <option value="">-- Pilih --</option>${catOptions}
        </select>
        <div class="field-error" id="rf-err-category"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-auth-type">Authorization Type <span class="required">*</span></label>
        <select id="rf-auth-type" class="form-select">
          <option value="">-- Pilih --</option>${authOptions}
        </select>
        <div class="field-error" id="rf-err-auth-type"></div>
      </div>

      <div class="form-group form-group--full">
        <label class="form-label" for="rf-description">Description <span class="required">*</span></label>
        <textarea id="rf-description" class="form-textarea" placeholder="Deskripsi jumper..."></textarea>
        <div class="field-error" id="rf-err-description"></div>
      </div>

      <div class="form-group form-group--full">
        <label class="form-label" for="rf-equipment">Equipment / Tag <span class="text-muted" style="text-transform:none;font-weight:400;">(opsional)</span></label>
        <input type="text" id="rf-equipment" class="form-input" placeholder="Opsional" />
      </div>

    </div>

    <hr class="divider" />

    <!-- ─── SECTION 2: Tanggal ─── -->
    <p class="form-label" style="margin-bottom:8px;">Tanggal</p>
    <div class="form-grid">

      <div class="form-group">
        <label class="form-label" for="rf-installed">Installed Date <span class="required">*</span></label>
        <input type="date" id="rf-installed" class="form-input" />
        <div class="field-error" id="rf-err-installed"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-due-date">Due Date <span id="rf-due-date-req" class="text-muted" style="text-transform:none;font-weight:400;">(opsional)</span></label>
        <input type="date" id="rf-due-date" class="form-input" />
        <div class="field-error" id="rf-err-due-date"></div>
        <div class="text-muted" style="font-size:0.85em;">Status (Active / Expiring Soon / Expired) dihitung otomatis.</div>
      </div>

    </div>
  `;
}

// ---------------------------------------------------------------------------
// EVENT BINDING
// ---------------------------------------------------------------------------

function _bindEvents(container) {
  // Reset to Baseline button
  container.querySelector("#reg-reset-baseline-btn")?.addEventListener("click", () => {
    if (confirm("Reset seluruh data ke baseline referensi (6 jumper awal)? Perubahan lokal yang belum disimpan akan digantikan.")) {
      resetToBaseline();
      resetWeeklyChartFilters();
      _searchQuery = "";
      _currentPage = 1;
      _render(container);
      _onStateChange();
    }
  });

  // Add button
  container.querySelector("#reg-add-btn")?.addEventListener("click", () => {
    _openModal(container, null);
  });

  // Modal close / cancel
  container.querySelector("#reg-modal-close")?.addEventListener("click",  () => _closeModal(container));
  container.querySelector("#reg-modal-cancel")?.addEventListener("click", () => _closeModal(container));

  // Click outside modal
  container.querySelector("#reg-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target === container.querySelector("#reg-modal-backdrop")) _closeModal(container);
  });

  // Save
  container.querySelector("#reg-modal-save")?.addEventListener("click", () => _saveRecord(container));

  // Table delegation
  const tbody = container.querySelector("#reg-tbody");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const editBtn   = e.target.closest("[data-edit-id]");
      const deleteBtn = e.target.closest("[data-delete-id]");
      if (editBtn)   _openModal(container, editBtn.dataset.editId);
      if (deleteBtn) _deleteRecord(container, deleteBtn.dataset.deleteId);
    });
  }

  // Search input
  const searchInput = container.querySelector("#reg-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      _searchQuery = e.target.value;
      _render(container);
      const newSearchInput = container.querySelector("#reg-search");
      if (newSearchInput) {
        newSearchInput.focus();
        // Restore cursor position
        newSearchInput.setSelectionRange(_searchQuery.length, _searchQuery.length);
      }
    });
  }

  // Area change — repopulate PLC dropdown
  const areaSel = container.querySelector("#rf-area");
  if (areaSel) {
    areaSel.addEventListener("change", () => _populatePlcOptions(container));
  }

  // Auth Type change — dynamically update Due Date requirement indicator
  const authSel = container.querySelector("#rf-auth-type");
  if (authSel) {
    authSel.addEventListener("change", () => _updateDueDateRequirement(container));
  }

  // Pagination buttons
  container.querySelector("#reg-page-prev")?.addEventListener("click", () => {
    if (_currentPage > 1) {
      _currentPage--;
      _render(container);
    }
  });

  container.querySelector("#reg-page-next")?.addEventListener("click", () => {
    _currentPage++;
    _render(container);
  });

  // ID input — hanya boleh angka
  const idInput = container.querySelector("#rf-id");
  if (idInput) {
    idInput.addEventListener("input", () => {
      idInput.value = idInput.value.replace(/\D/g, "").slice(0, 3);
    });
  }
}

// ---------------------------------------------------------------------------
// PLC DROPDOWN (tergantung Area)
// ---------------------------------------------------------------------------

function _populatePlcOptions(container, selectedPlc = null) {
  const areaSel = container.querySelector("#rf-area");
  const plcSel  = container.querySelector("#rf-plc");
  if (!plcSel) return;

  const areaId = areaSel?.value;
  if (!areaId || !PLC_BY_AREA[areaId]) {
    plcSel.innerHTML = `<option value="">-- Pilih Area dahulu --</option>`;
    plcSel.disabled = true;
    return;
  }

  const options = PLC_BY_AREA[areaId]
    .map((p) => `<option value="${_esc(p)}"${p === selectedPlc ? " selected" : ""}>${_esc(p)}</option>`)
    .join("");
  plcSel.innerHTML = `<option value="">-- Pilih PLC --</option>${options}`;
  plcSel.disabled = false;
}

// ---------------------------------------------------------------------------
// MODAL OPEN / CLOSE
// ---------------------------------------------------------------------------

function _openModal(container, jumperId) {
  _editingId = jumperId;
  const backdrop = container.querySelector("#reg-modal-backdrop");
  const title    = container.querySelector("#reg-modal-title");

  if (jumperId) {
    // Edit mode — populate dari register
    const record = getJumperRegister().find((r) => r.jumperId === jumperId);
    if (!record) return;
    title.textContent = `Edit Jumper: ${jumperId}`;
    _populateModal(container, record);
    // Lock ID saat edit
    const idInput = container.querySelector("#rf-id");
    if (idInput) { idInput.value = record.jumperId; idInput.disabled = true; }
  } else {
    // Add mode — auto-suggest ID berikutnya
    title.textContent = "Tambah Jumper";
    _clearModal(container);
    const idInput = container.querySelector("#rf-id");
    if (idInput) {
      idInput.value = nextJumperId(getJumperRegister());
      idInput.disabled = false;
    }
  }

  _clearModalErrors(container);
  if (backdrop) backdrop.style.display = "";

  // Focus pertama
  setTimeout(() => container.querySelector("#rf-area")?.focus(), 50);
}

function _closeModal(container) {
  const backdrop = container.querySelector("#reg-modal-backdrop");
  if (backdrop) backdrop.style.display = "none";
  _editingId = null;
}

// ---------------------------------------------------------------------------
// POPULATE / CLEAR MODAL
// ---------------------------------------------------------------------------

function _updateDueDateRequirement(container) {
  const authType = container.querySelector("#rf-auth-type")?.value;
  const reqEl = container.querySelector("#rf-due-date-req");
  if (!reqEl) return;
  if (authType === AUTH_TYPE.AUTHORIZED) {
    reqEl.className = "required";
    reqEl.style.textTransform = "";
    reqEl.style.fontWeight = "";
    reqEl.textContent = "* (wajib)";
  } else {
    reqEl.className = "text-muted";
    reqEl.style.textTransform = "none";
    reqEl.style.fontWeight = "400";
    reqEl.textContent = "(opsional)";
  }
}

function _populateModal(container, record) {
  _setField(container, "#rf-id",          record.jumperId          ?? "");
  _setField(container, "#rf-area",        record.areaId            ?? "");
  // PLC dropdown harus diisi dulu sesuai area sebelum nilai dipilih
  _populatePlcOptions(container, record.plc ?? null);
  _setField(container, "#rf-category",    record.category          ?? "");
  const authVal = record.authorizationType && AUTH_TYPE_LIST.includes(record.authorizationType)
    ? record.authorizationType
    : "";
  _setField(container, "#rf-auth-type",   authVal);
  _setField(container, "#rf-description", record.description       ?? "");
  _setField(container, "#rf-equipment",   record.equipmentTag      ?? "");
  _setField(container, "#rf-installed",   record.installedDate     ?? "");
  _setField(container, "#rf-due-date",    record.dueDate           ?? "");
  _updateDueDateRequirement(container);
}

function _clearModal(container) {
  const fields = ["#rf-id","#rf-area","#rf-plc","#rf-category","#rf-auth-type","#rf-description",
    "#rf-equipment","#rf-installed","#rf-due-date"];
  fields.forEach((sel) => _setField(container, sel, ""));
  // PLC dikosongkan dan dinonaktifkan sampai area dipilih
  _populatePlcOptions(container, null);
  _updateDueDateRequirement(container);
}

function _setField(container, selector, value) {
  const el = container.querySelector(selector);
  if (el) el.value = value;
}

// ---------------------------------------------------------------------------
// SAVE RECORD
// ---------------------------------------------------------------------------

function _saveRecord(container) {
  const idEl = container.querySelector("#rf-id");
  const jumperId = _editingId || (idEl ? idEl.value.trim() : "");

  const record = createJumperRecord({
    jumperId,
    plc:               container.querySelector("#rf-plc")?.value            || null,
    areaId:            container.querySelector("#rf-area")?.value           || null,
    category:          container.querySelector("#rf-category")?.value       || null,
    authorizationType: container.querySelector("#rf-auth-type")?.value       || null,
    description:       container.querySelector("#rf-description")?.value.trim() || null,
    equipmentTag:      container.querySelector("#rf-equipment")?.value.trim()   || null,
    installedDate:     container.querySelector("#rf-installed")?.value      || null,
    dueDate:           container.querySelector("#rf-due-date")?.value       || null,
  });

  // Validasi — untuk edit, exclude jumperId dari set existing (akan di-replace)
  const existingIds = new Set(
    getJumperRegister()
      .filter((r) => _editingId === null || r.jumperId !== _editingId)
      .map((r) => r.jumperId)
  );
  const result = validateJumperRecord(record, existingIds);

  if (!result.valid) {
    _showModalErrors(container, result.errors);
    return;
  }

  _clearModalErrors(container);

  if (_editingId) {
    // Edit existing
    const patch = { ...record };
    delete patch.jumperId;
    updateJumperRecord(_editingId, patch);
  } else {
    // Add new
    const addResult = addJumperRecord(record);
    if (!addResult.added) {
      _showModalErrors(container, [addResult.reason]);
      return;
    }
  }

  _onStateChange();
  _closeModal(container);
  _render(container);
}

// ---------------------------------------------------------------------------
// DELETE RECORD
// ---------------------------------------------------------------------------

function _deleteRecord(container, jumperId) {
  if (!confirm(`Hapus jumper "${jumperId}"? Tindakan ini tidak dapat dibatalkan.`)) return;
  deleteJumperRecord(jumperId);
  _onStateChange();
  _render(container);
}

// ---------------------------------------------------------------------------
// ERROR DISPLAY
// ---------------------------------------------------------------------------

function _showModalErrors(container, errors) {
  const el = container.querySelector("#reg-form-errors");
  if (!el) return;
  el.style.display = "";
  el.innerHTML = `<strong>Terdapat kesalahan:</strong><ul>${errors.map((e) => `<li>${_esc(e)}</li>`).join("")}</ul>`;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function _clearModalErrors(container) {
  const el = container.querySelector("#reg-form-errors");
  if (el) { el.style.display = "none"; el.innerHTML = ""; }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function _esc(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}