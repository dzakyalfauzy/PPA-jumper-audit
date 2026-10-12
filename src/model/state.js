/**
 * state.js
 * State object tunggal untuk PPA Jumper Audit Automation.
 *
 * Prinsip:
 *   - Satu sumber data (single source of truth) untuk semua layer: UI, kalkulasi, preview, export.
 *   - Field manual TIDAK pernah ditimpa oleh hasil kalkulasi (BR-01, BR-02, BR-12).
 *   - Nilai null berbeda dari 0 dan string kosong (§1.2, BR-02).
 *   - Urutan weekLabels dipertahankan sesuai input user — tidak di-sort (§9.1, OQ-07).
 *   - Jumper ID harus unik; key Area+Category+Week pada weeklyChartData harus unik (BR-11).
 *
 * Struktur state mengikuti data model PRD §9.
 * Mutasi state hanya melalui fungsi yang diekspor dari file ini.
 */

"use strict";

import { AREA_ID_LIST } from "./constants.js";

// ---------------------------------------------------------------------------
// STATE AWAL
// ---------------------------------------------------------------------------

/**
 * Membuat state baru yang kosong/default.
 * Gunakan fungsi ini untuk inisialisasi atau reset.
 * @returns {object} state object
 */
export function createInitialState() {
  return {
    /**
     * config — Report Information (Form A §8.1)
     * Semua field wajib diisi sebelum export diizinkan.
     */
    config: {
      title:            "",    // Report Title — tidak boleh kosong
      plantArea:        "",    // Plant Area — tidak boleh kosong
      reportingYear:    null,  // Integer tahun valid; null = belum diisi
      reportingWeek:    null,  // Integer minggu valid; null = belum diisi
      weekLabels:       [],    // Array string label minggu; urutan eksplisit sesuai input user
      totalPlcInScope:  null,  // Integer > 0; null = belum diisi; denominator remaining PLC
    },

    /**
     * areaSummary — Area Summary (Form A §8.2)
     * MANUAL: nilai ini tidak boleh ditimpa oleh kalkulasi register (BR-01).
     * jumperCount: null = belum diisi; 0 = diisi eksplisit dengan nol.
     */
    areaSummary: AREA_ID_LIST.map((areaId) => ({
      areaId,
      jumperCount: null, // Integer >= 0; null = belum diisi
    })),

    /**
     * weeklyChartData — Weekly Chart Data (Form A §8.3)
     * Array of { areaId, category, week, plan, actual }
     * Key unik: areaId + category + week (BR-11).
     * plan/actual: null = belum diisi (BUKAN sama dengan 0) (BR-02).
     */
    weeklyChartData: [],

    /**
     * jumperRegister — Jumper Register (Form B §8.4–8.5)
     * Array of record jumper; lihat createJumperRecord() untuk struktur field.
     * jumperId harus unik di seluruh array (BR-11).
     */
    jumperRegister: [],
  };
}

// State aktif sesi (singleton untuk browser environment).
// Di-reset saat createInitialState() dipanggil ulang.
let _state = createInitialState();

// ---------------------------------------------------------------------------
// GETTER — Baca state (immutable view)
// ---------------------------------------------------------------------------

/**
 * Mengembalikan salinan state saat ini.
 * Gunakan untuk membaca data; jangan mutasi hasil return langsung.
 * @returns {object}
 */
export function getState() {
  return _state;
}

/**
 * Mengembalikan salinan config.
 * @returns {object}
 */
export function getConfig() {
  return { ..._state.config };
}

/**
 * Mengembalikan salinan areaSummary.
 * @returns {Array}
 */
export function getAreaSummary() {
  return _state.areaSummary.map((a) => ({ ...a }));
}

/**
 * Mengembalikan salinan weeklyChartData.
 * Urutan array dipertahankan sesuai input user.
 * @returns {Array}
 */
export function getWeeklyChartData() {
  return _state.weeklyChartData.map((d) => ({ ...d }));
}

/**
 * Mengembalikan salinan jumperRegister.
 * @returns {Array}
 */
export function getJumperRegister() {
  return _state.jumperRegister.map((r) => ({ ...r }));
}

// ---------------------------------------------------------------------------
// SETTER — Mutasi state (semua melalui fungsi ini)
// ---------------------------------------------------------------------------

/**
 * Memperbarui satu atau lebih field config.
 * Field yang tidak disertakan tidak berubah.
 * @param {Partial<config>} patch
 */
export function updateConfig(patch) {
  _state = {
    ..._state,
    config: { ..._state.config, ...patch },
  };
}

/**
 * Memperbarui jumperCount untuk satu area.
 * Nilai null dipertahankan (tidak diubah ke 0).
 * @param {string} areaId
 * @param {number|null} jumperCount
 */
