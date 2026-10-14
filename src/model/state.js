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
      jumperId: "001",
      plc: "D3C",
      areaId: "dryer_cm",
      category: "Shortbranches",
      description: "Shortbranches installed on PLC D3C, FSL (Flow Switch Low) Feed conv. Dryer 3",
      equipmentTag: null,
      installedDate: "2026-03-07",
      dueDate: null,
    },
    {
      jumperId: "002",
      plc: "D3C",
      areaId: "dryer_cm",
      category: "Shortbranches",
      description: "Shortbranches installed on PLC D3C MainFlame On Interlock to TR ESP",
      equipmentTag: null,
      installedDate: "2026-04-18",
      dueDate: null,
    },
    {
      jumperId: "003",
      plc: "CMS1",
      areaId: "dryer_cm",
      category: "Forces",
      description: "Forces installed on PLC CMS1 Level HiHi Switch Surge Bin - Digital_Alarms",
      equipmentTag: null,
      installedDate: "2026-07-04",
      dueDate: null,
    },
    {
      jumperId: "004",
      plc: "K2",
      areaId: "kiln_cts",
      category: "AFI",
      description: "Conveying Blower opr ready E4AM01 on PLC K2",
      equipmentTag: null,
      installedDate: "2026-09-27",
      dueDate: null,
    },
    {
      jumperId: "005",
      plc: "K2",
      areaId: "kiln_cts",
      category: "AFI",
      description: "Conveying Blower opr ready H21M03 on PLC K2",
      equipmentTag: null,
      installedDate: "2026-09-27",
      dueDate: null,
    },
    {
      jumperId: "006",
      plc: "K2",
      areaId: "kiln_cts",
      category: "AFI",
      description: "Conveying Blower opr ready H21M04 on PLC K2",
      equipmentTag: null,
      installedDate: "2026-09-27",
      dueDate: null,
    },
  ],
});

const STORAGE_KEY = "ppa_jumper_audit_state_v1";

export function loadPersistedState() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const serialized = window.localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        let parsed = JSON.parse(serialized);
        if (parsed && parsed.config && Array.isArray(parsed.jumperRegister)) {
          // Deteksi schema lama: record punya field authorizationStatus/mocStatus
          // atau jumperId bukan 3-digit numerik → migrasikan ke schema baru.
          const isLegacy = parsed.jumperRegister.some(
            (r) =>
              r.authorizationStatus !== undefined ||
              r.mocStatus !== undefined ||
              r.removalStatus !== undefined ||
              r.installedWeekOrDate !== undefined ||
              !/^\d{3}$/.test(String(r.jumperId || ""))
          );
          if (isLegacy) {
            parsed.jumperRegister = migrateJumperRecords(parsed.jumperRegister);
          }
          _state = parsed;
          savePersistedState();
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
 * Schema baru (simplified): jumperId, plc, areaId, category, description, equipmentTag,
 *   installedDate (YYYY-MM-DD), dueDate (YYYY-MM-DD | null).
 *
 * @param {Partial<jumperRecord>} overrides
 * @returns {object}
 */
export function createJumperRecord(overrides = {}) {
  return {
    jumperId:      null,  // string 3-digit unik, e.g. "001"; wajib
    plc:           null,  // string dari PLC_BY_AREA; wajib
    areaId:        null,  // AREA_IDS value; wajib
    category:      null,  // CATEGORIES value; wajib
    description:   null,  // string; wajib
    equipmentTag:  null,  // string; opsional
    installedDate: null,  // YYYY-MM-DD; wajib
    dueDate:       null,  // YYYY-MM-DD | null
    ...overrides,
  };
}

/**
 * Generate next three-digit jumper ID dari register yang sudah ada.
 * Format: "001", "002", ... "999".
 * @param {object[]} jumperRegister
 * @returns {string}
 */
export function nextJumperId(jumperRegister = []) {
  const max = jumperRegister.reduce((acc, r) => {
    const n = parseInt(r.jumperId, 10);
    return !isNaN(n) && n > acc ? n : acc;
  }, 0);
  return String(max + 1).padStart(3, "0");
}

/**
 * Migrasi record lama (schema J-001) ke schema baru ("001").
 * Dipanggil saat loadPersistedState menemukan state dengan format lama.
 * @param {object[]} records
 * @returns {object[]}
 */
export function migrateJumperRecords(records = []) {
  const isIsoDate = (v) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

  return records.map((r, i) => {
    // Normalize jumperId
    let jumperId = String(r.jumperId || "").trim();
    // Pattern lama: "J-001" → "001"
    const legacyMatch = jumperId.match(/^J-?(\d+)$/i);
    if (legacyMatch) {
      jumperId = String(parseInt(legacyMatch[1], 10)).padStart(3, "0");
    }
    // Jika belum 3-digit numerik, generate dari posisi
    if (!/^\d{3}$/.test(jumperId)) {
      jumperId = String(i + 1).padStart(3, "0");
    }

    // installedDate: legacy menyimpan week string ("Wk10 2026") → null
    const installedDate = isIsoDate(r.installedDate) ? r.installedDate : null;
    // dueDate: hanya valid jika ISO; week string / unconfirmed → null
    const dueDate =
      isIsoDate(r.dueDate) && r.dueDateStatus !== "unconfirmed"
        ? r.dueDate
        : null;

    return {
      jumperId,
      plc:           r.plc || null,
      areaId:        r.areaId || null,
      category:      r.category || null,
      description:   r.description || null,
      equipmentTag:  r.equipmentTag || null,
      installedDate,
      dueDate,
    };
  });
}
