/**
 * selectors.test.js
 * Unit test untuk src/logic/selectors.js dan src/logic/chartData.js
 *
 * Mencakup semua skenario dari PRD §18 (Test Scenarios) yang relevan di Phase 3,
 * ditambah edge case yang diminta dalam instruksi Phase 3.
 */

"use strict";

import {
  remainingJumperList,
  authorizedMocCount,
  removedJumperCount,
  remainingPlcRatio,
  jumperCountPerPlc,
  areaSummaryDiscrepancy,
  activeJumperQuantityByArea,
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
  AUTH_STATUS,
  MOC_STATUS,
  REMOVAL_STATUS,
  DUE_DATE_STATUS,
  CHART_MATRIX,
} from "../model/constants.js";

import { createJumperRecord } from "../model/state.js";

// ---------------------------------------------------------------------------
// HELPER FACTORIES
// ---------------------------------------------------------------------------

/** Config dengan identificationYearFilter dikonfigurasi */
function makeConfig(identificationYearFilter = 2026, totalPlcInScope = 10) {
  return {
    reporting: { identificationYearFilter },
    discrepancyWarning: { enabled: true, basis: null },
    weekRange: { min: 1, max: 53 },
    yearRange: { min: 2000, max: 2100 },
  };
}

/** Config dengan identificationYearFilter = null (OQ-01 belum dikonfigurasi) */
function makeConfigUnconfigured() {
  return makeConfig(null);
}

