/**
 * validation.test.js
 * Unit test untuk semua fungsi validasi di src/model/validation.js
 *
 * Menguji:
 *   - validateConfig
 *   - validateAreaSummary
 *   - validateWeeklyChartRow / validateWeeklyChartData
 *   - validateJumperRecord / validateJumperRegister
 *   - validateFullState
 *
 * Prinsip test:
 *   - Nilai null != 0 (T-02, BR-02)
 *   - Nilai negatif ditolak (T-03)
 *   - ID duplikat ditolak (T-04, BR-11)
 *   - Week dropdown bebas W1–W52 (config.weekLabels dihapus)
 *   - Status Due Date: Expired/Expiring Soon → warning, bukan error
 *   - PLC wajib termasuk dalam PLC_BY_AREA[areaId] (mapping terpusat)
 */

"use strict";

import {
  validateConfig,
  validateAreaSummary,
  validateWeeklyChartRow,
  validateWeeklyChartData,
  validateJumperRecord,
  validateJumperRegister,
  validateFullState,
} from "../model/validation.js";

import {
  AREA_IDS,
  AREA_ID_LIST,
  CATEGORIES,
  AUTH_TYPE,
} from "../model/constants.js";

import { createInitialState, createJumperRecord } from "../model/state.js";

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

function validConfig(overrides = {}) {
  return {
    title: "PPA Jumper Audit Week-40",
    plantArea: "PP Area",
    reportingYear: 2026,
    reportingWeek: 40,
    totalPlcInScope: 10,
    totalRemoveJumper: 0,
    ...overrides,
  };
}

function validAreaSummary() {
  return AREA_ID_LIST.map((areaId, i) => ({ areaId, jumperCount: i }));
}

function validWeeklyRow(overrides = {}) {
  return {
    areaId: AREA_IDS.DRYER_CM,
    category: CATEGORIES.SHORTBRANCHES,
    week: "W40",
    plan: 5,
    actual: 4,
    ...overrides,
  };
}

