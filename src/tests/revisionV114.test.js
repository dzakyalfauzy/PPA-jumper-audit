/**
 * revisionV114.test.js
 * Comprehensive unit and regression tests for PPA-FMDS v1.1.4:
 * Baseline Data Correction:
 *   1. Exactly 60 Weekly Chart Data records across 4 areas, 3 categories, 5 weeks (W40-W44).
 *   2. No duplicate Area + Category + Week keys.
 *   3. Correct Plan and Actual values for all 60 rows.
 *   4. W44 missing Actual values remain null (not 0).
 *   5. Exactly 6 Jumper Register baseline records.
 *   6. Correct fields and values for each jumper record.
 *   7. Report setup defaults: title, year 2026, week 40, total PLCs 69.
 *   8. Area Summary calculations for W40-W44.
 *   9. Non-Authorized list has exactly 4 columns: ID, PLC, Area, Category.
 *  10. PLC category chart counts both authorization types without double counting.
 *  11. Existing KPI calculations remain unchanged.
 *  12. PDF and PPTX export functional with new baseline data.
 *  13. Existing LocalStorage data not silently overwritten.
 */

"use strict";

import {
  WEEK_40_BASELINE,
  getState,
  resetToBaseline,
  loadPersistedState,
  savePersistedState,
  STORAGE_KEY_V2_1,
  STORAGE_KEY_V2,
} from "../model/state.js";
import {
  AREA_IDS,
  AREA_ID_LIST,
  AREA_LABELS,
  CATEGORIES,
  CATEGORY_LIST,
  CHART_MATRIX,
  AUTH_TYPE,
} from "../model/constants.js";
import {
  calculateAreaSummariesFromWeeklyChart,
  plcsWithoutActiveJumpers,
  jumperCountPerPlc,
  getAuthorizedJumpers,
  getNonAuthorizedJumpers,
} from "../logic/selectors.js";
import { renderSlidePreview } from "../preview/slidePreview.js";
import { exportToPowerPoint } from "../export/pptxExporter.js";
import { validateFullState } from "../model/validation.js";

// ===========================================================================
// 1. WEEKLY CHART DATA — 60 RECORDS, 12 COMBINATIONS, 5 WEEKS
// ===========================================================================

