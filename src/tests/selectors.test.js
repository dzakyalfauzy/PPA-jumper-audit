/**
 * selectors.test.js
 * Unit test untuk src/logic/selectors.js dan src/logic/chartData.js (model revisi)
 *
 * Fungsi yang diuji:
 *   - plcsWithoutActiveJumpers — metric terbalik (PLC tanpa jumper aktif)
 *   - jumperCountPerPlc — agregasi per PLC × kategori (jumper aktif saja)
 *   - areaSummaryDiscrepancy — warning only (BR-12)
 *   - activeJumperQuantityByArea — jumlah jumper aktif per area
 *   - calculateAreaSummariesFromWeeklyChart — Task C
 *   - getChartSeriesForCell / getAllChartSeries / checkChartDataCompleteness
 *
 * Fungsi yang DIHAPUS (field lama tidak ada lagi) dan TIDAK diuji:
 *   - remainingJumperList, authorizedMocCount, removedJumperCount, remainingPlcRatio
 */

"use strict";

import {
  plcsWithoutActiveJumpers,
  jumperCountPerPlc,
  areaSummaryDiscrepancy,
  activeJumperQuantityByArea,
  calculateAreaSummariesFromWeeklyChart,
  getAuthorizedJumpers,
  getNonAuthorizedJumpers,
} from "../logic/selectors.js";

import {
  getChartSeriesForCell,
  getAllChartSeries,
  getChartKey,
  checkChartDataCompleteness,
} from "../logic/chartData.js";

import {
  AREA_IDS,
  AREA_ID_LIST,
  CATEGORIES,
  CHART_MATRIX,
  AUTH_TYPE,
} from "../model/constants.js";

import { createJumperRecord, WEEK_40_BASELINE } from "../model/state.js";

// Today deterministik untuk test yang menerima injection `today`
const TODAY = new Date(2026, 5, 15); // 15 Juni 2026

// ---------------------------------------------------------------------------
// HELPER FACTORIES
// ---------------------------------------------------------------------------

/**
 * Record schema revisi:
 *   jumperId, plc, areaId, category, description, equipmentTag,
 *   installedDate, dueDate
 * dueDate default = jauh di masa depan → status Active relatif TODAY.
 */