export function updateAreaSummary(areaId, jumperCount) {
  _state = {
    ..._state,
    areaSummary: _state.areaSummary.map((a) =>
      a.areaId === areaId ? { ...a, jumperCount } : a
    ),
  };
}

/**
 * Menambah atau mengganti satu baris weekly chart data.
 * Key: areaId + category + week (harus unik — BR-11).
 * Jika kombinasi sudah ada, baris lama diganti.
 * @param {{ areaId, category, week, plan, actual }} row
 * @returns {{ replaced: boolean }}
 */
export function upsertWeeklyChartRow(row) {
  const existing = _state.weeklyChartData.findIndex(
    (d) => d.areaId === row.areaId && d.category === row.category && d.week === row.week
  );
  if (existing >= 0) {
    const updated = [..._state.weeklyChartData];
    updated[existing] = { ...row };
    _state = { ..._state, weeklyChartData: updated };
    return { replaced: true };
  }
  _state = { ..._state, weeklyChartData: [..._state.weeklyChartData, { ...row }] };
  return { replaced: false };
}

/**
 * Menghapus satu baris weekly chart data berdasarkan key.
 * @param {string} areaId
 * @param {string} category
 * @param {string} week
 * @returns {{ deleted: boolean }}
 */
export function deleteWeeklyChartRow(areaId, category, week) {
  const before = _state.weeklyChartData.length;
  _state = {
    ..._state,
    weeklyChartData: _state.weeklyChartData.filter(
      (d) => !(d.areaId === areaId && d.category === category && d.week === week)
    ),
  };
  return { deleted: _state.weeklyChartData.length < before };
}

/**
 * Menambah record jumper baru ke register.
 * jumperId harus unik — pemanggil wajib memvalidasi sebelum memanggil fungsi ini.
 * @param {object} record — lihat createJumperRecord()
 * @returns {{ added: boolean, reason?: string }}
 */
export function addJumperRecord(record) {
  const duplicate = _state.jumperRegister.some(
    (r) => r.jumperId === record.jumperId
  );
  if (duplicate) {
    return { added: false, reason: "Duplicate jumperId: " + record.jumperId };
  }
  _state = {
    ..._state,
    jumperRegister: [..._state.jumperRegister, { ...record }],
  };
  return { added: true };
}

/**
 * Memperbarui record jumper yang sudah ada (berdasarkan jumperId).
 * jumperId tidak boleh diubah melalui fungsi ini — buat record baru jika perlu.
 * @param {string} jumperId
 * @param {Partial<jumperRecord>} patch
 * @returns {{ updated: boolean, reason?: string }}
 */
export function updateJumperRecord(jumperId, patch) {
  const idx = _state.jumperRegister.findIndex((r) => r.jumperId === jumperId);
  if (idx < 0) {
    return { updated: false, reason: "Record not found: " + jumperId };
  }
  // Cegah pengubahan jumperId melalui patch
  const safePatch = { ...patch };
  delete safePatch.jumperId;

  const updated = [..._state.jumperRegister];
  updated[idx] = { ...updated[idx], ...safePatch };
  _state = { ..._state, jumperRegister: updated };
  return { updated: true };
}

/**
 * Menghapus record jumper berdasarkan jumperId.
 * @param {string} jumperId
 * @returns {{ deleted: boolean }}
 */
export function deleteJumperRecord(jumperId) {
  const before = _state.jumperRegister.length;
  _state = {
    ..._state,
    jumperRegister: _state.jumperRegister.filter((r) => r.jumperId !== jumperId),
  };
  return { deleted: _state.jumperRegister.length < before };
}

// ---------------------------------------------------------------------------
// BASELINE WEEK-40 MASTER DATASET & STORAGE PERSISTENCE (Task F)
// ---------------------------------------------------------------------------

