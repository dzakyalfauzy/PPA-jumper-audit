/**
 * revisionV11.test.js
 * Comprehensive unit tests for PPA Jumper Audit Revision v1.1:
 * - Revision 1: Automatic Area Summary
 * - Revision 2: Jumper Register (Pagination, Styling, Conditional Due Date)
 * - Revision 3: Report Setup and Slide Header (Plant Area removed, new title format, logos)
 * - Revision 4: KPI Visual Hierarchy
 */

"use strict";

import {
  createInitialState,
  WEEK_40_BASELINE,
  createJumperRecord,
  upsertWeeklyChartRow,
  updateConfig,
  getState,
  resetToBaseline,
} from "../model/state.js";
import { AREA_IDS, CATEGORIES, AUTH_TYPE, AUTH_TYPE_COLORS } from "../model/constants.js";
import { validateConfig, validateJumperRecord } from "../model/validation.js";
import {
  calculateAreaSummariesFromWeeklyChart,
  plcsWithoutActiveJumpers,
  getAuthorizedJumpers,
  getNonAuthorizedJumpers,
} from "../logic/selectors.js";
import { renderSlidePreview } from "../preview/slidePreview.js";

describe("REVISION 1 — Automatic Area Summary from Weekly Chart Data", () => {
  beforeEach(() => {
    resetToBaseline();
  });

  test("1. Area Summary terhitung otomatis dari Actual data untuk minggu pelaporan yang dipilih", () => {
    const state = getState();
    // Di WEEK_40_BASELINE, reporting week adalah W43:
    // dryer_cm: Shortbranches=2, Forces=1, AFI=0 -> total 3
    // kiln_cts: Shortbranches=0, Forces=0, AFI=3 -> total 3
    // furnace: Shortbranches=0, Forces=0, AFI=0 -> total 0
    // converter: Shortbranches=0, Forces=0, AFI=0 -> total 0
    const summaries = calculateAreaSummariesFromWeeklyChart(state.weeklyChartData, state.config.reportingWeek, 2026);
    expect(summaries.dryer_cm.totalActual).toBe(3);
    expect(summaries.kiln_cts.totalActual).toBe(3);
    expect(summaries.furnace.totalActual).toBe(0);
    expect(summaries.converter.totalActual).toBe(0);

    const dryerSummary = state.areaSummary.find((a) => a.areaId === AREA_IDS.DRYER_CM);
    expect(dryerSummary.jumperCount).toBe(3);

    const kilnSummary = state.areaSummary.find((a) => a.areaId === AREA_IDS.KILN_CTS);
    expect(kilnSummary.jumperCount).toBe(3);
  });

  test("2. Update Weekly Chart Data otomatis memperbarui nilai Area Summary", () => {
    // Tambah nilai Actual pada Dryer-CM AFI minggu W43 dari 0 menjadi 5
    upsertWeeklyChartRow({
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.AFI,
      week: "W43",
      plan: 0,
      actual: 5,
    });

    const state = getState();
    const dryerSummary = state.areaSummary.find((a) => a.areaId === AREA_IDS.DRYER_CM);
    // 2 (Shortbranches) + 1 (Forces) + 5 (AFI) = 8
    expect(dryerSummary.jumperCount).toBe(8);
  });

  test("3. Mengubah Reporting Week otomatis memperbarui nilai Area Summary", () => {
    // Di W41, Dryer-CM: Shortbranches=5, Forces=1, AFI=0 -> total 6
    updateConfig({ reportingWeek: 41 });
    const state = getState();
    const dryerSummary = state.areaSummary.find((a) => a.areaId === AREA_IDS.DRYER_CM);
    expect(dryerSummary.jumperCount).toBe(6);
  });
});

