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
 *   - Status pending tidak memenuhi syarat (T-08, BR-09)
 *   - Removal=Yes tanpa week/year menghasilkan error
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
    weekLabels: ["W36", "W37", "W38", "W39", "W40"],
    totalPlcInScope: 10,
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
    jumperId:      "001",
    plc:           "D3C", // valid untuk dryer_cm sesuai PLC_BY_AREA
    areaId:        AREA_IDS.DRYER_CM,
    category:      CATEGORIES.AFI,
    description:   "Test jumper description",
    equipmentTag:  null,
    installedDate: "2026-01-15",
    dueDate:       "2026-12-31",
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

  test("plantArea kosong menghasilkan error", () => {
    const result = validateConfig(validConfig({ plantArea: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Plant Area"))).toBe(true);
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

  test("weekLabels kosong array menghasilkan error", () => {
    const result = validateConfig(validConfig({ weekLabels: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Week Labels"))).toBe(true);
  });

  test("weekLabels duplikat menghasilkan error", () => {
    const result = validateConfig(validConfig({ weekLabels: ["W40", "W40", "W41"] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duplikat"))).toBe(true);
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
  const weekLabels = ["W36", "W37", "W38", "W39", "W40"];

  test("baris valid lulus", () => {
    const result = validateWeeklyChartRow(validWeeklyRow(), weekLabels);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("plan=0, actual=0 valid — T-01", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ plan: 0, actual: 0 }), weekLabels);
    expect(result.valid).toBe(true);
  });

  test("plan null valid dan menghasilkan warning, bukan error — T-02", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ plan: null }), weekLabels);
    expect(result.valid).toBe(true);   // null bukan error, hanya warning
    expect(result.warnings.some((w) => w.includes("Plan"))).toBe(true);
  });

  test("actual negatif menghasilkan error — T-03", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ actual: -1 }), weekLabels);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Actual"))).toBe(true);
  });

  test("plan negatif menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ plan: -5 }), weekLabels);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Plan"))).toBe(true);
  });

  test("week tidak ada dalam weekLabels menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ week: "W99" }), weekLabels);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("W99"))).toBe(true);
  });

  test("areaId tidak valid menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ areaId: "unknown" }), weekLabels);
    expect(result.valid).toBe(false);
  });

  test("category tidak valid menghasilkan error", () => {
    const result = validateWeeklyChartRow(validWeeklyRow({ category: "BadCat" }), weekLabels);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TEST: validateWeeklyChartData (duplikasi key)
// ---------------------------------------------------------------------------

describe("validateWeeklyChartData", () => {
  const weekLabels = ["W36", "W37", "W38", "W39", "W40"];

  test("dua baris key berbeda valid", () => {
    const data = [
      validWeeklyRow({ week: "W36" }),
      validWeeklyRow({ week: "W37" }),
    ];
    const result = validateWeeklyChartData(data, weekLabels);
    expect(result.valid).toBe(true);
  });

  test("dua baris key sama menghasilkan error duplikat", () => {
    const data = [
      validWeeklyRow({ week: "W40" }),
      validWeeklyRow({ week: "W40" }),
    ];
    const result = validateWeeklyChartData(data, weekLabels);
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

  test("description kosong menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ description: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Description"))).toBe(true);
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

  test("dueDate null valid (opsional)", () => {
    const result = validateJumperRecord(validJumperRecord({ dueDate: null }));
    expect(result.valid).toBe(true);
    // Warning: status tidak dapat ditentukan
    expect(result.warnings.some((w) => w.includes("Due Date kosong"))).toBe(true);
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

  test("state lengkap valid menghasilkan warning OQ-01 (identificationYearFilter null)", () => {
    const state = createInitialState();
    state.config = validConfig();
    state.areaSummary = validAreaSummary();
    const result = validateFullState(state);
    // Harus valid (tidak ada error field) tapi ada warning OQ-01
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("OQ-01"))).toBe(true);
  });
});
