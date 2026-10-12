/**
 * formRegister.js
 * Form B: Jumper Register — CRUD lengkap.
 *
 * Tanggung jawab:
 *   - Render tabel ringkasan Jumper Register.
 *   - Modal Add/Edit dengan seluruh 15 field data model (§8.4, §8.5, §8.6).
 *   - Hapus record dengan konfirmasi.
 *   - Dropdown untuk semua enum (area, category, authStatus, mocStatus, removalStatus, dueDateStatus).
 *   - Due Date dan Due Date Status disimpan sebagai dua field terpisah (§8.6).
 *   - Removal Week dan Removal Year hanya ditampilkan jika Removal Status = Yes.
 *   - Validasi semua field wajib; error ditampilkan dekat input.
 *   - Enum placeholder ditandai dengan badge "[sementara]".
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
  AUTH_STATUS_LIST,
  MOC_STATUS_LIST,
  REMOVAL_STATUS, REMOVAL_STATUS_LIST,
  DUE_DATE_STATUS, DUE_DATE_STATUS_LIST,
} from "../model/constants.js";
import {
  getJumperRegister,
  addJumperRecord,
  updateJumperRecord,
  deleteJumperRecord,
  createJumperRecord,
  resetToBaseline,
} from "../model/state.js";
import { validateJumperRecord } from "../model/validation.js";

// ---------------------------------------------------------------------------
// MODULE STATE
// ---------------------------------------------------------------------------

let _onStateChange = () => {};
let _editingId     = null; // jumperId yang sedang diedit, null = add mode
let _searchQuery   = ""; // text filter local UI

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
      (r.description && r.description.toLowerCase().includes(q))
    );
  }

  container.innerHTML = `
    <!-- toolbar -->
    <div class="table-toolbar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span class="text-muted">${getJumperRegister().length} total record</span>
      <input type="text" id="reg-search" class="form-input" placeholder="Cari ID, PLC, Deskripsi..." value="${_esc(_searchQuery)}" style="max-width: 250px;" />
      <span class="toolbar-spacer"></span>
      <button class="btn btn--secondary btn--sm" id="reg-reset-baseline-btn" type="button" title="Muat ulang 6 record baseline Week-40">Reset ke Baseline W40</button>
      <button class="btn btn--primary btn--sm" id="reg-add-btn" type="button">+ Tambah Jumper Baru</button>
    </div>

    <!-- enum placeholder notice -->
    <div class="oq-banner">
      <strong>OQ-02, OQ-03:</strong> Nilai Authorization Status dan MOC Status masih
      <em>placeholder</em>. Konfirmasi dengan pemilik proses sebelum digunakan dalam laporan resmi.
    </div>

    <!-- table -->
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Jumper ID</th>
            <th>PLC</th>
            <th>Area</th>
            <th>Category</th>
            <th>Auth Status</th>
            <th>MOC Status</th>
            <th>Removal</th>
            <th>Qty</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="reg-tbody">
          ${_renderRows(data)}
        </tbody>
      </table>
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
      <td><span class="text-muted">${_esc(r.authorizationStatus)}</span></td>
      <td><span class="text-muted">${_esc(r.mocStatus)}</span></td>
      <td>${r.removalStatus === REMOVAL_STATUS.YES
          ? `<span class="text-danger">Removed (${_esc(r.removalWeek||"")} ${_esc(r.removalYear||"")})</span>`
          : `<span class="text-muted">Active</span>`
        }</td>
      <td>${r.quantity ?? 1}</td>
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
  const areaOptions   = AREA_ID_LIST.map((id) => `<option value="${id}">${AREA_LABELS[id]}</option>`).join("");
  const catOptions    = CATEGORY_LIST.map((c) => `<option value="${c}">${c}</option>`).join("");
  const authOptions   = AUTH_STATUS_LIST.map((v) => `<option value="${_esc(v)}">${_esc(v)}</option>`).join("");
  const mocOptions    = MOC_STATUS_LIST.map((v) => `<option value="${_esc(v)}">${_esc(v)}</option>`).join("");
  const remOptions    = REMOVAL_STATUS_LIST.map((v) => `<option value="${_esc(v)}">${_esc(v)}</option>`).join("");
  const dueSOptions   = DUE_DATE_STATUS_LIST.map((v) => `<option value="${_esc(v)}">${v === DUE_DATE_STATUS.CONFIRMED ? "Dikonfirmasi (ada tanggal)" : "Belum dikonfirmasi"}</option>`).join("");

  return `
    <div class="alert alert--error" id="reg-form-errors" style="display:none;"></div>

    <!-- ─── SECTION 1: Identity ─── -->
    <p class="form-label" style="margin-bottom:8px;">Identitas Jumper</p>
    <div class="form-grid">

      <div class="form-group">
        <label class="form-label" for="rf-id">Jumper ID <span class="required">*</span></label>
        <input type="text" id="rf-id" class="form-input" placeholder="Misal: J-001" />
        <div class="field-error" id="rf-err-id"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-plc">PLC <span class="required">*</span></label>
        <input type="text" id="rf-plc" class="form-input" placeholder="Misal: PLC-101" />
        <div class="field-error" id="rf-err-plc"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-area">Area <span class="required">*</span></label>
        <select id="rf-area" class="form-select">
          <option value="">-- Pilih --</option>${areaOptions}
        </select>
        <div class="field-error" id="rf-err-area"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-category">Category <span class="required">*</span></label>
        <select id="rf-category" class="form-select">
          <option value="">-- Pilih --</option>${catOptions}
        </select>
        <div class="field-error" id="rf-err-category"></div>
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

    <!-- ─── SECTION 2: Status & Periode ─── -->
    <p class="form-label" style="margin-bottom:8px;">Status dan Periode</p>
    <div class="form-grid">

      <div class="form-group">
        <label class="form-label" for="rf-installed">Installed Week/Date <span class="required">*</span></label>
        <input type="text" id="rf-installed" class="form-input" placeholder="Misal: W35-2026 atau 2026-09-01" />
        <div class="field-error" id="rf-err-installed"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-id-year">
          Identification Year <span class="required">*</span>
        </label>
        <input type="number" id="rf-id-year" class="form-input" min="2000" max="2100" placeholder="2026" />
        <div class="field-error" id="rf-err-id-year"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-auth">
          Authorization Status <span class="required">*</span>
          <span class="placeholder-badge">sementara</span>
        </label>
        <select id="rf-auth" class="form-select">
          <option value="">-- Pilih --</option>${authOptions}
        </select>
        <div class="field-error" id="rf-err-auth"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-moc">
          MOC Status <span class="required">*</span>
          <span class="placeholder-badge">sementara</span>
        </label>
        <select id="rf-moc" class="form-select">
          <option value="">-- Pilih --</option>${mocOptions}
        </select>
        <div class="field-error" id="rf-err-moc"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-removal">Removal Status <span class="required">*</span></label>
        <select id="rf-removal" class="form-select">
          <option value="">-- Pilih --</option>${remOptions}
        </select>
        <div class="field-error" id="rf-err-removal"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-qty">Quantity <span class="required">*</span></label>
        <input type="number" id="rf-qty" class="form-input" min="1" step="1" value="1" />
        <div class="field-error" id="rf-err-qty"></div>
      </div>

    </div>

    <!-- Removal detail — ditampilkan hanya jika Removal = Yes -->
    <div id="rf-removal-detail" style="display:none;" class="form-grid" style="margin-top:8px;">
      <div class="form-group">
        <label class="form-label" for="rf-removal-week">Removal Week <span class="required">*</span></label>
        <input type="text" id="rf-removal-week" class="form-input" placeholder="Misal: W40" />
        <div class="field-error" id="rf-err-removal-week"></div>
      </div>
      <div class="form-group">
        <label class="form-label" for="rf-removal-year">Removal Year <span class="required">*</span></label>
        <input type="number" id="rf-removal-year" class="form-input" min="2000" max="2100" placeholder="2026" />
        <div class="field-error" id="rf-err-removal-year"></div>
      </div>
    </div>

    <hr class="divider" />

    <!-- ─── SECTION 3: Due Date (terpisah) ─── -->
    <p class="form-label" style="margin-bottom:8px;">Due Date <span class="text-muted" style="text-transform:none;font-weight:400;">(§8.6 — nilai dan status disimpan terpisah)</span></p>
    <div class="form-grid">

      <div class="form-group">
        <label class="form-label" for="rf-due-status">Due Date Status <span class="required">*</span></label>
        <select id="rf-due-status" class="form-select">
          <option value="">-- Pilih --</option>${dueSOptions}
        </select>
        <div class="field-error" id="rf-err-due-status"></div>
      </div>

      <div class="form-group" id="rf-due-date-group">
        <label class="form-label" for="rf-due-date">
          Due Date <span class="required">*</span>
          <span class="text-muted" style="text-transform:none;font-weight:400;">(wajib jika dikonfirmasi)</span>
        </label>
        <input type="text" id="rf-due-date" class="form-input" placeholder="Misal: 2026-12-31" />
        <div class="field-error" id="rf-err-due-date"></div>
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
    if (confirm("Reset seluruh data ke baseline Week-40 (6 jumper awal)? Perubahan lokal yang belum disimpan akan digantikan.")) {
      resetToBaseline();
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

  // Removal Status change — toggle removal detail fields
  const removalSel = container.querySelector("#rf-removal");
  if (removalSel) {
    removalSel.addEventListener("change", () => _toggleRemovalDetail(container));
  }

  // Due Date Status change — toggle due date input
  const dueStatusSel = container.querySelector("#rf-due-status");
  if (dueStatusSel) {
    dueStatusSel.addEventListener("change", () => _toggleDueDateInput(container));
  }
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
    // Lock Jumper ID saat edit
    const idInput = container.querySelector("#rf-id");
    if (idInput) { idInput.value = record.jumperId; idInput.disabled = true; }
  } else {
    // Add mode
    title.textContent = "Tambah Jumper";
    _clearModal(container);
    const idInput = container.querySelector("#rf-id");
    if (idInput) idInput.disabled = false;
  }

  _clearModalErrors(container);
  _toggleRemovalDetail(container);
  _toggleDueDateInput(container);
  if (backdrop) backdrop.style.display = "";

  // Focus pertama
  setTimeout(() => container.querySelector("#rf-id")?.focus(), 50);
}

function _closeModal(container) {
  const backdrop = container.querySelector("#reg-modal-backdrop");
  if (backdrop) backdrop.style.display = "none";
  _editingId = null;
}

// ---------------------------------------------------------------------------
// POPULATE / CLEAR MODAL
// ---------------------------------------------------------------------------

function _populateModal(container, record) {
  _setField(container, "#rf-id",            record.jumperId          ?? "");
  _setField(container, "#rf-plc",           record.plc               ?? "");
  _setField(container, "#rf-area",          record.areaId            ?? "");
  _setField(container, "#rf-category",      record.category          ?? "");
  _setField(container, "#rf-description",   record.description       ?? "");
  _setField(container, "#rf-equipment",     record.equipmentTag      ?? "");
  _setField(container, "#rf-installed",     record.installedWeekOrDate ?? "");
  _setField(container, "#rf-id-year",       record.identificationYear !== null ? record.identificationYear : "");
  _setField(container, "#rf-auth",          record.authorizationStatus ?? "");
  _setField(container, "#rf-moc",           record.mocStatus          ?? "");
  _setField(container, "#rf-removal",       record.removalStatus      ?? "");
  _setField(container, "#rf-removal-week",  record.removalWeek        ?? "");
  _setField(container, "#rf-removal-year",  record.removalYear !== null ? record.removalYear : "");
  _setField(container, "#rf-due-status",    record.dueDateStatus      ?? "");
  _setField(container, "#rf-due-date",      record.dueDate            ?? "");
  _setField(container, "#rf-qty",           record.quantity           ?? 1);
}

function _clearModal(container) {
  const fields = ["#rf-id","#rf-plc","#rf-area","#rf-category","#rf-description",
    "#rf-equipment","#rf-installed","#rf-id-year","#rf-auth","#rf-moc","#rf-removal",
    "#rf-removal-week","#rf-removal-year","#rf-due-status","#rf-due-date"];
  fields.forEach((sel) => _setField(container, sel, ""));
  _setField(container, "#rf-qty", "1");
}

function _setField(container, selector, value) {
  const el = container.querySelector(selector);
  if (el) el.value = value;
}

// ---------------------------------------------------------------------------
// TOGGLE CONDITIONAL FIELDS
// ---------------------------------------------------------------------------

function _toggleRemovalDetail(container) {
  const remVal    = container.querySelector("#rf-removal")?.value;
  const detailDiv = container.querySelector("#rf-removal-detail");
  if (detailDiv) detailDiv.style.display = remVal === REMOVAL_STATUS.YES ? "" : "none";
}

function _toggleDueDateInput(container) {
  const statusVal = container.querySelector("#rf-due-status")?.value;
  const dateGroup = container.querySelector("#rf-due-date-group");
  if (dateGroup) dateGroup.style.display = statusVal === DUE_DATE_STATUS.CONFIRMED ? "" : "none";
}

// ---------------------------------------------------------------------------
// SAVE RECORD
// ---------------------------------------------------------------------------

function _saveRecord(container) {
  const idEl = container.querySelector("#rf-id");
  const jumperId = _editingId || (idEl ? idEl.value.trim() : "");

  const removalStatus = container.querySelector("#rf-removal")?.value || null;
  const dueDateStatus = container.querySelector("#rf-due-status")?.value || null;
  const idYearRaw     = container.querySelector("#rf-id-year")?.value.trim();
  const remYearRaw    = container.querySelector("#rf-removal-year")?.value.trim();
  const qtyRaw        = container.querySelector("#rf-qty")?.value.trim();

  const record = createJumperRecord({
    jumperId,
    plc:                 container.querySelector("#rf-plc")?.value.trim()          || null,
    areaId:              container.querySelector("#rf-area")?.value                || null,
    category:            container.querySelector("#rf-category")?.value            || null,
    description:         container.querySelector("#rf-description")?.value.trim() || null,
    equipmentTag:        container.querySelector("#rf-equipment")?.value.trim()   || null,
    installedWeekOrDate: container.querySelector("#rf-installed")?.value.trim()   || null,
    authorizationStatus: container.querySelector("#rf-auth")?.value               || null,
    mocStatus:           container.querySelector("#rf-moc")?.value                || null,
    identificationYear:  idYearRaw ? parseInt(idYearRaw, 10) : null,
    removalStatus,
    removalWeek:         removalStatus === REMOVAL_STATUS.YES
                           ? (container.querySelector("#rf-removal-week")?.value.trim() || null)
                           : null,
    removalYear:         removalStatus === REMOVAL_STATUS.YES && remYearRaw
                           ? parseInt(remYearRaw, 10) : null,
    dueDateStatus,
    dueDate:             dueDateStatus === DUE_DATE_STATUS.CONFIRMED
                           ? (container.querySelector("#rf-due-date")?.value.trim() || null)
                           : null,
    quantity:            qtyRaw ? parseInt(qtyRaw, 10) : 1,
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

function _clearModalAll(container) {
  _clearModal(container);
  _clearModalErrors(container);
}

function _esc(str) {
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