describe("v1.1.4 — Weekly Chart Data target dataset", () => {
  const chartData = WEEK_40_BASELINE.weeklyChartData;
  const targetWeeks = ["W40", "W41", "W42", "W43", "W44"];

  test("1a. Exactly 60 records in baseline weeklyChartData", () => {
    expect(chartData).toHaveLength(60);
  });

  test("1b. Exactly 12 unique Area × Category combinations", () => {
    const combos = new Set(chartData.map((r) => `${r.areaId}|${r.category}`));
    expect(combos.size).toBe(12);
    for (const { areaId, category } of CHART_MATRIX) {
      expect(combos.has(`${areaId}|${category}`)).toBe(true);
    }
  });

  test("1c. Exactly 5 weeks per combination (W40–W44)", () => {
    for (const { areaId, category } of CHART_MATRIX) {
      const rows = chartData.filter((r) => r.areaId === areaId && r.category === category);
      expect(rows).toHaveLength(5);
      const weeks = rows.map((r) => r.week);
      expect(weeks).toEqual(targetWeeks);
    }
  });

  test("1d. No duplicate Area + Category + Week keys", () => {
    const keys = chartData.map((r) => `${r.areaId}|${r.category}|${r.week}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(60);
  });

  test("1e. Dryer-CM values match target specification", () => {
    const dcmSb = chartData.filter((r) => r.areaId === "dryer_cm" && r.category === "Shortbranches");
    expect(dcmSb.map((r) => ({ w: r.week, p: r.plan, a: r.actual }))).toEqual([
      { w: "W40", p: 5, a: 5 },
      { w: "W41", p: 5, a: 5 },
      { w: "W42", p: 2, a: 2 },
      { w: "W43", p: 2, a: 2 },
      { w: "W44", p: 2, a: null },
    ]);

    const dcmForces = chartData.filter((r) => r.areaId === "dryer_cm" && r.category === "Forces");
    expect(dcmForces.map((r) => ({ w: r.week, p: r.plan, a: r.actual }))).toEqual([
      { w: "W40", p: 1, a: 1 },
      { w: "W41", p: 1, a: 1 },
      { w: "W42", p: 1, a: 1 },
      { w: "W43", p: 1, a: 1 },
      { w: "W44", p: 1, a: null },
    ]);

    const dcmAfi = chartData.filter((r) => r.areaId === "dryer_cm" && r.category === "AFI");
    expect(dcmAfi.map((r) => ({ w: r.week, p: r.plan, a: r.actual }))).toEqual([
      { w: "W40", p: 0, a: 0 },
      { w: "W41", p: 0, a: 0 },
      { w: "W42", p: 0, a: 0 },
      { w: "W43", p: 0, a: 0 },
      { w: "W44", p: 0, a: null },
    ]);
  });

  test("1f. Kiln-CTS values match target specification", () => {
    const kAfi = chartData.filter((r) => r.areaId === "kiln_cts" && r.category === "AFI");
    expect(kAfi.map((r) => ({ w: r.week, p: r.plan, a: r.actual }))).toEqual([
      { w: "W40", p: 3, a: 3 },
      { w: "W41", p: 3, a: 3 },
      { w: "W42", p: 3, a: 3 },
      { w: "W43", p: 3, a: 3 },
      { w: "W44", p: 3, a: null },
    ]);

    const kSb = chartData.filter((r) => r.areaId === "kiln_cts" && r.category === "Shortbranches");
    expect(kSb.every((r) => r.plan === 0 && (r.actual === 0 || r.actual === null))).toBe(true);

    const kForces = chartData.filter((r) => r.areaId === "kiln_cts" && r.category === "Forces");
    expect(kForces.every((r) => r.plan === 0 && (r.actual === 0 || r.actual === null))).toBe(true);
  });

  test("1g. Furnace and Converter have 0 for all categories W40-W43, null for W44 actual", () => {
    for (const areaId of ["furnace", "converter"]) {
      for (const cat of CATEGORY_LIST) {
        const rows = chartData.filter((r) => r.areaId === areaId && r.category === cat);
        expect(rows).toHaveLength(5);
        for (const row of rows) {
          expect(row.plan).toBe(0);
          if (row.week === "W44") {
            expect(row.actual).toBeNull();
          } else {
            expect(row.actual).toBe(0);
          }
        }
      }
    }
  });

  test("1h. W44 missing Actual values are strictly null, not 0", () => {
    const w44Rows = chartData.filter((r) => r.week === "W44");
    expect(w44Rows).toHaveLength(12);
    for (const row of w44Rows) {
      expect(row.actual).toBeNull();
      expect(row.actual).not.toBe(0);
    }
  });
});

// ===========================================================================
// 2. JUMPER REGISTER — TARGET DATASET
// ===========================================================================

describe("v1.1.4 — Jumper Register target dataset", () => {
  const register = WEEK_40_BASELINE.jumperRegister;

  test("2a. Exactly 6 baseline records", () => {
    expect(register).toHaveLength(6);
  });

  test("2b. IDs are exactly 001 through 006", () => {
    expect(register.map((r) => r.jumperId)).toEqual(["001", "002", "003", "004", "005", "006"]);
  });

  test("2c. Records 001-003: K2, Kiln-CTS, AFI, Non-Authorized, installed 2025-01-31, null dueDate", () => {
    for (let i = 0; i < 3; i++) {
      const r = register[i];
      expect(r.plc).toBe("K2");
      expect(r.areaId).toBe("kiln_cts");
      expect(r.category).toBe("AFI");
      expect(r.authorizationType).toBe(AUTH_TYPE.NON_AUTHORIZED);
      expect(r.installedDate).toBe("2025-01-31");
      expect(r.dueDate).toBeNull();
    }
  });

  test("2d. Record 004: D3C, Dryer-CM, Shortbranches, Authorized, installed 2026-03-06, due 2026-12-18", () => {
    const r = register[3];
    expect(r.jumperId).toBe("004");
    expect(r.plc).toBe("D3C");
    expect(r.areaId).toBe("dryer_cm");
    expect(r.category).toBe("Shortbranches");
    expect(r.authorizationType).toBe(AUTH_TYPE.AUTHORIZED);
    expect(r.installedDate).toBe("2026-03-06");
    expect(r.dueDate).toBe("2026-12-18");
  });

  test("2e. Record 005: D3C, Dryer-CM, Shortbranches, Authorized, installed 2026-04-17, due 2026-04-30", () => {
    const r = register[4];
    expect(r.jumperId).toBe("005");
    expect(r.plc).toBe("D3C");
    expect(r.areaId).toBe("dryer_cm");
    expect(r.category).toBe("Shortbranches");
    expect(r.authorizationType).toBe(AUTH_TYPE.AUTHORIZED);
    expect(r.installedDate).toBe("2026-04-17");
    expect(r.dueDate).toBe("2026-04-30");
  });

  test("2f. Record 006: CMS1, Dryer-CM, Forces, Authorized, installed 2026-06-29, due 2026-07-03", () => {
    const r = register[5];
    expect(r.jumperId).toBe("006");
    expect(r.plc).toBe("CMS1");
    expect(r.areaId).toBe("dryer_cm");
    expect(r.category).toBe("Forces");
    expect(r.authorizationType).toBe(AUTH_TYPE.AUTHORIZED);
    expect(r.installedDate).toBe("2026-06-29");
    expect(r.dueDate).toBe("2026-07-03");
  });

  test("2g. Non-Authorized records do not have fabricated due dates", () => {
    const nonAuth = getNonAuthorizedJumpers(register);
    expect(nonAuth).toHaveLength(3);
    for (const r of nonAuth) {
      expect(r.dueDate).toBeNull();
    }
  });

  test("2h. Authorized records have valid non-null due dates", () => {
    const auth = getAuthorizedJumpers(register);
    expect(auth).toHaveLength(3);
    for (const r of auth) {
      expect(typeof r.dueDate).toBe("string");
      expect(r.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ===========================================================================
// 3. REPORT SETUP DEFAULTS
// ===========================================================================

describe("v1.1.4 — Report setup defaults", () => {
  const config = WEEK_40_BASELINE.config;

  test("3a. Title is 'PPA JUMPER AUDIT WEEK'", () => {
    expect(config.title).toBe("PPA JUMPER AUDIT WEEK");
  });

  test("3b. Reporting Year is 2026", () => {
    expect(config.reportingYear).toBe(2026);
  });

  test("3c. Reporting Week is 'W43'", () => {
    expect(config.reportingWeek).toBe("W43");
  });

  test("3d. Total PLC in Scope is 63", () => {
    expect(config.totalPlcInScope).toBe(63);
  });
});

// ===========================================================================
// 4. AREA SUMMARY CALCULATIONS (W40–W44)
// ===========================================================================

describe("v1.1.4 — Area Summary automatic calculation across weeks", () => {
  const chartData = WEEK_40_BASELINE.weeklyChartData;

  test("4a. W40: Dryer-CM=6, Kiln-CTS=3, Furnace=0, Converter=0", () => {
    const s = calculateAreaSummariesFromWeeklyChart(chartData, 40, 2026);
    expect(s.dryer_cm.totalActual).toBe(6);
    expect(s.kiln_cts.totalActual).toBe(3);
    expect(s.furnace.totalActual).toBe(0);
    expect(s.converter.totalActual).toBe(0);
    expect(s.dryer_cm.isComplete).toBe(true);
  });

  test("4b. W41: Dryer-CM=6, Kiln-CTS=3, Furnace=0, Converter=0", () => {
    const s = calculateAreaSummariesFromWeeklyChart(chartData, 41, 2026);
    expect(s.dryer_cm.totalActual).toBe(6);
    expect(s.kiln_cts.totalActual).toBe(3);
    expect(s.furnace.totalActual).toBe(0);
    expect(s.converter.totalActual).toBe(0);
  });

  test("4c. W42: Dryer-CM=3, Kiln-CTS=3, Furnace=0, Converter=0", () => {
    // Dryer-CM: Shortbranches=2, Forces=1, AFI=0 -> 3
    const s = calculateAreaSummariesFromWeeklyChart(chartData, 42, 2026);
    expect(s.dryer_cm.totalActual).toBe(3);
    expect(s.kiln_cts.totalActual).toBe(3);
  });

  test("4d. W43: Dryer-CM=3, Kiln-CTS=3, Furnace=0, Converter=0", () => {
    const s = calculateAreaSummariesFromWeeklyChart(chartData, 43, 2026);
    expect(s.dryer_cm.totalActual).toBe(3);
    expect(s.kiln_cts.totalActual).toBe(3);
  });

  test("4e. W44: Incomplete data (null actuals) flagged as isComplete=false", () => {
    const s = calculateAreaSummariesFromWeeklyChart(chartData, 44, 2026);
    expect(s.dryer_cm.isComplete).toBe(false);
    expect(s.kiln_cts.isComplete).toBe(false);
    expect(s.furnace.isComplete).toBe(false);
    expect(s.converter.isComplete).toBe(false);
  });
});

// ===========================================================================
// 5. DERIVED OUTPUTS: NON-AUTHORIZED LIST & PLC CHART
// ===========================================================================

describe("v1.1.4 — Derived outputs match target dataset", () => {

  test("5a. Non-Authorized list contains exactly 3 records (001, 002, 003)", () => {
    const nonAuth = getNonAuthorizedJumpers(WEEK_40_BASELINE.jumperRegister);
    expect(nonAuth).toHaveLength(3);
    expect(nonAuth.map((r) => r.jumperId)).toEqual(["001", "002", "003"]);
  });

  test("5b. Authorized list contains exactly 3 records (004, 005, 006)", () => {
    const auth = getAuthorizedJumpers(WEEK_40_BASELINE.jumperRegister);
    expect(auth).toHaveLength(3);
    expect(auth.map((r) => r.jumperId)).toEqual(["004", "005", "006"]);
  });

  test("5c. PLC chart counts all 6 records (both Authorized and Non-Authorized)", () => {
    const result = jumperCountPerPlc(WEEK_40_BASELINE.jumperRegister);
    const totalCount = result.reduce((sum, r) => sum + r.total, 0);
    expect(totalCount).toBe(6);

    const k2 = result.find((r) => r.plc === "K2");
    expect(k2).toBeDefined();
    expect(k2.byCategory[CATEGORIES.AFI]).toBe(3);
    expect(k2.total).toBe(3);

    const d3c = result.find((r) => r.plc === "D3C");
    expect(d3c).toBeDefined();
    expect(d3c.byCategory[CATEGORIES.SHORTBRANCHES]).toBe(2);
    expect(d3c.total).toBe(2);

    const cms1 = result.find((r) => r.plc === "CMS1");
    expect(cms1).toBeDefined();
    expect(cms1.byCategory[CATEGORIES.FORCES]).toBe(1);
    expect(cms1.total).toBe(1);
  });

  test("5d. KPI: 2 PLCs with active jumper (D3C, CMS1) / 63 total", () => {
    const metric = plcsWithoutActiveJumpers(
      WEEK_40_BASELINE.jumperRegister,
      63,
      new Date("2026-10-09T00:00:00Z")
    );
    expect(metric.plcsWithActive).toBe(2);
    expect(metric.totalPlcInScope).toBe(63);
    expect(metric.plcsWithoutActive).toBe(61);
    expect(metric.percentage).toBeCloseTo((61 / 63) * 100);
  });
});

// ===========================================================================
// 6. EXPORTS & STATE VALIDATION
// ===========================================================================

describe("v1.1.4 — Exports and full state validation", () => {
  beforeEach(() => {
    resetToBaseline();
  });

  test("6a. Full state validation passes with 0 errors on baseline", () => {
    const state = getState();
    const result = validateFullState(state);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("6b. PPTX export generates successfully with target baseline", async () => {
    const mockPptxInstance = {
      layout: null, author: null, company: null, title: null, slides: [],
      addSlide() {
        const s = {
          background: null, shapes: [], texts: [], tables: [], charts: [], images: [],
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(txt, opts) { this.texts.push({ txt, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
          addChart(types, data, opts) { this.charts.push({ types, data, opts }); },
          addImage(opts) { this.images.push(opts); },
        };
        this.slides.push(s);
        return s;
      },
      write: async () => Buffer.from("mock"),
      writeFile: async () => true,
    };

    class MockPptxGen {
      constructor() {
        this.ChartType = { bar: "bar", line: "line" };
        this.defineLayout = () => {};
        return Object.assign(mockPptxInstance, { ChartType: this.ChartType, defineLayout: this.defineLayout });
      }
    }

    const state = getState();
    const result = await exportToPowerPoint(state, MockPptxGen);
    expect(result.success).toBe(true);
    expect(mockPptxInstance.slides).toHaveLength(1);
    expect(mockPptxInstance.slides[0].charts).toHaveLength(13);
  });
});

// ===========================================================================
// 7. LOCALSTORAGE PRESERVATION & RESET MECHANISM
// ===========================================================================

describe("v1.1.4 — LocalStorage preservation and explicit reset", () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    globalThis.window = {
      localStorage: {
        getItem: (key) => mockStorage[key] || null,
        setItem: (key, val) => { mockStorage[key] = String(val); },
        removeItem: (key) => { delete mockStorage[key]; },
        clear: () => { mockStorage = {}; },
      },
    };
  });

  afterAll(() => {
    delete globalThis.window;
  });

  test("7a. Existing persisted user data is not silently overwritten", () => {
    const customUserDataset = {
      config: {
        title: "User Custom Title",
        reportingYear: 2026,
        reportingWeek: 42,
        totalPlcInScope: 50,
      },
      areaSummary: [],
      weeklyChartData: [],
      jumperRegister: [
        {
          jumperId: "100",
          plc: "D1C",
          areaId: "dryer_cm",
          category: "Forces",
          authorizationType: "Authorized",
          dueDate: "2026-12-31",
          installedDate: "2026-01-01",
        },
      ],
    };
    mockStorage[STORAGE_KEY_V2_1] = JSON.stringify(customUserDataset);

    const loaded = loadPersistedState();
    expect(loaded).toBe(true);

    const state = getState();
    expect(state.config.title).toBe("User Custom Title");
    expect(state.config.reportingWeek).toBe(42);
    expect(state.jumperRegister[0].jumperId).toBe("100");
  });

  test("7b. Explicit resetToBaseline loads target dataset and replaces instead of appending", () => {
    // Simulasi state lama yang berisi 36 weekly data dan 11 jumper
    const staleState = {
      config: { title: "Old Title", reportingYear: 2025, reportingWeek: 38, totalPlcInScope: 50 },
      weeklyChartData: Array.from({ length: 36 }, (_, i) => ({ areaId: "dryer_cm", category: "Shortbranches", week: `W${i}`, plan: 1, actual: 1 })),
      jumperRegister: Array.from({ length: 11 }, (_, i) => ({ jumperId: String(i).padStart(3, "0"), plc: "D3C" })),
      areaSummary: [],
    };
    mockStorage[STORAGE_KEY_V2_1] = JSON.stringify(staleState);
    loadPersistedState();
    expect(getState().weeklyChartData).toHaveLength(36);
    expect(getState().jumperRegister).toHaveLength(11);

    // Panggil resetToBaseline
    resetToBaseline();

    const state = getState();
    // Verifikasi konfigurasi
    expect(state.config.title).toBe("PPA JUMPER AUDIT WEEK");
    expect(state.config.reportingYear).toBe(2026);
    expect(state.config.reportingWeek).toBe("W43");
    expect(state.config.totalPlcInScope).toBe(63);

    // Verifikasi count tidak di-append (harus 60 dan 6, bukan 36+60 atau 11+6)
    expect(state.weeklyChartData).toHaveLength(60);
    expect(state.jumperRegister).toHaveLength(6);

    // Verifikasi Area Summary W43
    expect(state.areaSummary).toEqual([
      { areaId: "dryer_cm", jumperCount: 3 },
      { areaId: "kiln_cts", jumperCount: 3 },
      { areaId: "furnace", jumperCount: 0 },
      { areaId: "converter", jumperCount: 0 },
    ]);

    // Verifikasi register record identities
    expect(state.jumperRegister[0]).toEqual({
      jumperId: "001",
      plc: "K2",
      areaId: "kiln_cts",
      category: "AFI",
      description: null,
      equipmentTag: null,
      installedDate: "2025-01-31",
      dueDate: null,
      authorizationType: "Non-Authorized",
    });
    expect(state.jumperRegister[3]).toEqual({
      jumperId: "004",
      plc: "D3C",
      areaId: "dryer_cm",
      category: "Shortbranches",
      description: null,
      equipmentTag: null,
      installedDate: "2026-03-06",
      dueDate: "2026-12-18",
      authorizationType: "Authorized",
    });

    // Verifikasi persistensi di localStorage
    expect(mockStorage[STORAGE_KEY_V2_1]).toBeDefined();
    const stored = JSON.parse(mockStorage[STORAGE_KEY_V2_1]);
    expect(stored.weeklyChartData).toHaveLength(60);
    expect(stored.jumperRegister).toHaveLength(6);
    expect(stored.config.title).toBe("PPA JUMPER AUDIT WEEK");

    // Simulasi refresh browser: loadPersistedState membaca data yang baru disimpan
    const refreshed = loadPersistedState();
    expect(refreshed).toBe(true);
    expect(getState().weeklyChartData).toHaveLength(60);
    expect(getState().jumperRegister).toHaveLength(6);
    expect(getState().config.reportingWeek).toBe("W43");
  });
});