export const WEEK_40_BASELINE = Object.freeze({
  config: {
    title: "PPA JUMPER AUDIT WEEK-40",
    plantArea: "Process Plant Area",
    reportingYear: 2026,
    reportingWeek: 40,
    weekLabels: ["W38", "W39", "W40", "W41", "W42"],
    totalPlcInScope: 69,
    identificationYearFilter: 2026,
  },
  areaSummary: [
    { areaId: "dryer_cm", jumperCount: 6 },
    { areaId: "kiln_cts", jumperCount: 3 },
    { areaId: "furnace", jumperCount: 0 },
    { areaId: "converter", jumperCount: 0 },
  ],
  weeklyChartData: [
    // Dryer-CM
    { areaId: "dryer_cm", category: "Shortbranches", week: "W38", plan: 2, actual: 2 },
    { areaId: "dryer_cm", category: "Shortbranches", week: "W39", plan: 2, actual: 2 },
    { areaId: "dryer_cm", category: "Shortbranches", week: "W40", plan: 2, actual: 2 },
    { areaId: "dryer_cm", category: "Forces", week: "W38", plan: 2, actual: 2 },
    { areaId: "dryer_cm", category: "Forces", week: "W39", plan: 2, actual: 2 },
    { areaId: "dryer_cm", category: "Forces", week: "W40", plan: 2, actual: 2 },
    { areaId: "dryer_cm", category: "AFI", week: "W38", plan: 0, actual: 0 },
    { areaId: "dryer_cm", category: "AFI", week: "W39", plan: 0, actual: 0 },
    { areaId: "dryer_cm", category: "AFI", week: "W40", plan: 0, actual: 0 },

    // Kiln-CTS
    { areaId: "kiln_cts", category: "Shortbranches", week: "W38", plan: 0, actual: 0 },
    { areaId: "kiln_cts", category: "Shortbranches", week: "W39", plan: 0, actual: 0 },
    { areaId: "kiln_cts", category: "Shortbranches", week: "W40", plan: 0, actual: 0 },
    { areaId: "kiln_cts", category: "Forces", week: "W38", plan: 0, actual: 0 },
    { areaId: "kiln_cts", category: "Forces", week: "W39", plan: 0, actual: 0 },
    { areaId: "kiln_cts", category: "Forces", week: "W40", plan: 0, actual: 0 },
    { areaId: "kiln_cts", category: "AFI", week: "W38", plan: 3, actual: 3 },
    { areaId: "kiln_cts", category: "AFI", week: "W39", plan: 3, actual: 3 },
    { areaId: "kiln_cts", category: "AFI", week: "W40", plan: 3, actual: 3 },

    // Furnace
    { areaId: "furnace", category: "Shortbranches", week: "W38", plan: 0, actual: 0 },
    { areaId: "furnace", category: "Shortbranches", week: "W39", plan: 0, actual: 0 },
    { areaId: "furnace", category: "Shortbranches", week: "W40", plan: 0, actual: 0 },
    { areaId: "furnace", category: "Forces", week: "W38", plan: 0, actual: 0 },
    { areaId: "furnace", category: "Forces", week: "W39", plan: 0, actual: 0 },
    { areaId: "furnace", category: "Forces", week: "W40", plan: 0, actual: 0 },
    { areaId: "furnace", category: "AFI", week: "W38", plan: 0, actual: 0 },
    { areaId: "furnace", category: "AFI", week: "W39", plan: 0, actual: 0 },
    { areaId: "furnace", category: "AFI", week: "W40", plan: 0, actual: 0 },

    // Converter
    { areaId: "converter", category: "Shortbranches", week: "W38", plan: 0, actual: 0 },
    { areaId: "converter", category: "Shortbranches", week: "W39", plan: 0, actual: 0 },
    { areaId: "converter", category: "Shortbranches", week: "W40", plan: 0, actual: 0 },
    { areaId: "converter", category: "Forces", week: "W38", plan: 0, actual: 0 },
    { areaId: "converter", category: "Forces", week: "W39", plan: 0, actual: 0 },
    { areaId: "converter", category: "Forces", week: "W40", plan: 0, actual: 0 },
    { areaId: "converter", category: "AFI", week: "W38", plan: 0, actual: 0 },
    { areaId: "converter", category: "AFI", week: "W39", plan: 0, actual: 0 },
    { areaId: "converter", category: "AFI", week: "W40", plan: 0, actual: 0 },
  ],
  jumperRegister: [
    {
      jumperId: "J-001",
      plc: "D3C",
      areaId: "dryer_cm",
      category: "Shortbranches",
      description: "Shortbranches installed on PLC D3C, FSL (Flow Switch Low) Feed conv. Dryer 3",
      equipmentTag: null,
      installedWeekOrDate: "Wk10 2026",
      authorizationStatus: "Authorized",
      mocStatus: "Approved/Complete",
      identificationYear: 2026,
      removalStatus: "No",
      removalWeek: null,
      removalYear: null,
      dueDateStatus: "confirmed",
      dueDate: "Wk51 2026",
      quantity: 1,
    },
    {
      jumperId: "J-002",
      plc: "D3C1",
      areaId: "dryer_cm",
      category: "Shortbranches",
      description: "Shortbranches installed on PLC D3C MainFlame On Interlock to TR ESP",
      equipmentTag: null,
      installedWeekOrDate: "wk16",
      authorizationStatus: "Authorized",
      mocStatus: "Approved/Complete",
      identificationYear: 2026,
      removalStatus: "No",
      removalWeek: null,
      removalYear: null,
      dueDateStatus: "unconfirmed",
      dueDate: null,
      quantity: 1,
    },
    {
      jumperId: "J-003",
      plc: "CMS1",
      areaId: "dryer_cm",
      category: "Forces",
      description: "Forces installed on PLC CMS1 Level HiHi Switch Surge Bin - Digital_Alarms",
      equipmentTag: null,
      installedWeekOrDate: "Re-installed wk27",
      authorizationStatus: "Authorized",
      mocStatus: "Approved/Complete",
      identificationYear: 2026,
      removalStatus: "No",
      removalWeek: null,
      removalYear: null,
      dueDateStatus: "confirmed",
      dueDate: "Wk27 2026",
      quantity: 1,
    },
    {
      jumperId: "J-004",
      plc: "K2C",
      areaId: "kiln_cts",
      category: "AFI",
      description: "Conveying Blower opr ready E4AM01 on PLC K2C",
      equipmentTag: null,
      installedWeekOrDate: "Wk39 2026",
      authorizationStatus: "Not Authorized",
      mocStatus: "Not Available",
      identificationYear: 2026,
      removalStatus: "No",
      removalWeek: null,
      removalYear: null,
      dueDateStatus: "unconfirmed",
      dueDate: null,
      quantity: 1,
    },
    {
      jumperId: "J-005",
      plc: "K2C",
      areaId: "kiln_cts",
      category: "AFI",
      description: "Conveying Blower opr ready H21M03 on PLC K2C",
      equipmentTag: null,
      installedWeekOrDate: "Wk39 2026",
      authorizationStatus: "Not Authorized",
      mocStatus: "Not Available",
      identificationYear: 2026,
      removalStatus: "No",
      removalWeek: null,
      removalYear: null,
      dueDateStatus: "unconfirmed",
      dueDate: null,
      quantity: 1,
    },
    {
      jumperId: "J-006",
      plc: "K2C",
      areaId: "kiln_cts",
      category: "AFI",
      description: "Conveying Blower opr ready H21M04 on PLC K2C",
      equipmentTag: null,
      installedWeekOrDate: "Wk39 2026",
      authorizationStatus: "Not Authorized",
      mocStatus: "Not Available",
      identificationYear: 2026,
      removalStatus: "No",
      removalWeek: null,
      removalYear: null,
      dueDateStatus: "unconfirmed",
      dueDate: null,
      quantity: 1,
    },
  ],
});