function makeRecord(overrides = {}) {
  return createJumperRecord({
    jumperId:      "001",
    plc:           "PLC-A",
    areaId:        AREA_IDS.DRYER_CM,
    category:      CATEGORIES.AFI,
    description:   "Test jumper",
    equipmentTag:  null,
    installedDate: "2026-01-15",
    dueDate:       "2026-12-31", // Active terhadap TODAY (Juni 2026)
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// TEST: plcsWithoutActiveJumpers — METRIC TERBALIK
// ---------------------------------------------------------------------------

describe("plcsWithoutActiveJumpers — PLC tanpa jumper aktif (metric terbalik)", () => {

  test("totalPlcInScope = null mengembalikan ok:false, percentage null", () => {
    const result = plcsWithoutActiveJumpers([makeRecord()], null, TODAY);
    expect(result.ok).toBe(false);
    expect(result.percentage).toBeNull();
  });

  test("totalPlcInScope = 0 mengembalikan ok:false", () => {
    const result = plcsWithoutActiveJumpers([makeRecord()], 0, TODAY);
    expect(result.ok).toBe(false);
    expect(result.percentage).toBeNull();
  });

  test("register kosong — semua PLC tanpa jumper aktif (100%)", () => {
    const result = plcsWithoutActiveJumpers([], 10, TODAY);
    expect(result.ok).toBe(true);
    expect(result.plcsWithActive).toBe(0);
    expect(result.plcsWithoutActive).toBe(10);
    expect(result.percentage).toBeCloseTo(100);
  });

  test("PLC dengan satu jumper — pembilang 1, sisa 9 dari 10 = 90%", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2026-12-31" }),
    ];
    const result = plcsWithoutActiveJumpers(records, 10, TODAY);
    expect(result.ok).toBe(true);
    expect(result.plcsWithActive).toBe(1);
    expect(result.plcsWithoutActive).toBe(9);
    expect(result.percentage).toBeCloseTo(90);
    expect(result.activePlcList).toEqual(["PLC-A"]);
  });

  test("2 PLC aktif dari 10 → 8 tanpa jumper aktif = 80%", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A" }),
      makeRecord({ jumperId: "002", plc: "PLC-B" }),
      makeRecord({ jumperId: "003", plc: "PLC-A" }), // duplikat PLC-A
    ];
    const result = plcsWithoutActiveJumpers(records, 10, TODAY);
    expect(result.ok).toBe(true);
    expect(result.plcsWithActive).toBe(2);
    expect(result.plcsWithoutActive).toBe(8);
    expect(result.percentage).toBeCloseTo(80);
  });

  test("Expired TETAP dihitung sebagai aktif", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2020-01-01" }),
    ];
    const result = plcsWithoutActiveJumpers(records, 10, TODAY);
    expect(result.plcsWithActive).toBe(1);
    expect(result.plcsWithoutActive).toBe(9);
    expect(result.percentage).toBeCloseTo(90);
  });

  test("Expiring Soon (≤ 7 hari) dihitung sebagai aktif", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2026-06-20" }), // +5 hari
    ];
    const result = plcsWithoutActiveJumpers(records, 10, TODAY);
    expect(result.plcsWithActive).toBe(1);
    expect(result.plcsWithoutActive).toBe(9);
    expect(result.percentage).toBeCloseTo(90);
  });

  test("record tanpa Due Date TIDAK dihitung sebagai aktif", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: null }),
    ];
    const result = plcsWithoutActiveJumpers(records, 10, TODAY);
    expect(result.plcsWithActive).toBe(0);
    expect(result.plcsWithoutActive).toBe(10);
    expect(result.percentage).toBeCloseTo(100);
  });

  test("semua status tercampur — Active, Expiring Soon, dan Expired dihitung sebagai aktif, Due Date kosong tidak", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-ACTIVE",  dueDate: "2026-12-31" }), // Active
      makeRecord({ jumperId: "002", plc: "PLC-SOON",    dueDate: "2026-06-16" }), // Expiring Soon (+1)
      makeRecord({ jumperId: "003", plc: "PLC-EXPIRED", dueDate: "2020-01-01" }), // Expired
      makeRecord({ jumperId: "004", plc: "PLC-NODATE",  dueDate: null }),          // no date
    ];
    const result = plcsWithoutActiveJumpers(records, 10, TODAY);
    expect(result.plcsWithActive).toBe(3);
    expect(result.plcsWithoutActive).toBe(7);
    expect(result.percentage).toBeCloseTo(70);
    expect(result.activePlcList).toEqual(["PLC-ACTIVE", "PLC-EXPIRED", "PLC-SOON"]);
  });

  test("PLC dengan beberapa jumper (termasuk expired) hanya dihitung satu kali", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2026-12-31" }), // Active
      makeRecord({ jumperId: "002", plc: "PLC-A", dueDate: "2020-01-01" }), // Expired
      makeRecord({ jumperId: "003", plc: "PLC-A", dueDate: "2026-06-18" }), // Expiring Soon
    ];
    const result = plcsWithoutActiveJumpers(records, 10, TODAY);
    expect(result.plcsWithActive).toBe(1);
    expect(result.plcsWithoutActive).toBe(9);
    expect(result.percentage).toBeCloseTo(90);
    expect(result.activePlcList).toEqual(["PLC-A"]);
  });

  test("perhitungan persentase ketika jumlah PLC negatif, string, atau NaN menghasilkan ok:false", () => {
    expect(plcsWithoutActiveJumpers([makeRecord()], -5, TODAY).ok).toBe(false);
    expect(plcsWithoutActiveJumpers([makeRecord()], "invalid", TODAY).ok).toBe(false);
    expect(plcsWithoutActiveJumpers([makeRecord()], NaN, TODAY).ok).toBe(false);
  });

  test("known PLCs melebihi totalPlcInScope → warning disertakan", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A" }),
      makeRecord({ jumperId: "002", plc: "PLC-B" }),
      makeRecord({ jumperId: "003", plc: "PLC-C" }),
    ];
    const result = plcsWithoutActiveJumpers(records, 2, TODAY);
    expect(result.warning).toMatch(/melebihi/);
    expect(result.plcsWithoutActive).toBe(0); // Math.max(0, 2-3)
  });

  test("fungsi tidak mengubah array sumber", () => {
    const register = [makeRecord({ plc: "PLC-Z" })];
    plcsWithoutActiveJumpers(register, 10, TODAY);
    expect(register[0].plc).toBe("PLC-Z");
    expect(register).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// TEST: jumperCountPerPlc — hanya jumper aktif (BR-07)
// ---------------------------------------------------------------------------

describe("jumperCountPerPlc — agregasi per PLC × kategori (jumper aktif)", () => {

  test("register kosong mengembalikan array kosong", () => {
    expect(jumperCountPerPlc([], TODAY)).toHaveLength(0);
  });

  test("record expired tetap dihitung sebagai aktif sesuai aturan", () => {
    const active  = makeRecord({ jumperId: "001", plc: "PLC-A", category: CATEGORIES.AFI, dueDate: "2026-12-31" });
    const expired = makeRecord({ jumperId: "002", plc: "PLC-A", category: CATEGORIES.AFI, dueDate: "2020-01-01" });
    const result = jumperCountPerPlc([active, expired], TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(2);
    expect(result[0].total).toBe(2);
  });

  test("record tanpa Due Date dikecualikan", () => {
    const noDate = makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: null });
    const result = jumperCountPerPlc([noDate], TODAY);
    expect(result).toHaveLength(0);
  });

  test("satu PLC dengan beberapa kategori — hitungan per kategori benar", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", category: CATEGORIES.AFI }),
      makeRecord({ jumperId: "002", plc: "PLC-A", category: CATEGORIES.FORCES }),
      makeRecord({ jumperId: "003", plc: "PLC-A", category: CATEGORIES.SHORTBRANCHES }),
    ];
    const result = jumperCountPerPlc(records, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].plc).toBe("PLC-A");
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(1);
    expect(result[0].byCategory[CATEGORIES.FORCES]).toBe(1);
    expect(result[0].byCategory[CATEGORIES.SHORTBRANCHES]).toBe(1);
    expect(result[0].total).toBe(3);
  });

  test("kategori yang tidak memiliki data mengembalikan 0", () => {
    const records = [makeRecord({ plc: "PLC-A", category: CATEGORIES.AFI })];
    const result = jumperCountPerPlc(records, TODAY);
    expect(result[0].byCategory[CATEGORIES.FORCES]).toBe(0);
    expect(result[0].byCategory[CATEGORIES.SHORTBRANCHES]).toBe(0);
  });

  test("dua PLC berbeda — masing-masing muncul sekali dan terurut alfabetis", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-Z", category: CATEGORIES.AFI }),
      makeRecord({ jumperId: "002", plc: "PLC-A", category: CATEGORIES.AFI }),
    ];
    const result = jumperCountPerPlc(records, TODAY);
    expect(result).toHaveLength(2);
    expect(result[0].plc).toBe("PLC-A");
    expect(result[1].plc).toBe("PLC-Z");
  });

  test("dua record PLC + kategori sama — dijumlahkan", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", category: CATEGORIES.AFI }),
      makeRecord({ jumperId: "002", plc: "PLC-A", category: CATEGORIES.AFI }),
    ];
    const result = jumperCountPerPlc(records, TODAY);
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(2);
    expect(result[0].total).toBe(2);
  });

  test("fungsi tidak mengubah array sumber", () => {
    const register = [makeRecord()];
    jumperCountPerPlc(register, TODAY);
    expect(register).toHaveLength(1);
    expect(register[0].jumperId).toBe("001");
  });
});