function validJumperRecord(overrides = {}) {
  return createJumperRecord({
    jumperId:          "001",
    plc:               "D3C", // valid untuk dryer_cm sesuai PLC_BY_AREA
    areaId:            AREA_IDS.DRYER_CM,
    category:          CATEGORIES.AFI,
    authorizationType: AUTH_TYPE.AUTHORIZED,
    description:       "Test jumper description",
    equipmentTag:      null,
    installedDate:     "2026-01-15",
    dueDate:           "2026-12-31",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// TEST: validateConfig
// ---------------------------------------------------------------------------

describe("validateConfig", () => {
  test("valid config lulus tanpa error", () => {
    const result = validateConfig(validConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("title kosong menghasilkan error", () => {
    const result = validateConfig(validConfig({ title: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Report Title"))).toBe(true);
  });

  test("title null menghasilkan error", () => {
    const result = validateConfig(validConfig({ title: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Report Title"))).toBe(true);
  });

  test("plantArea kosong diabaikan (sudah dihapus dari Report Setup)", () => {
    const result = validateConfig(validConfig({ plantArea: "" }));
    expect(result.valid).toBe(true);
  });

  test("reportingYear null menghasilkan error", () => {
    const result = validateConfig(validConfig({ reportingYear: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Reporting Year"))).toBe(true);
  });

  test("reportingYear tidak valid menghasilkan error", () => {
    const result = validateConfig(validConfig({ reportingYear: 1800 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Reporting Year"))).toBe(true);
  });

  test("reportingWeek di luar rentang menghasilkan error", () => {
    const result = validateConfig(validConfig({ reportingWeek: 54 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Reporting Week"))).toBe(true);
  });

  test("weekLabels (field lama) diabaikan — tidak divalidasi lagi", () => {
    // config.weekLabels dihapus dari schema; field legacy tidak menyebabkan error
    const result = validateConfig(validConfig({ weekLabels: [] }));
    expect(result.valid).toBe(true);
  });

  test("totalPlcInScope = 0 menghasilkan error", () => {
    const result = validateConfig(validConfig({ totalPlcInScope: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Total PLC"))).toBe(true);
  });

  test("totalPlcInScope negatif menghasilkan error", () => {
    const result = validateConfig(validConfig({ totalPlcInScope: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Total PLC"))).toBe(true);
  });

  test("totalPlcInScope null menghasilkan error", () => {
    const result = validateConfig(validConfig({ totalPlcInScope: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Total PLC"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEST: validateAreaSummary
// ---------------------------------------------------------------------------

describe("validateAreaSummary", () => {
  test("area summary valid lulus", () => {
    const result = validateAreaSummary(validAreaSummary());
    expect(result.valid).toBe(true);
  });

  test("jumperCount = 0 valid (nol eksplisit diterima)", () => {
    const summary = validAreaSummary();
    summary[0].jumperCount = 0;
    const result = validateAreaSummary(summary);
    expect(result.valid).toBe(true);
  });

  test("jumperCount null menghasilkan error (null != 0)", () => {
    const summary = validAreaSummary();
    summary[0].jumperCount = null;
    const result = validateAreaSummary(summary);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Jumper Count"))).toBe(true);
  });

  test("jumperCount negatif menghasilkan error", () => {
    const summary = validAreaSummary();
    summary[1].jumperCount = -1;
    const result = validateAreaSummary(summary);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Jumper Count"))).toBe(true);
  });

  test("areaId tidak valid menghasilkan error", () => {
    const summary = validAreaSummary();
    summary[0].areaId = "invalid_area";
    const result = validateAreaSummary(summary);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("areaId tidak valid"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEST: validateWeeklyChartRow
// ---------------------------------------------------------------------------

describe("validateWeeklyChartRow", () => {

  test("baris valid lulus (week dropdown bebas W1–W52)", () => {
    const result = validateWeeklyChartRow(validWeeklyRow());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("plan=0, actual=0 valid — T-01", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ plan: 0, actual: 0 }));
    expect(result.valid).toBe(true);
  });

  test("plan null valid dan menghasilkan warning, bukan error — T-02", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ plan: null }));
    expect(result.valid).toBe(true);   // null bukan error, hanya warning
    expect(result.warnings.some((w) => w.includes("Plan"))).toBe(true);
  });

  test("actual negatif menghasilkan error — T-03", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ actual: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Actual"))).toBe(true);
  });

  test("plan negatif menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ plan: -5 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Plan"))).toBe(true);
  });

  test("week di luar rentang W1–W52 (W99) menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ week: "W99" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("W99"))).toBe(true);
  });

  test("week W0 menghasilkan error (di bawah W1)", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ week: "W0" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("W0"))).toBe(true);
  });

  test("week format bebas (W1, W10, W52) valid — tanpa config.weekLabels", () => {
    for (const week of ["W1", "W10", "W52", "40", "wk7"]) {
      const result = validateWeeklyChartRow(validWeeklyRow({ week }));
      expect(result.errors).toHaveLength(0);
    }
  });

  test("week format tidak dikenal (abc) menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ week: "abc" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("abc"))).toBe(true);
  });

  test("areaId tidak valid menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ areaId: "unknown" }));
    expect(result.valid).toBe(false);
  });

  test("category tidak valid menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ category: "BadCat" }));
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TEST: validateWeeklyChartData (duplikasi key)
// ---------------------------------------------------------------------------

describe("validateWeeklyChartData", () => {

  test("dua baris key berbeda valid", () => {
    const data = [
      validWeeklyRow({ week: "W36" }),
      validWeeklyRow({ week: "W37" }),
    ];
    const result = validateWeeklyChartData(data);
    expect(result.valid).toBe(true);
  });

  test("dua baris key sama menghasilkan error duplikat", () => {
    const data = [
      validWeeklyRow({ week: "W40" }),
      validWeeklyRow({ week: "W40" }),
    ];
    const result = validateWeeklyChartData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duplikat"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEST: validateJumperRecord
// ---------------------------------------------------------------------------

describe("validateJumperRecord", () => {
  test("record valid lulus", () => {
    const result = validateJumperRecord(validJumperRecord());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("jumperId kosong menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ jumperId: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("ID"))).toBe(true);
  });

  test("jumperId non-3-digit numerik menghasilkan error — format ID baru", () => {
    const result = validateJumperRecord(validJumperRecord({ jumperId: "J-001" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("3 digit"))).toBe(true);
  });

  test("jumperId duplikat menghasilkan error — T-04", () => {
    const existingIds = new Set(["001"]);
    const result = validateJumperRecord(validJumperRecord({ jumperId: "001" }), existingIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("001") && e.includes("unik"))).toBe(true);
  });

  test("plc kosong menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ plc: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("PLC"))).toBe(true);
  });

  test("plc tidak terdaftar pada area menghasilkan error — mapping terpusat", () => {
    const result = validateJumperRecord(
      validJumperRecord({ plc: "NONEXISTENT-PLC" })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("tidak terdaftar"))).toBe(true);
  });

  test("plc valid untuk area lain ditolak jika bukan milik area record", () => {
    // C2 adalah PLC converter, bukan dryer_cm
    const result = validateJumperRecord(validJumperRecord({ plc: "C2" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("C2"))).toBe(true);
  });

  test("areaId tidak valid menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ areaId: "wrong_area" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Area"))).toBe(true);
  });

  test("category tidak valid menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ category: "BadCat" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Category"))).toBe(true);
  });

  test("description kosong menghasilkan warning (bukan error)", () => {
    const result = validateJumperRecord(validJumperRecord({ description: "" }));
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Description"))).toBe(true);
  });

  test("authorizationType null atau kosong menghasilkan error", () => {
    const resNull = validateJumperRecord(validJumperRecord({ authorizationType: null }));
    expect(resNull.valid).toBe(false);
    expect(resNull.errors.some((e) => e.includes("Authorization Type"))).toBe(true);

    const resEmpty = validateJumperRecord(validJumperRecord({ authorizationType: "" }));
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.errors.some((e) => e.includes("Authorization Type"))).toBe(true);
  });

  test("authorizationType tidak valid menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ authorizationType: "InvalidType" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Authorization Type tidak valid"))).toBe(true);
  });

  test("authorizationType Unclassified ditolak (menghasilkan error)", () => {
    const result = validateJumperRecord(validJumperRecord({ authorizationType: "Unclassified" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Authorization Type tidak valid"))).toBe(true);
  });

  test("authorizationType Authorized valid tanpa warning otorisasi", () => {
    const result = validateJumperRecord(validJumperRecord({ authorizationType: AUTH_TYPE.AUTHORIZED }));
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Authorization Type"))).toBe(false);
  });

  test("authorizationType Non-Authorized valid tanpa warning otorisasi", () => {
    const result = validateJumperRecord(validJumperRecord({ authorizationType: AUTH_TYPE.NON_AUTHORIZED }));
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Authorization Type"))).toBe(false);
  });

  test("installedDate null menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ installedDate: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Installed Date"))).toBe(true);
  });

  test("installedDate format salah menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ installedDate: "15/01/2026" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Installed Date"))).toBe(true);
  });

  test("installedDate tidak valid kalender (2026-02-31) menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ installedDate: "2026-02-31" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Installed Date"))).toBe(true);
  });

  test("1. Authorized + valid Due Date: accepted", () => {
    const result = validateJumperRecord(validJumperRecord({
      authorizationType: AUTH_TYPE.AUTHORIZED,
      dueDate: "2026-12-31"
    }));
    expect(result.valid).toBe(true);
  });

  test("2. Authorized + missing Due Date: rejected", () => {
    const result = validateJumperRecord(validJumperRecord({
      authorizationType: AUTH_TYPE.AUTHORIZED,
      dueDate: null
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Due Date wajib diisi untuk Authorized"))).toBe(true);
  });

  test("3. Non-Authorized + valid Due Date: accepted", () => {
    const result = validateJumperRecord(validJumperRecord({
      authorizationType: AUTH_TYPE.NON_AUTHORIZED,
      dueDate: "2026-12-31"
    }));
    expect(result.valid).toBe(true);
  });

  test("4. Non-Authorized + missing Due Date: accepted", () => {
    const result = validateJumperRecord(validJumperRecord({
      authorizationType: AUTH_TYPE.NON_AUTHORIZED,
      dueDate: null
    }));
    expect(result.valid).toBe(true);
    // Tidak menghasilkan error dan tidak menghasilkan warning due date kosong
    expect(result.errors).toHaveLength(0);
  });

  test("dueDate format salah menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ dueDate: "31-12-2026" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Due Date"))).toBe(true);
  });

  test("dueDate sebelum installedDate menghasilkan warning, bukan error", () => {
    const result = validateJumperRecord(
      validJumperRecord({ installedDate: "2026-06-01", dueDate: "2026-05-01" })
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("lebih awal"))).toBe(true);
  });

  test("dueDate lewat menghasilkan warning Expired", () => {
    const result = validateJumperRecord(
      validJumperRecord({ dueDate: "2000-01-01" })
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Expired"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEST: validateJumperRegister (cek duplikasi ID di level array)
// ---------------------------------------------------------------------------

describe("validateJumperRegister", () => {
  test("register kosong valid", () => {
    const result = validateJumperRegister([]);
    expect(result.valid).toBe(true);
  });

  test("dua record ID berbeda valid", () => {
    const result = validateJumperRegister([
      validJumperRecord({ jumperId: "001" }),
      validJumperRecord({ jumperId: "002" }),
    ]);
    expect(result.valid).toBe(true);
  });

  test("dua record ID sama menghasilkan error — T-04", () => {
    const result = validateJumperRegister([
      validJumperRecord({ jumperId: "001" }),
      validJumperRecord({ jumperId: "001" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("001") && e.includes("unik"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEST: validateFullState
// ---------------------------------------------------------------------------

describe("validateFullState", () => {
  test("state kosong menghasilkan error (field wajib belum diisi)", () => {
    const state = createInitialState();
    const result = validateFullState(state);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("state lengkap valid tanpa warning OQ-01 (identificationYearFilter dihapus)", () => {
    const state = createInitialState();
    state.config = validConfig();
    state.areaSummary = validAreaSummary();
    const result = validateFullState(state);
    expect(result.valid).toBe(true);
    // OQ-01 (identificationYearFilter) sudah tidak ada — tidak boleh muncul lagi
    expect(result.warnings.some((w) => w.includes("OQ-01"))).toBe(false);
  });

  test("state dengan jumper register valid → valid true", () => {
    const state = createInitialState();
    state.config = validConfig();
    state.areaSummary = validAreaSummary();
    state.jumperRegister = [
      validJumperRecord({ jumperId: "001", authorizationType: AUTH_TYPE.NON_AUTHORIZED, dueDate: null }),
      validJumperRecord({ jumperId: "002", authorizationType: AUTH_TYPE.AUTHORIZED, dueDate: "2026-12-31" }),
    ];
    const result = validateFullState(state);
    expect(result.valid).toBe(true);
  });
});
