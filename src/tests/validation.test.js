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
  AUTH_STATUS,
  MOC_STATUS,
  REMOVAL_STATUS,
  DUE_DATE_STATUS,
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
    jumperId: "J-001",
    plc: "PLC-A",
    areaId: AREA_IDS.DRYER_CM,
    category: CATEGORIES.AFI,
    description: "Test jumper description",
    installedWeekOrDate: "W35-2026",
    authorizationStatus: AUTH_STATUS.AUTHORIZED,
    mocStatus: MOC_STATUS.APPROVED_COMPLETE,
    identificationYear: 2026,
    removalStatus: REMOVAL_STATUS.NO,
    dueDateStatus: DUE_DATE_STATUS.CONFIRMED,
    dueDate: "2026-12-31",
    quantity: 1,
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
    expect(result.errors.some((e) => e.includes("Jumper ID"))).toBe(true);
  });

  test("jumperId duplikat menghasilkan error — T-04", () => {
    const existingIds = new Set(["J-001"]);
    const result = validateJumperRecord(validJumperRecord({ jumperId: "J-001" }), existingIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("J-001") && e.includes("unik"))).toBe(true);
  });

  test("plc kosong menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ plc: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("PLC"))).toBe(true);
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

  test("authorizationStatus Pending Confirmation tidak memenuhi syarat tapi valid secara field — BR-09", () => {
    // Status pending adalah nilai VALID untuk field (diterima oleh enum)
    // tetapi tidak dihitung memenuhi BR-04 (dikontrol di selectors.js, bukan di sini)
    const result = validateJumperRecord(
      validJumperRecord({ authorizationStatus: AUTH_STATUS.PENDING_CONFIRMATION })
    );
    expect(result.valid).toBe(true); // field valid — enum diizinkan
  });

  test("authorizationStatus nilai luar enum menghasilkan error", () => {
    const result = validateJumperRecord(
      validJumperRecord({ authorizationStatus: "MaybeAuthorized" })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Authorization Status"))).toBe(true);
  });

  test("mocStatus Pending adalah nilai valid untuk field", () => {
    const result = validateJumperRecord(
      validJumperRecord({ mocStatus: MOC_STATUS.PENDING })
    );
    expect(result.valid).toBe(true);
  });

  test("mocStatus nilai luar enum menghasilkan error", () => {
    const result = validateJumperRecord(
      validJumperRecord({ mocStatus: "Unknown" })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("MOC Status"))).toBe(true);
  });

  test("identificationYear null menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ identificationYear: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Identification Year"))).toBe(true);
  });

  test("removalStatus Yes tanpa removalWeek menghasilkan error", () => {
    const result = validateJumperRecord(
      validJumperRecord({
        removalStatus: REMOVAL_STATUS.YES,
        removalWeek: null,
        removalYear: 2026,
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Removal Week"))).toBe(true);
  });

  test("removalStatus Yes tanpa removalYear menghasilkan error", () => {
    const result = validateJumperRecord(
      validJumperRecord({
        removalStatus: REMOVAL_STATUS.YES,
        removalWeek: "W40",
        removalYear: null,
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Removal Year"))).toBe(true);
  });

  test("removalStatus Yes dengan week dan year valid lulus", () => {
    const result = validateJumperRecord(
      validJumperRecord({
        removalStatus: REMOVAL_STATUS.YES,
        removalWeek: "W40",
        removalYear: 2026,
      })
    );
    expect(result.valid).toBe(true);
  });

  test("removalStatus No tanpa removalWeek/Year valid", () => {
    const result = validateJumperRecord(
      validJumperRecord({
        removalStatus: REMOVAL_STATUS.NO,
        removalWeek: null,
        removalYear: null,
      })
    );
    expect(result.valid).toBe(true);
  });

  test("quantity 0 menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ quantity: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Quantity"))).toBe(true);
  });

  test("quantity 3 valid — T-10 basis", () => {
    const result = validateJumperRecord(validJumperRecord({ quantity: 3 }));
    expect(result.valid).toBe(true);
  });

  test("quantity negatif menghasilkan error", () => {
    const result = validateJumperRecord(validJumperRecord({ quantity: -1 }));
    expect(result.valid).toBe(false);
  });

  test("dueDateStatus confirmed tanpa dueDate menghasilkan error", () => {
    const result = validateJumperRecord(
      validJumperRecord({ dueDateStatus: DUE_DATE_STATUS.CONFIRMED, dueDate: null })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Due Date"))).toBe(true);
  });

  test("dueDateStatus unconfirmed tanpa dueDate valid", () => {
    const result = validateJumperRecord(
      validJumperRecord({ dueDateStatus: DUE_DATE_STATUS.UNCONFIRMED, dueDate: null })
    );
    expect(result.valid).toBe(true);
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
      validJumperRecord({ jumperId: "J-001" }),
      validJumperRecord({ jumperId: "J-002" }),
    ]);
    expect(result.valid).toBe(true);
  });

  test("dua record ID sama menghasilkan error — T-04", () => {
    const result = validateJumperRegister([
      validJumperRecord({ jumperId: "J-001" }),
      validJumperRecord({ jumperId: "J-001" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("J-001") && e.includes("unik"))).toBe(true);
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