describe("REVISION 2 — Jumper Register (Conditional Due Date & Styling)", () => {
  test("Case 1: Authorized + valid Due Date diterima", () => {
    const record = createJumperRecord({
      jumperId: "101",
      plc: "D3C",
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.FORCES,
      authorizationType: AUTH_TYPE.AUTHORIZED,
      description: "Test Auth Valid",
      installedDate: "2026-05-01",
      dueDate: "2026-12-31",
    });
    const result = validateJumperRecord(record);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Case 2: Authorized + missing Due Date ditolak", () => {
    const record = createJumperRecord({
      jumperId: "102",
      plc: "D3C",
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.FORCES,
      authorizationType: AUTH_TYPE.AUTHORIZED,
      description: "Test Auth Missing Due Date",
      installedDate: "2026-05-01",
      dueDate: null,
    });
    const result = validateJumperRecord(record);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Due Date wajib diisi untuk Authorized"))).toBe(true);
  });

  test("Case 3: Non-Authorized + valid Due Date diterima", () => {
    const record = createJumperRecord({
      jumperId: "103",
      plc: "D3C",
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.FORCES,
      authorizationType: AUTH_TYPE.NON_AUTHORIZED,
      description: "Test Non-Auth Valid Due Date",
      installedDate: "2026-05-01",
      dueDate: "2026-12-31",
    });
    const result = validateJumperRecord(record);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Case 4: Non-Authorized + missing Due Date diterima tanpa error", () => {
    const record = createJumperRecord({
      jumperId: "104",
      plc: "D3C",
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.FORCES,
      authorizationType: AUTH_TYPE.NON_AUTHORIZED,
      description: "Test Non-Auth Missing Due Date",
      installedDate: "2026-05-01",
      dueDate: null,
    });
    const result = validateJumperRecord(record);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Warna Non-Authorized adalah soft purple terkait #A52A98", () => {
    expect(AUTH_TYPE_COLORS[AUTH_TYPE.NON_AUTHORIZED].bg).toBe("#F3E8FF");
    expect(AUTH_TYPE_COLORS[AUTH_TYPE.NON_AUTHORIZED].text).toBe("#6B21A8");
  });
});

function renderHtml(state) {
  const container = { innerHTML: "" };
  renderSlidePreview(container, state, null);
  return container.innerHTML;
}

describe("REVISION 3 & 4 — Slide Header & KPI Visual Hierarchy", () => {
  test("Header slide memuat format: Title | Week X - Year dan menyertakan logo Vale & MIND ID", () => {
    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    state.config.title = "PPA JUMPER AUDIT";
    state.config.reportingWeek = 40;
    state.config.reportingYear = 2026;

    const html = renderHtml(state);
    expect(html).toContain("PPA JUMPER AUDIT | Week 40 - 2026");
    expect(html).toContain("assets/logo_vale.png");
    expect(html).toContain("assets/logo_mindid.png");

    const mindidIdx = html.indexOf("logo_mindid.png");
    const valeIdx = html.indexOf("logo_vale.png");
    expect(mindidIdx).toBeLessThan(valeIdx);
  });

  test("KPI Visual Hierarchy menampilkan rasio pembilang/penyebut dan persentase terbalik", () => {
    // Di baseline: 3 jumper authorized dengan due date pada 2 unique PLCs (D3C, CMS1)
    // Total PLC in scope: 69
    const metric = plcsWithoutActiveJumpers(WEEK_40_BASELINE.jumperRegister, 69, new Date("2026-10-09T00:00:00Z"));
    expect(metric.plcsWithActive).toBe(2);
    expect(metric.totalPlcInScope).toBe(69);
    expect(metric.plcsWithoutActive).toBe(67);
    expect(metric.percentage).toBeCloseTo((67 / 69) * 100);

    const html = renderHtml(WEEK_40_BASELINE);
    expect(html).toContain("2 / 63");
    expect(html).toContain("PLCs with active jumper / Total PLCs in Scope");
    expect(html).toContain("PLCs without active jumper");
    expect(html).toContain("96.8%");
  });

  test("validateConfig tidak lagi membutuhkan plantArea", () => {
    const result = validateConfig({
      title: "PPA JUMPER AUDIT",
      reportingYear: 2026,
      reportingWeek: 40,
      totalPlcInScope: 69,
      totalRemoveJumper: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