function makeRecord(overrides = {}) {
  return createJumperRecord({
    jumperId:            "J-001",
    plc:                 "PLC-A",
    areaId:              AREA_IDS.DRYER_CM,
    category:            CATEGORIES.AFI,
    description:         "Test jumper",
    installedWeekOrDate: "W35-2026",
    authorizationStatus: AUTH_STATUS.AUTHORIZED,
    mocStatus:           MOC_STATUS.APPROVED_COMPLETE,
    identificationYear:  2026,
    removalStatus:       REMOVAL_STATUS.NO,
    removalWeek:         null,
    removalYear:         null,
    dueDateStatus:       DUE_DATE_STATUS.CONFIRMED,
    dueDate:             "2026-12-31",
    quantity:            1,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// TEST: remainingJumperList (BR-03)
// ---------------------------------------------------------------------------

describe("remainingJumperList — BR-03", () => {

  test("identificationYearFilter = null mengembalikan ok:false — OQ-01", () => {
    const result = remainingJumperList([makeRecord()], makeConfigUnconfigured());
    expect(result.ok).toBe(false);
    expect(result.data).toHaveLength(0);
    expect(result.reason).toMatch(/OQ-01/);
  });

  test("register kosong mengembalikan data kosong — ok:true", () => {
    const result = remainingJumperList([], makeConfig(2026));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  // T-05: Removal=No, MOC=Not Available, tahun sesuai → masuk daftar
  test("T-05: record masuk Remaining Jumper List jika semua filter terpenuhi", () => {
    const record = makeRecord({
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      identificationYear: 2026,
    });
    const result = remainingJumperList([record], makeConfig(2026));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].jumperId).toBe("J-001");
  });

  // T-06: Removal=Yes, MOC=Not Available → tidak masuk
  test("T-06: record tidak masuk jika Removal=Yes", () => {
    const record = makeRecord({
      removalStatus: REMOVAL_STATUS.YES,
      removalWeek: "W40",
      removalYear: 2026,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      identificationYear: 2026,
    });
    const result = remainingJumperList([record], makeConfig(2026));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  // T-07: Removal=No, MOC=Approved/Complete → tidak masuk (hanya Not Available yang memenuhi)
  test("T-07: record tidak masuk jika MOC=Approved/Complete", () => {
    const record = makeRecord({
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      identificationYear: 2026,
    });
    const result = remainingJumperList([record], makeConfig(2026));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  test("record tidak masuk jika Identification Year tidak cocok dengan filter", () => {
    const record = makeRecord({
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      identificationYear: 2025, // filter = 2026
    });
    const result = remainingJumperList([record], makeConfig(2026));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  test("record tidak masuk jika MOC=Pending (BR-09)", () => {
    const record = makeRecord({
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.PENDING,
      identificationYear: 2026,
    });
    const result = remainingJumperList([record], makeConfig(2026));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  test("record tidak masuk jika MOC=Not Required", () => {
    const record = makeRecord({
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.NOT_REQUIRED,
      identificationYear: 2026,
    });
    const result = remainingJumperList([record], makeConfig(2026));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  test("hanya record yang memenuhi semua tiga filter yang masuk", () => {
    const passing = makeRecord({
      jumperId: "J-PASS",
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      identificationYear: 2026,
    });
    const failYear = makeRecord({
      jumperId: "J-FAIL-YEAR",
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      identificationYear: 2025,
    });
    const failMoc = makeRecord({
      jumperId: "J-FAIL-MOC",
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      identificationYear: 2026,
    });
    const failRemoval = makeRecord({
      jumperId: "J-FAIL-REMOVAL",
      removalStatus: REMOVAL_STATUS.YES,
      removalWeek: "W40",
      removalYear: 2026,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      identificationYear: 2026,
    });
    const result = remainingJumperList(
      [passing, failYear, failMoc, failRemoval],
      makeConfig(2026)
    );
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].jumperId).toBe("J-PASS");
  });

  test("fungsi tidak mengubah array sumber", () => {
    const register = [
      makeRecord({ jumperId: "J-A", removalStatus: REMOVAL_STATUS.NO, mocStatus: MOC_STATUS.NOT_AVAILABLE, identificationYear: 2026 }),
    ];
    const originalLength = register.length;
    remainingJumperList(register, makeConfig(2026));
    expect(register).toHaveLength(originalLength);
    expect(register[0].jumperId).toBe("J-A");
  });
});

// ---------------------------------------------------------------------------
// TEST: authorizedMocCount (BR-04)
// ---------------------------------------------------------------------------

describe("authorizedMocCount — BR-04", () => {

  test("register kosong mengembalikan count 0", () => {
    const { count } = authorizedMocCount([]);
    expect(count).toBe(0);
  });

  test("record dengan Auth=Authorized DAN MOC=Approved/Complete dihitung", () => {
    const record = makeRecord({
      authorizationStatus: AUTH_STATUS.AUTHORIZED,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      quantity: 1,
    });
    const { count } = authorizedMocCount([record]);
    expect(count).toBe(1);
  });

  test("Quantity digunakan untuk agregasi — T-10 basis", () => {
    const record = makeRecord({
      authorizationStatus: AUTH_STATUS.AUTHORIZED,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      quantity: 3,
    });
    const { count } = authorizedMocCount([record]);
    expect(count).toBe(3);
  });

  test("Auth=Pending Confirmation tidak dihitung — T-08, BR-09", () => {
    const record = makeRecord({
      authorizationStatus: AUTH_STATUS.PENDING_CONFIRMATION,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      quantity: 5,
    });
    const { count } = authorizedMocCount([record]);
    expect(count).toBe(0);
  });

  test("Auth=Not Authorized tidak dihitung", () => {
    const record = makeRecord({
      authorizationStatus: AUTH_STATUS.NOT_AUTHORIZED,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      quantity: 2,
    });
    const { count } = authorizedMocCount([record]);
    expect(count).toBe(0);
  });

  test("Auth=Authorized tapi MOC=Not Available tidak dihitung", () => {
    const record = makeRecord({
      authorizationStatus: AUTH_STATUS.AUTHORIZED,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      quantity: 2,
    });
    const { count } = authorizedMocCount([record]);
    expect(count).toBe(0);
  });

  test("Auth=Authorized tapi MOC=Pending tidak dihitung — BR-09", () => {
    const record = makeRecord({
      authorizationStatus: AUTH_STATUS.AUTHORIZED,
      mocStatus: MOC_STATUS.PENDING,
      quantity: 4,
    });
    const { count } = authorizedMocCount([record]);
    expect(count).toBe(0);
  });

  test("hanya record yang memenuhi KEDUA syarat yang dihitung", () => {
    const pass = makeRecord({
      jumperId: "J-PASS",
      authorizationStatus: AUTH_STATUS.AUTHORIZED,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      quantity: 2,
    });
    const failAuth = makeRecord({
      jumperId: "J-FAIL-AUTH",
      authorizationStatus: AUTH_STATUS.NOT_AUTHORIZED,
      mocStatus: MOC_STATUS.APPROVED_COMPLETE,
      quantity: 3,
    });
    const failMoc = makeRecord({
      jumperId: "J-FAIL-MOC",
      authorizationStatus: AUTH_STATUS.AUTHORIZED,
      mocStatus: MOC_STATUS.PENDING,
      quantity: 4,
    });
    const { count, records } = authorizedMocCount([pass, failAuth, failMoc]);
    expect(count).toBe(2);
    expect(records).toHaveLength(1);
    expect(records[0].jumperId).toBe("J-PASS");
  });

  test("multiple records — sum Quantity benar", () => {
    const r1 = makeRecord({ jumperId: "J-1", authorizationStatus: AUTH_STATUS.AUTHORIZED, mocStatus: MOC_STATUS.APPROVED_COMPLETE, quantity: 2 });
    const r2 = makeRecord({ jumperId: "J-2", authorizationStatus: AUTH_STATUS.AUTHORIZED, mocStatus: MOC_STATUS.APPROVED_COMPLETE, quantity: 5 });
    const { count } = authorizedMocCount([r1, r2]);
    expect(count).toBe(7);
  });

  test("mengembalikan placeholderWarning yang mengandung OQ-02 dan OQ-03", () => {
    const { placeholderWarning } = authorizedMocCount([]);
    expect(placeholderWarning).toMatch(/OQ-02/);
    expect(placeholderWarning).toMatch(/OQ-03/);
  });

  test("fungsi tidak mengubah array sumber", () => {
    const register = [makeRecord({ quantity: 3 })];
    authorizedMocCount(register);
    expect(register[0].quantity).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// TEST: removedJumperCount (BR-05)
// ---------------------------------------------------------------------------

describe("removedJumperCount — BR-05", () => {

  // reportingWeekLabel: label string eksplisit minggu laporan (bukan integer)
  // Pemanggil bertanggung jawab menyediakan label yang sesuai (OQ-07)
  const REPORTING_WEEK_LABEL = "W40";
  const REPORTING_YEAR = 2026;

  function removedRecord(overrides = {}) {
    return makeRecord({
      removalStatus: REMOVAL_STATUS.YES,
      removalWeek: "W40",
      removalYear: 2026,
      quantity: 1,
      ...overrides,
    });
  }

  test("register kosong mengembalikan count 0", () => {
    const { count } = removedJumperCount([], REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(count).toBe(0);
  });

  test("record removed pada week dan year yang cocok dihitung", () => {
    const record = removedRecord({ removalWeek: "W40", removalYear: 2026 });
    const { count } = removedJumperCount([record], REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(count).toBe(1);
  });

  // T-10: Quantity=3 pada record removed yang cocok → total +3
  test("T-10: Quantity=3 pada record removed yang cocok → count=3", () => {
    const record = removedRecord({ removalWeek: "W40", removalYear: 2026, quantity: 3 });
    const { count } = removedJumperCount([record], REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(count).toBe(3);
  });

  // T-09: Removal terjadi di minggu berbeda → tidak dihitung
  test("T-09: record removed pada minggu berbeda tidak dihitung", () => {
    const record = removedRecord({ removalWeek: "W36", removalYear: 2026 });
    const { count } = removedJumperCount([record], REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(count).toBe(0);
  });

  test("record removed pada tahun berbeda tidak dihitung", () => {
    const record = removedRecord({ removalWeek: "W40", removalYear: 2025 });
    const { count } = removedJumperCount([record], REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(count).toBe(0);
  });

  test("record Removal=No tidak dihitung", () => {
    const record = makeRecord({ removalStatus: REMOVAL_STATUS.NO, quantity: 5 });
    const { count } = removedJumperCount([record], REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(count).toBe(0);
  });

  test("beberapa record pada period yang sama — sum Quantity", () => {
    const r1 = removedRecord({ jumperId: "J-1", quantity: 2, removalWeek: "W40", removalYear: 2026 });
    const r2 = removedRecord({ jumperId: "J-2", quantity: 3, removalWeek: "W40", removalYear: 2026 });
    const r3 = removedRecord({ jumperId: "J-3", quantity: 1, removalWeek: "W39", removalYear: 2026 }); // minggu lain
    const { count } = removedJumperCount([r1, r2, r3], REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(count).toBe(5); // hanya r1 + r2
  });

  test("fungsi tidak mengubah array sumber", () => {
    const register = [removedRecord({ quantity: 2 })];
    removedJumperCount(register, REPORTING_YEAR, REPORTING_WEEK_LABEL);
    expect(register[0].quantity).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TEST: remainingPlcRatio (BR-06)
// ---------------------------------------------------------------------------

describe("remainingPlcRatio — BR-06", () => {

  test("totalPlcInScope = null mengembalikan ok:false", () => {
    const result = remainingPlcRatio([makeRecord()], null);
    expect(result.ok).toBe(false);
    expect(result.ratio).toBeNull();
  });

  test("totalPlcInScope = 0 mengembalikan ok:false — T-12", () => {
    const result = remainingPlcRatio([makeRecord()], 0);
    expect(result.ok).toBe(false);
    expect(result.ratio).toBeNull();
  });

  test("register kosong — activePlcCount = 0, ratio = 0", () => {
    const result = remainingPlcRatio([], 10);
    expect(result.ok).toBe(true);
    expect(result.activePlcCount).toBe(0);
    expect(result.ratio).toBe(0);
  });

  test("satu PLC aktif dari 10 → ratio = 0.1", () => {
    const record = makeRecord({ plc: "PLC-A", removalStatus: REMOVAL_STATUS.NO });
    const result = remainingPlcRatio([record], 10);
    expect(result.ok).toBe(true);
    expect(result.activePlcCount).toBe(1);
    expect(result.ratio).toBeCloseTo(0.1);
  });

  // T-11: Satu PLC dengan beberapa record → dihitung satu kali sebagai PLC unik
  test("T-11: satu PLC dengan beberapa kategori dihitung satu kali", () => {
    const r1 = makeRecord({ jumperId: "J-1", plc: "PLC-A", category: CATEGORIES.AFI });
    const r2 = makeRecord({ jumperId: "J-2", plc: "PLC-A", category: CATEGORIES.FORCES });
    const r3 = makeRecord({ jumperId: "J-3", plc: "PLC-A", category: CATEGORIES.SHORTBRANCHES });
    const result = remainingPlcRatio([r1, r2, r3], 10);
    expect(result.activePlcCount).toBe(1); // PLC-A dihitung satu kali
    expect(result.ratio).toBeCloseTo(0.1);
  });

  test("PLC removed tidak dihitung dalam rasio", () => {
    const active = makeRecord({ jumperId: "J-ACTIVE", plc: "PLC-A", removalStatus: REMOVAL_STATUS.NO });
    const removed = makeRecord({
      jumperId: "J-REMOVED",
      plc: "PLC-B",
      removalStatus: REMOVAL_STATUS.YES,
      removalWeek: "W40",
      removalYear: 2026,
    });
    const result = remainingPlcRatio([active, removed], 10);
    expect(result.activePlcCount).toBe(1); // PLC-B dikecualikan
    expect(result.activePlcList).toContain("PLC-A");
    expect(result.activePlcList).not.toContain("PLC-B");
  });

  test("dua PLC berbeda aktif dari 10 → ratio = 0.2", () => {
    const r1 = makeRecord({ jumperId: "J-1", plc: "PLC-A" });
    const r2 = makeRecord({ jumperId: "J-2", plc: "PLC-B" });
    const result = remainingPlcRatio([r1, r2], 10);
    expect(result.activePlcCount).toBe(2);
    expect(result.ratio).toBeCloseTo(0.2);
  });

  test("PLC duplikat dalam banyak record → dihitung satu kali per PLC unik", () => {
    const records = [
      makeRecord({ jumperId: "J-1", plc: "PLC-X" }),
      makeRecord({ jumperId: "J-2", plc: "PLC-X" }),
      makeRecord({ jumperId: "J-3", plc: "PLC-X" }),
      makeRecord({ jumperId: "J-4", plc: "PLC-Y" }),
    ];
    const result = remainingPlcRatio(records, 5);
    expect(result.activePlcCount).toBe(2); // PLC-X dan PLC-Y
    expect(result.ratio).toBeCloseTo(0.4);
  });

  test("fungsi tidak mengubah array sumber", () => {
    const register = [makeRecord({ plc: "PLC-Z" })];
    remainingPlcRatio(register, 10);
    expect(register[0].plc).toBe("PLC-Z");
  });
});

// ---------------------------------------------------------------------------
// TEST: jumperCountPerPlc (BR-07)
// ---------------------------------------------------------------------------

describe("jumperCountPerPlc — BR-07", () => {

  test("register kosong mengembalikan array kosong", () => {
    const result = jumperCountPerPlc([]);
    expect(result).toHaveLength(0);
  });

  test("record removed dikecualikan", () => {
    const active = makeRecord({ jumperId: "J-ACTIVE", plc: "PLC-A", category: CATEGORIES.AFI, quantity: 2 });
    const removed = makeRecord({
      jumperId: "J-REMOVED",
      plc: "PLC-A",
      category: CATEGORIES.AFI,
      quantity: 5,
      removalStatus: REMOVAL_STATUS.YES,
      removalWeek: "W40",
      removalYear: 2026,
    });
    const result = jumperCountPerPlc([active, removed]);
    expect(result).toHaveLength(1);
    const plcA = result.find((r) => r.plc === "PLC-A");
    expect(plcA.byCategory[CATEGORIES.AFI]).toBe(2); // hanya aktif
  });

  // T-11: Satu PLC dengan beberapa kategori — quantity per kategori benar
  test("T-11: satu PLC dengan beberapa kategori — kuantitas per kategori benar", () => {
    const records = [
      makeRecord({ jumperId: "J-1", plc: "PLC-A", category: CATEGORIES.AFI,          quantity: 3 }),
      makeRecord({ jumperId: "J-2", plc: "PLC-A", category: CATEGORIES.FORCES,       quantity: 2 }),
      makeRecord({ jumperId: "J-3", plc: "PLC-A", category: CATEGORIES.SHORTBRANCHES, quantity: 1 }),
    ];
    const result = jumperCountPerPlc(records);
    expect(result).toHaveLength(1);
    const plcA = result[0];
    expect(plcA.plc).toBe("PLC-A");
    expect(plcA.byCategory[CATEGORIES.AFI]).toBe(3);
    expect(plcA.byCategory[CATEGORIES.FORCES]).toBe(2);
    expect(plcA.byCategory[CATEGORIES.SHORTBRANCHES]).toBe(1);
    expect(plcA.total).toBe(6);
  });

  test("dua PLC berbeda — masing-masing muncul satu kali", () => {
    const records = [
      makeRecord({ jumperId: "J-1", plc: "PLC-A", category: CATEGORIES.AFI, quantity: 4 }),
      makeRecord({ jumperId: "J-2", plc: "PLC-B", category: CATEGORIES.AFI, quantity: 2 }),
    ];
    const result = jumperCountPerPlc(records);
    expect(result).toHaveLength(2);
    const plcA = result.find((r) => r.plc === "PLC-A");
    const plcB = result.find((r) => r.plc === "PLC-B");
    expect(plcA.byCategory[CATEGORIES.AFI]).toBe(4);
    expect(plcB.byCategory[CATEGORIES.AFI]).toBe(2);
  });

  test("kategori yang tidak memiliki data di suatu PLC mengembalikan 0", () => {
    const record = makeRecord({ plc: "PLC-A", category: CATEGORIES.AFI, quantity: 2 });
    const result = jumperCountPerPlc([record]);
    const plcA = result[0];
    expect(plcA.byCategory[CATEGORIES.FORCES]).toBe(0);
    expect(plcA.byCategory[CATEGORIES.SHORTBRANCHES]).toBe(0);
  });

  test("beberapa record PLC yang sama dengan kategori yang sama — Quantity dijumlahkan", () => {
    const records = [
      makeRecord({ jumperId: "J-1", plc: "PLC-A", category: CATEGORIES.AFI, quantity: 3 }),
      makeRecord({ jumperId: "J-2", plc: "PLC-A", category: CATEGORIES.AFI, quantity: 4 }),
    ];
    const result = jumperCountPerPlc(records);
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(7);
    expect(result[0].total).toBe(7);
  });

  test("fungsi tidak mengubah array sumber", () => {
    const register = [makeRecord({ quantity: 5 })];
    jumperCountPerPlc(register);
    expect(register[0].quantity).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// TEST: areaSummaryDiscrepancy (BR-12)
// ---------------------------------------------------------------------------

describe("areaSummaryDiscrepancy — BR-12 (warning only)", () => {

  function makeAreaSummary(counts = {}) {
    return AREA_ID_LIST.map((areaId) => ({
      areaId,
      // Gunakan hasOwnProperty agar nilai null eksplisit bisa dipakai (bukan di-replace oleh ??)
      jumperCount: Object.prototype.hasOwnProperty.call(counts, areaId) ? counts[areaId] : 0,
    }));
  }

  test("tidak ada discrepancy jika manual = computed", () => {
    const register = [
      makeRecord({ jumperId: "J-1", areaId: AREA_IDS.DRYER_CM, quantity: 2 }),
      makeRecord({ jumperId: "J-2", areaId: AREA_IDS.DRYER_CM, quantity: 1 }),
    ];
    const summary = makeAreaSummary({ [AREA_IDS.DRYER_CM]: 3 });
    const { warnings } = areaSummaryDiscrepancy(summary, register);
    const dryerWarning = warnings.find((w) => w.areaId === AREA_IDS.DRYER_CM);
    expect(dryerWarning.discrepancy).toBe(false);
  });

  // T-13: area summary berbeda dari register → nilai manual dipertahankan, warning muncul
  test("T-13: discrepancy muncul saat manual != computed, nilai manual tidak diubah", () => {
    const register = [
      makeRecord({ jumperId: "J-1", areaId: AREA_IDS.DRYER_CM, quantity: 5 }),
    ];
    const summary = makeAreaSummary({ [AREA_IDS.DRYER_CM]: 3 }); // manual: 3, register: 5
    const { warnings } = areaSummaryDiscrepancy(summary, register);
    const dryerWarning = warnings.find((w) => w.areaId === AREA_IDS.DRYER_CM);
    expect(dryerWarning.discrepancy).toBe(true);
    expect(dryerWarning.manualCount).toBe(3); // nilai manual dipertahankan
    expect(dryerWarning.computedCount).toBe(5);
  });

  test("jumperCount = null tidak menghasilkan discrepancy (belum diisi)", () => {
    const register = [makeRecord({ areaId: AREA_IDS.DRYER_CM, quantity: 3 })];
    const summary = makeAreaSummary({ [AREA_IDS.DRYER_CM]: null });
    const { warnings } = areaSummaryDiscrepancy(summary, register);
    const dryerWarning = warnings.find((w) => w.areaId === AREA_IDS.DRYER_CM);
    // null manual tidak dibandingkan — bukan discrepancy
    expect(dryerWarning.discrepancy).toBe(false);
  });

  test("basis = null mengembalikan 'unconfirmed_basis'", () => {
    const { basis } = areaSummaryDiscrepancy([], [], makeConfig());
    expect(basis).toBe("unconfirmed_basis");
  });

  test("record removed dikecualikan dari computed count", () => {
    const active  = makeRecord({ jumperId: "J-A", areaId: AREA_IDS.FURNACE, quantity: 2 });
    const removed = makeRecord({
      jumperId: "J-R",
      areaId: AREA_IDS.FURNACE,
      quantity: 3,
      removalStatus: REMOVAL_STATUS.YES,
      removalWeek: "W40",
      removalYear: 2026,
    });
    const summary = makeAreaSummary({ [AREA_IDS.FURNACE]: 2 });
    const { warnings } = areaSummaryDiscrepancy(summary, [active, removed]);
    const furnaceW = warnings.find((w) => w.areaId === AREA_IDS.FURNACE);
    expect(furnaceW.computedCount).toBe(2); // hanya active
    expect(furnaceW.discrepancy).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TEST: activeJumperQuantityByArea
// ---------------------------------------------------------------------------

describe("activeJumperQuantityByArea", () => {

  test("register kosong mengembalikan 0 untuk semua area", () => {
    const result = activeJumperQuantityByArea([]);
    for (const areaId of AREA_ID_LIST) {
      expect(result[areaId]).toBe(0);
    }
  });

  test("record aktif di-sumkan per area", () => {
    const records = [
      makeRecord({ jumperId: "J-1", areaId: AREA_IDS.DRYER_CM,  quantity: 3 }),
      makeRecord({ jumperId: "J-2", areaId: AREA_IDS.DRYER_CM,  quantity: 2 }),
      makeRecord({ jumperId: "J-3", areaId: AREA_IDS.FURNACE,   quantity: 4 }),
    ];
    const result = activeJumperQuantityByArea(records);
    expect(result[AREA_IDS.DRYER_CM]).toBe(5);
    expect(result[AREA_IDS.FURNACE]).toBe(4);
    expect(result[AREA_IDS.KILN_CTS]).toBe(0);
    expect(result[AREA_IDS.CONVERTER]).toBe(0);
  });

  test("record removed dikecualikan", () => {
    const active  = makeRecord({ jumperId: "J-A", areaId: AREA_IDS.KILN_CTS, quantity: 3 });
    const removed = makeRecord({
      jumperId: "J-R",
      areaId: AREA_IDS.KILN_CTS,
      quantity: 10,
      removalStatus: REMOVAL_STATUS.YES,
      removalWeek: "W40",
      removalYear: 2026,
    });
    const result = activeJumperQuantityByArea([active, removed]);
    expect(result[AREA_IDS.KILN_CTS]).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// TEST: getChartSeriesForCell (chartData.js)
// ---------------------------------------------------------------------------

describe("getChartSeriesForCell — urutan week eksplisit", () => {

  test("urutan output mengikuti weekLabels — bukan alfabetis", () => {
    // Label sengaja dibuat tidak alfabetis untuk membuktikan urutan eksplisit
    const weekLabels = ["W40", "W36", "W38", "W37", "W39"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W36", plan: 10, actual: 8 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 15, actual: 14 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W38", plan: 12, actual: 11 },
    ];
    const series = getChartSeriesForCell(chartData, weekLabels, AREA_IDS.DRYER_CM, CATEGORIES.AFI);

    // Output harus mengikuti urutan weekLabels: W40, W36, W38, W37, W39
    expect(series.labels).toEqual(["W40", "W36", "W38", "W37", "W39"]);
    expect(series.planSeries[0]).toBe(15);  // W40
    expect(series.planSeries[1]).toBe(10);  // W36
    expect(series.planSeries[2]).toBe(12);  // W38
    expect(series.planSeries[3]).toBeNull(); // W37 — tidak ada data
    expect(series.planSeries[4]).toBeNull(); // W39 — tidak ada data
  });

  test("minggu tanpa data menghasilkan null (bukan 0) — T-02 analog", () => {
    const weekLabels = ["W36", "W37"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W36", plan: 5, actual: 4 },
      // W37 tidak ada
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
    expect(series.planSeries[0]).toBe(0);   // nol eksplisit
    expect(series.actualSeries[0]).toBe(0);
    expect(series.planSeries[0]).not.toBeNull();
  });

  test("data area/category lain tidak bercampur", () => {
    const weekLabels = ["W40"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM,  category: CATEGORIES.AFI,    week: "W40", plan: 5,  actual: 4 },
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
      const key = getChartKey(areaId, category);
      expect(series.has(key)).toBe(true);
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
    // Sel lain harus null
    const dryerAfi = series.get(getChartKey(AREA_IDS.DRYER_CM, CATEGORIES.AFI));
    expect(dryerAfi.planSeries[0]).toBeNull();
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
    expect(result.incompleteCells).toHaveLength(12 * 2); // 12 grafik × 2 minggu
  });

  test("plan null pada satu sel → incomplete", () => {
    const weekLabels = ["W40"];
    const chartData = CHART_MATRIX.map(({ areaId, category }) => ({
      areaId, category, week: "W40", plan: 1, actual: 1,
    }));
    // Set satu plan menjadi null
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
// TEST: PHASE 5.4 - calculateAreaSummariesFromWeeklyChart (TASK C & H)
// ---------------------------------------------------------------------------

import { calculateAreaSummariesFromWeeklyChart } from "../logic/selectors.js";
import { parseWeekLabel, sortWeekLabelsChronologically, STANDARD_WEEKS } from "../model/constants.js";
import { WEEK_40_BASELINE } from "../model/state.js";

describe("Phase 5.4 — calculateAreaSummariesFromWeeklyChart & Week-40 Baseline", () => {
  test("Task C: Menghitung Area Summary Dryer-CM dan Kiln-CTS dari Actual values pada W40", () => {
    const weeklyData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.SHORTBRANCHES, week: "W40", plan: 2, actual: 2 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.FORCES, week: "W40", plan: 2, actual: 2 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 0, actual: 0 },
      { areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.AFI, week: "W40", plan: 3, actual: 3 },
      { areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.SHORTBRANCHES, week: "W40", plan: 0, actual: 0 },
      { areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.FORCES, week: "W40", plan: 0, actual: 0 },
    ];

    const summaries = calculateAreaSummariesFromWeeklyChart(weeklyData, "W40", 2026);
    // Dryer-CM: 2 (Shortbranches) + 2 (Forces) + 0 (AFI) = 4
    expect(summaries[AREA_IDS.DRYER_CM].totalActual).toBe(4);
    expect(summaries[AREA_IDS.DRYER_CM].isComplete).toBe(true);

    // Kiln-CTS: 3 (AFI) + 0 + 0 = 3
    expect(summaries[AREA_IDS.KILN_CTS].totalActual).toBe(3);
    expect(summaries[AREA_IDS.KILN_CTS].isComplete).toBe(true);
  });

  test("Task C: Tidak mengonversi nilai null menjadi 0 secara diam-diam dan tandai isComplete:false", () => {
    const incompleteData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.SHORTBRANCHES, week: "W40", plan: 2, actual: 2 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.FORCES, week: "W40", plan: 2, actual: null }, // missing
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 0, actual: 0 },
    ];

    const summaries = calculateAreaSummariesFromWeeklyChart(incompleteData, 40, 2026);
    expect(summaries[AREA_IDS.DRYER_CM].isComplete).toBe(false);
    expect(summaries[AREA_IDS.DRYER_CM].categoryValues[CATEGORIES.FORCES]).toBeNull();
  });

  test("Task B: parseWeekLabel & sortWeekLabelsChronologically mengurutkan numerik dan tahun secara tepat", () => {
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
    // Pada unsorted: W1 ('25) adalah 2025; W2, W9, W10, W1 ('26) adalah 2026.
    // Urutan dalam 2026: W1 ('26), W2, W9, W10.
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

    const appConfig = {
      reporting: { identificationYearFilter: 2026 },
      discrepancyWarning: { enabled: true, basis: null },
    };

    // BR-03: field dasar dihapus → ok:false (laporkan ambigu, jangan mengarang)
    const remaining = remainingJumperList(reg, appConfig);
    expect(remaining.ok).toBe(false);

    // KPI Authorized/MoC: field dihapus → count 0 + warning ambigu
    const authMoc = authorizedMocCount(reg);
    expect(authMoc.count).toBe(0);
    expect(authMoc.placeholderWarning).toMatch(/dihapus/);

    // Total removed W40: 0 (tidak ada field removal di schema baru)
    const removed = removedJumperCount(reg, 2026, "W40");
    expect(removed.count).toBe(0);

    // Remaining PLC ratio: PLC unik dari register = D3C, CMS1, K2 → 3 dari 69
    const plcRatio = remainingPlcRatio(reg, 69);
    expect(plcRatio.activePlcCount).toBe(3);
    expect(plcRatio.totalPlcInScope).toBe(69);
    expect(plcRatio.ratio).toBeCloseTo(3 / 69, 5);
  });
});