const STORAGE_KEY = "ppa_jumper_audit_state_v1";

export function loadPersistedState() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const serialized = window.localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        if (parsed && parsed.config && Array.isArray(parsed.jumperRegister)) {
          _state = parsed;
          return true;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to load persisted state from localStorage:", e);
  }
  return false;
}

export function savePersistedState() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    }
  } catch (e) {
    console.warn("Failed to save state to localStorage:", e);
  }
}

export function resetToBaseline() {
  _state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  savePersistedState();
}

export function resetState() {
  _state = createInitialState();
}

// Inisialisasi awal: Muat baseline jika state kosong
export function initInitialDataset() {
  const loaded = loadPersistedState();
  if (!loaded) {
    resetToBaseline();
  }
}

// ---------------------------------------------------------------------------
// FACTORY — Membuat record jumper baru dengan nilai default
// ---------------------------------------------------------------------------

/**
 * Membuat object record jumper dengan semua field terdefinisi.
 * Nilai default: null untuk field opsional, 1 untuk quantity.
 * Pemanggil harus mengisi field wajib sebelum memanggil addJumperRecord().
 *
 * Field Due Date disimpan terpisah: dueDate (nilai) dan dueDateStatus (konfirmasi).
 * Ini mengikuti §8.6 — jangan gabungkan menjadi satu string.
 *
 * @param {Partial<jumperRecord>} overrides
 * @returns {object}
 */
export function createJumperRecord(overrides = {}) {
  return {
    // Identity (§8.4)
    jumperId:            null,  // string unik; wajib
    plc:                 null,  // string; wajib
    areaId:              null,  // AREA_IDS value; wajib
    category:            null,  // CATEGORIES value; wajib
    description:         null,  // string; wajib
    equipmentTag:        null,  // string; opsional

    // Status dan Periode (§8.5)
    installedWeekOrDate: null,  // string; wajib
    authorizationStatus: null,  // AUTH_STATUS value; wajib
    mocStatus:           null,  // MOC_STATUS value; wajib
    identificationYear:  null,  // integer tahun valid; wajib (digunakan BR-03)
    removalStatus:       null,  // REMOVAL_STATUS value; wajib
    removalWeek:         null,  // string label minggu; wajib jika removalStatus = Yes
    removalYear:         null,  // integer; wajib jika removalStatus = Yes

    // Due Date (§8.6) — simpan terpisah
    dueDate:             null,  // string tanggal atau null jika unconfirmed
    dueDateStatus:       null,  // DUE_DATE_STATUS value; wajib

    // Kuantitas — digunakan di SEMUA agregasi (BR-04, BR-05, BR-07)
    quantity:            1,     // integer >= 1; default 1

    ...overrides,
  };
}