// ---------------------------------------------------------------------------
// TEST: areaSummaryDiscrepancy (BR-12 — warning only)
// ---------------------------------------------------------------------------

describe("areaSummaryDiscrepancy — BR-12 (warning only)", () => {

  function makeAreaSummary(counts = {}) {
    return AREA_ID_LIST.map((areaId) => ({
      areaId,
      jumperCount: Object.prototype.hasOwnProperty.call(counts, areaId)
        ? counts[areaId]
        : 0,
    }));
  }

  test("basis = active_record_count_per_area (definisi baru)", () => {
    const { basis } = areaSummaryDiscrepancy([], []);
    expect(basis).toBe("active_record_count_per_area");
  });

  test("tidak ada discrepancy jika manual = computed (record aktif)", () => {
    const register = [
      makeRecord({ jumperId: "001", areaId: AREA_IDS.DRYER_CM, dueDate: "2099-12-31" }),
      makeRecord({ jumperId: "002", areaId: AREA_IDS.DRYER_CM, dueDate: "2099-12-31" }),
    ];
    const summary = makeAreaSummary({ [AREA_IDS.DRYER_CM]: 2 });
    const { warnings } = areaSummaryDiscrepancy(summary, register);
    const dryerWarning = warnings.find((w) => w.areaId === AREA_IDS.DRYER_CM);
    expect(dryerWarning.discrepancy).toBe(false);
  });

  test("discrepancy muncul saat manual != computed, nilai manual TIDAK diubah (BR-01)", () => {
    const register = [
      makeRecord({ jumperId: "001", areaId: AREA_IDS.DRYER_CM, dueDate: "2099-12-31" }),
    ];
    const summary = makeAreaSummary({ [AREA_IDS.DRYER_CM]: 5 }); // manual 5, computed 1
    const { warnings } = areaSummaryDiscrepancy(summary, register);
    const dryerWarning = warnings.find((w) => w.areaId === AREA_IDS.DRYER_CM);
    expect(dryerWarning.discrepancy).toBe(true);
    expect(dryerWarning.manualCount).toBe(5);     // nilai manual dipertahankan
    expect(dryerWarning.computedCount).toBe(1);
  });

  test("jumperCount = null tidak menghasilkan discrepancy (belum diisi)", () => {
    const register = [makeRecord({ areaId: AREA_IDS.DRYER_CM, dueDate: "2099-12-31" })];
    const summary = makeAreaSummary({ [AREA_IDS.DRYER_CM]: null });
    const { warnings } = areaSummaryDiscrepancy(summary, register);
    const dryerWarning = warnings.find((w) => w.areaId === AREA_IDS.DRYER_CM);
    expect(dryerWarning.discrepancy).toBe(false);
  });

  test("record expired TETAP dihitung dalam computed count", () => {
    const active  = makeRecord({ jumperId: "001", areaId: AREA_IDS.FURNACE, dueDate: "2099-12-31" });
    const expired = makeRecord({ jumperId: "002", areaId: AREA_IDS.FURNACE, dueDate: "2000-01-01" });
    const summary = makeAreaSummary({ [AREA_IDS.FURNACE]: 2 });
    const { warnings } = areaSummaryDiscrepancy(summary, [active, expired]);
    const furnaceW = warnings.find((w) => w.areaId === AREA_IDS.FURNACE);
    expect(furnaceW.computedCount).toBe(2); // active + expired
    expect(furnaceW.discrepancy).toBe(false);
  });

  test("fungsi tidak mengubah array sumber", () => {
    const summary = makeAreaSummary({ [AREA_IDS.DRYER_CM]: 3 });
    const register = [makeRecord({ areaId: AREA_IDS.DRYER_CM })];
    areaSummaryDiscrepancy(summary, register);
    expect(summary.find((s) => s.areaId === AREA_IDS.DRYER_CM).jumperCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// TEST: activeJumperQuantityByArea
// ---------------------------------------------------------------------------

describe("activeJumperQuantityByArea", () => {

  test("register kosong mengembalikan 0 untuk semua area", () => {
    const result = activeJumperQuantityByArea([], TODAY);
    for (const areaId of AREA_ID_LIST) {
      expect(result[areaId]).toBe(0);
    }
  });

  test("record aktif dihitung per area", () => {
    const records = [
      makeRecord({ jumperId: "001", areaId: AREA_IDS.DRYER_CM, dueDate: "2026-12-31" }),
      makeRecord({ jumperId: "002", areaId: AREA_IDS.DRYER_CM, dueDate: "2026-06-20" }), // Expiring Soon
      makeRecord({ jumperId: "003", areaId: AREA_IDS.FURNACE, dueDate: "2026-12-31" }),
    ];
    const result = activeJumperQuantityByArea(records, TODAY);
    expect(result[AREA_IDS.DRYER_CM]).toBe(2);
    expect(result[AREA_IDS.FURNACE]).toBe(1);
    expect(result[AREA_IDS.KILN_CTS]).toBe(0);
    expect(result[AREA_IDS.CONVERTER]).toBe(0);
  });

  test("record expired tetap dihitung dan record tanpa dueDate dikecualikan", () => {
    const records = [
      makeRecord({ jumperId: "001", areaId: AREA_IDS.KILN_CTS, dueDate: "2026-12-31" }), // active
      makeRecord({ jumperId: "002", areaId: AREA_IDS.KILN_CTS, dueDate: "2000-01-01" }), // expired
      makeRecord({ jumperId: "003", areaId: AREA_IDS.KILN_CTS, dueDate: null }),         // no date
    ];
    const result = activeJumperQuantityByArea(records, TODAY);
    expect(result[AREA_IDS.KILN_CTS]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TEST: getChartSeriesForCell (chartData.js) — urutan week eksplisit
// ---------------------------------------------------------------------------

describe("getChartSeriesForCell — urutan week eksplisit", () => {

  test("urutan output mengikuti weekLabels — bukan alfabetis", () => {
    const weekLabels = ["W40", "W36", "W38", "W37", "W39"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W36", plan: 10, actual: 8 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 15, actual: 14 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W38", plan: 12, actual: 11 },
    ];
    const series = getChartSeriesForCell(chartData, weekLabels, AREA_IDS.DRYER_CM, CATEGORIES.AFI);

    expect(series.labels).toEqual(["W40", "W36", "W38", "W37", "W39"]);
    expect(series.planSeries[0]).toBe(15);   // W40
    expect(series.planSeries[1]).toBe(10);   // W36
    expect(series.planSeries[2]).toBe(12);   // W38
    expect(series.planSeries[3]).toBeNull(); // W37 — tanpa data
    expect(series.planSeries[4]).toBeNull(); // W39 — tanpa data
  });

  test("minggu tanpa data menghasilkan null (bukan 0) — T-02", () => {
    const weekLabels = ["W36", "W37"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W36", plan: 5, actual: 4 },
    ];
    const series = getChartSeriesForCell(chartData, weekLabels, AREA_IDS.DRYER_CM, CATEGORIES.AFI);
    expect(series.planSeries[1]).toBeNull();
    expect(series.actualSeries[1]).toBeNull();
  });

  test("plan=0, actual=0 berbeda dari null — T-01", () => {
    const weekLabels = ["W36"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W36", plan: 0, actual: 0 },
    ];
    const series = getChartSeriesForCell(chartData, weekLabels, AREA_IDS.DRYER_CM, CATEGORIES.AFI);
    expect(series.planSeries[0]).toBe(0);
    expect(series.actualSeries[0]).toBe(0);
    expect(series.planSeries[0]).not.toBeNull();
  });

  test("data area/category lain tidak bercampur", () => {
    const weekLabels = ["W40"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI,    week: "W40", plan: 5,  actual: 4 },
      { areaId: AREA_IDS.FURNACE,   category: CATEGORIES.AFI,    week: "W40", plan: 99, actual: 99 },
      { areaId: AREA_IDS.DRYER_CM,  category: CATEGORIES.FORCES, week: "W40", plan: 88, actual: 88 },
    ];
    const series = getChartSeriesForCell(chartData, weekLabels, AREA_IDS.DRYER_CM, CATEGORIES.AFI);
    expect(series.planSeries[0]).toBe(5);
    expect(series.actualSeries[0]).toBe(4);
  });

  test("weekLabels kosong — output series kosong", () => {
    const series = getChartSeriesForCell([], [], AREA_IDS.DRYER_CM, CATEGORIES.AFI);
    expect(series.labels).toHaveLength(0);
    expect(series.planSeries).toHaveLength(0);
    expect(series.actualSeries).toHaveLength(0);
  });

  test("fungsi tidak mengubah weekLabels sumber", () => {
    const weekLabels = ["W36", "W37"];
    const original = [...weekLabels];
    getChartSeriesForCell([], weekLabels, AREA_IDS.DRYER_CM, CATEGORIES.AFI);
    expect(weekLabels).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// TEST: getAllChartSeries — 12 kombinasi
// ---------------------------------------------------------------------------

describe("getAllChartSeries — 12 grafik", () => {

  test("menghasilkan tepat 12 entri sesuai CHART_MATRIX", () => {
    const series = getAllChartSeries([], ["W40"]);
    expect(series.size).toBe(12);
  });

  test("semua 12 kombinasi area × category ada dalam Map", () => {
    const series = getAllChartSeries([], ["W40"]);
    for (const { areaId, category } of CHART_MATRIX) {
      expect(series.has(getChartKey(areaId, category))).toBe(true);
    }
  });

  test("data yang tepat muncul pada sel yang tepat", () => {
    const weekLabels = ["W40"];
    const chartData = [
      { areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.FORCES, week: "W40", plan: 7, actual: 6 },
    ];
    const series = getAllChartSeries(chartData, weekLabels);
    const kilnForces = series.get(getChartKey(AREA_IDS.KILN_CTS, CATEGORIES.FORCES));
    expect(kilnForces.planSeries[0]).toBe(7);
    expect(kilnForces.actualSeries[0]).toBe(6);
    const dryerAfi = series.get(getChartKey(AREA_IDS.DRYER_CM, CATEGORIES.AFI));
    expect(dryerAfi.planSeries[0]).toBeNull();
  });

  test("mempertahankan urutan weekLabels non-alfabetis", () => {
    const weekLabels = ["W40", "W36", "W38"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W36", plan: 5, actual: 4 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 9, actual: 8 },
    ];
    const series = getAllChartSeries(chartData, weekLabels);
    const dryerAfi = series.get(getChartKey(AREA_IDS.DRYER_CM, CATEGORIES.AFI));
    expect(dryerAfi.labels).toEqual(["W40", "W36", "W38"]);
    expect(dryerAfi.planSeries[0]).toBe(9);
    expect(dryerAfi.planSeries[1]).toBe(5);
    expect(dryerAfi.planSeries[2]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TEST: checkChartDataCompleteness
// ---------------------------------------------------------------------------

describe("checkChartDataCompleteness", () => {

  test("semua data lengkap → complete = true", () => {
    const weekLabels = ["W40"];
    const chartData = CHART_MATRIX.map(({ areaId, category }) => ({
      areaId, category, week: "W40", plan: 1, actual: 1,
    }));
    const result = checkChartDataCompleteness(chartData, weekLabels);
    expect(result.complete).toBe(true);
    expect(result.incompleteCells).toHaveLength(0);
  });

  test("data kosong → semua 12 × jumlah minggu sel incomplete", () => {
    const weekLabels = ["W36", "W40"];
    const result = checkChartDataCompleteness([], weekLabels);
    expect(result.complete).toBe(false);
    expect(result.incompleteCells).toHaveLength(12 * 2);
  });

  test("plan null pada satu sel → incomplete", () => {
    const weekLabels = ["W40"];
    const chartData = CHART_MATRIX.map(({ areaId, category }) => ({
      areaId, category, week: "W40", plan: 1, actual: 1,
    }));
    chartData[0].plan = null;
    const result = checkChartDataCompleteness(chartData, weekLabels);
    expect(result.complete).toBe(false);
    expect(result.incompleteCells).toHaveLength(1);
    expect(result.incompleteCells[0].missingPlan).toBe(true);
  });

  test("weekLabels kosong — tidak ada sel yang incomplete", () => {
    const result = checkChartDataCompleteness([], []);
    expect(result.complete).toBe(true);
    expect(result.incompleteCells).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TEST: PHASE 5.4 — calculateAreaSummariesFromWeeklyChart & Week-40 Baseline
// ---------------------------------------------------------------------------

import { parseWeekLabel, sortWeekLabelsChronologically, STANDARD_WEEKS } from "../model/constants.js";

describe("Phase 5.4 — calculateAreaSummariesFromWeeklyChart & Week-40 Baseline", () => {

  test("Task C: Area Summary Dryer-CM dan Kiln-CTS dari Actual values pada W40", () => {
    const weeklyData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.SHORTBRANCHES, week: "W40", plan: 2, actual: 2 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.FORCES, week: "W40", plan: 2, actual: 2 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 0, actual: 0 },
      { areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.AFI, week: "W40", plan: 3, actual: 3 },
      { areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.SHORTBRANCHES, week: "W40", plan: 0, actual: 0 },
      { areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.FORCES, week: "W40", plan: 0, actual: 0 },
    ];

    const summaries = calculateAreaSummariesFromWeeklyChart(weeklyData, "W40", 2026);
    expect(summaries[AREA_IDS.DRYER_CM].totalActual).toBe(4);
    expect(summaries[AREA_IDS.DRYER_CM].isComplete).toBe(true);
    expect(summaries[AREA_IDS.KILN_CTS].totalActual).toBe(3);
    expect(summaries[AREA_IDS.KILN_CTS].isComplete).toBe(true);
  });

  test("Task C: null tidak diubah diam-diam menjadi 0 — isComplete:false", () => {
    const incompleteData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.SHORTBRANCHES, week: "W40", plan: 2, actual: 2 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.FORCES, week: "W40", plan: 2, actual: null },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 0, actual: 0 },
    ];

    const summaries = calculateAreaSummariesFromWeeklyChart(incompleteData, 40, 2026);
    expect(summaries[AREA_IDS.DRYER_CM].isComplete).toBe(false);
    expect(summaries[AREA_IDS.DRYER_CM].categoryValues[CATEGORIES.FORCES]).toBeNull();
  });

  test("Task B: parseWeekLabel & sortWeekLabelsChronologically mengurutkan numerik dan tahun", () => {
    expect(STANDARD_WEEKS).toHaveLength(52);
    expect(STANDARD_WEEKS[0]).toBe("W1");
    expect(STANDARD_WEEKS[51]).toBe("W52");

    const parsed1 = parseWeekLabel("wk40");
    expect(parsed1.weekNumber).toBe(40);
    expect(parsed1.label).toBe("W40");

    const parsedLegacy = parseWeekLabel("wk1('25)");
    expect(parsedLegacy.weekNumber).toBe(1);
    expect(parsedLegacy.year).toBe(2025);

    const unsorted = ["W10", "W2", "W1 ('26)", "W1 ('25)", "W9"];
    const sorted = sortWeekLabelsChronologically(unsorted, 2026);
    expect(sorted).toEqual(["W1 ('25)", "W1 ('26)", "W2", "W9", "W10"]);
  });

  test("Task H: Week-40 Baseline Validation — schema baru (revisi form)", () => {
    const reg = WEEK_40_BASELINE.jumperRegister;
    expect(reg).toHaveLength(6);

    // Semua record ID 3-digit numerik
    expect(reg.every((r) => /^\d{3}$/.test(r.jumperId))).toBe(true);

    // Field lama sudah dihapus dari baseline
    expect(reg.every((r) => r.authorizationStatus === undefined)).toBe(true);
    expect(reg.every((r) => r.mocStatus === undefined)).toBe(true);
    expect(reg.every((r) => r.removalStatus === undefined)).toBe(true);
    expect(reg.every((r) => r.quantity === undefined)).toBe(true);

    // Field schema baru ada
    expect(reg.every((r) => typeof r.installedDate === "string")).toBe(true);
    expect(reg.every((r) => "dueDate" in r)).toBe(true);

    // Authorized records memiliki dueDate valid, Non-Authorized opsional (null)
    const authRecords = reg.filter((r) => r.authorizationType === AUTH_TYPE.AUTHORIZED);
    expect(authRecords.every((r) => typeof r.dueDate === "string")).toBe(true);

    // Record tanpa dueDate: 0 PLC dengan jumper aktif → 69/69 tanpa jumper aktif (100%)
    const nullDueDateReg = reg.map((r) => ({ ...r, dueDate: null }));
    const plcMetric = plcsWithoutActiveJumpers(nullDueDateReg, WEEK_40_BASELINE.config.totalPlcInScope, TODAY);
    expect(plcMetric.ok).toBe(true);
    expect(plcMetric.plcsWithActive).toBe(0);
    expect(plcMetric.plcsWithoutActive).toBe(69);
    expect(plcMetric.percentage).toBeCloseTo(100);

    // Baseline asli dengan jumper aktif terhitung
    const actualMetric = plcsWithoutActiveJumpers(reg, WEEK_40_BASELINE.config.totalPlcInScope, TODAY);
    expect(actualMetric.plcsWithActive).toBe(2);
    expect(actualMetric.plcsWithoutActive).toBe(67);
    expect(actualMetric.percentage).toBeCloseTo((67 / 69) * 100);
  });
});

// ---------------------------------------------------------------------------
// TEST: PHASE 3.1 — Authorization Filtering Selectors
// ---------------------------------------------------------------------------

describe("PHASE 3.1 — getAuthorizedJumpers / getNonAuthorizedJumpers", () => {
  const records = [
    createJumperRecord({
      jumperId: "001",
      plc: "D1C",
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.FORCES,
      authorizationType: AUTH_TYPE.AUTHORIZED,
      dueDate: "2026-12-31",
    }),
    createJumperRecord({
      jumperId: "002",
      plc: "D2C",
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.SHORTBRANCHES,
      authorizationType: AUTH_TYPE.AUTHORIZED,
      dueDate: "2020-01-01", // Expired, but still Authorized
    }),
    createJumperRecord({
      jumperId: "003",
      plc: "K1",
      areaId: AREA_IDS.KILN_CTS,
      category: CATEGORIES.AFI,
      authorizationType: AUTH_TYPE.NON_AUTHORIZED,
      dueDate: "2026-12-31",
    }),
    createJumperRecord({
      jumperId: "004",
      plc: "K2",
      areaId: AREA_IDS.KILN_CTS,
      category: CATEGORIES.AFI,
      authorizationType: null, // Legacy record without authorizationType
      dueDate: null,
    }),
  ];

  test("Authorized table contains only IDs 001 and 002", () => {
    const authorized = getAuthorizedJumpers(records);
    expect(authorized.map((r) => r.jumperId)).toEqual(["001", "002"]);
  });

  test("Non-Authorized table contains only ID 003", () => {
    const nonAuthorized = getNonAuthorizedJumpers(records);
    expect(nonAuthorized.map((r) => r.jumperId)).toEqual(["003"]);
  });

  test("ID 004 (authorizationType null) appears in neither Authorized nor Non-Authorized", () => {
    const authorized = getAuthorizedJumpers(records);
    const nonAuthorized = getNonAuthorizedJumpers(records);
    expect(authorized.some((r) => r.jumperId === "004")).toBe(false);
    expect(nonAuthorized.some((r) => r.jumperId === "004")).toBe(false);
  });

  test("No record appears in both tables", () => {
    const authorized = getAuthorizedJumpers(records);
    const nonAuthorized = getNonAuthorizedJumpers(records);

    const authIds = new Set(authorized.map((r) => r.jumperId));
    const overlap = nonAuthorized.filter((r) => authIds.has(r.jumperId));
    expect(overlap).toHaveLength(0);
  });

  test("Filtering does not mutate or reclassify stored records", () => {
    const originalTypes = records.map((r) => r.authorizationType);
    getAuthorizedJumpers(records);
    getNonAuthorizedJumpers(records);
    expect(records.map((r) => r.authorizationType)).toEqual(originalTypes);
  });

  test("Input non-array atau kosong mengembalikan array kosong", () => {
    expect(getAuthorizedJumpers(null)).toEqual([]);
    expect(getAuthorizedJumpers(undefined)).toEqual([]);
    expect(getAuthorizedJumpers([])).toEqual([]);
    expect(getNonAuthorizedJumpers(null)).toEqual([]);
    expect(getNonAuthorizedJumpers([])).toEqual([]);
  });
});
