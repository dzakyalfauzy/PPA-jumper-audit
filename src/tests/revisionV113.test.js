/**
 * revisionV113.test.js
 * Tests for PPA-FMDS v1.1.3 report-preview revisions:
 *   1. Obsolete annotations removed from HTML preview, PDF, and PPTX.
 *   2. Non-Authorized jumper list shows exactly ID, PLC, Area, Category.
 *   3. PLC Category chart includes Authorized and Non-Authorized records.
 *   4. Existing KPI calculations remain unchanged.
 *   5. Authorized / Non-Authorized table filtering remains unchanged.
 *   6. 12 weekly charts, logo order, and pagination unchanged.
 */

"use strict";

import { renderSlidePreview } from "../preview/slidePreview.js";
import { exportToPowerPoint } from "../export/pptxExporter.js";
import {
  plcsWithoutActiveJumpers,
  jumperCountPerPlc,
  getAuthorizedJumpers,
  getNonAuthorizedJumpers,
} from "../logic/selectors.js";
import { createJumperRecord, WEEK_40_BASELINE } from "../model/state.js";
import {
  AREA_IDS,
  AREA_LABELS,
  CATEGORIES,
  AUTH_TYPE,
  CHART_MATRIX,
  CATEGORY_COLORS,
} from "../model/constants.js";
import { canvasId } from "../preview/chartRenderer.js";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeRecord(overrides = {}) {
  return createJumperRecord({
    jumperId:          "001",
    plc:               "PLC-A",
    areaId:            AREA_IDS.DRYER_CM,
    category:          CATEGORIES.AFI,
    authorizationType: AUTH_TYPE.AUTHORIZED,
    description:       "Test",
    installedDate:     "2026-03-07",
    dueDate:           "2026-12-31",
    ...overrides,
  });
}

function renderHtml(state) {
  const container = { innerHTML: "" };
  renderSlidePreview(container, state, null);
  return container.innerHTML;
}

function makeBaseState(jumperRegister = []) {
  return {
    config: {
      title: "PPA JUMPER AUDIT",
      plantArea: "PP Area",
      reportingYear: 2026,
      reportingWeek: 40,
      totalPlcInScope: 69,
      totalRemoveJumper: 0,
    },
    areaSummary: [
      { areaId: "dryer_cm", jumperCount: 0 },
      { areaId: "kiln_cts", jumperCount: 0 },
      { areaId: "furnace", jumperCount: 0 },
      { areaId: "converter", jumperCount: 0 },
    ],
    weeklyChartData: [],
    jumperRegister,
  };
}

function makeMockPptx() {
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

  return { MockPptxGen, mockPptxInstance };
}

// ===========================================================================
// 1. OBSOLETE ANNOTATIONS REMOVED
// ===========================================================================

describe("v1.1.3 — Revision 1: Obsolete annotations removed", () => {
  const state = makeBaseState([
    makeRecord({ jumperId: "001", plc: "D3C", areaId: AREA_IDS.DRYER_CM, authorizationType: AUTH_TYPE.AUTHORIZED }),
    makeRecord({ jumperId: "002", plc: "K2", areaId: AREA_IDS.KILN_CTS, authorizationType: AUTH_TYPE.NON_AUTHORIZED, dueDate: null }),
  ]);

  test("1a. HTML preview does NOT contain '[DATA SOURCE: JUMPER REGISTER — NON-AUTHORIZED]' (case-insensitive)", () => {
    const html = renderHtml(state);
    expect(html.toUpperCase()).not.toContain("[DATA SOURCE: JUMPER REGISTER — NON-AUTHORIZED]");
    expect(html).not.toContain("[Data source: Jumper Register — Non-Authorized]");
  });

  test("1b. HTML preview does NOT contain 'Definisi \"With MOC/Authorized\" memerlukan konfirmasi'", () => {
    const html = renderHtml(state);
    expect(html).not.toContain("Definisi");
    expect(html).not.toContain("field MOC/Authorization dihapus dari register");
  });

  test("1c. HTML preview does NOT contain 'Data source: Jumper Register (Authorization Type: Non-Authorized)'", () => {
    const html = renderHtml(state);
    expect(html).not.toContain("Data source: Jumper Register (Authorization Type: Non-Authorized)");
  });

  test("1d. PDF inherits HTML — obsolete text absent from rendered slide", () => {
    const html = renderHtml(state);
    expect(html).not.toContain("NON-AUTHORIZED]");
    expect(html).not.toContain("memerlukan konfirmasi");
  });

  test("1e. PPTX does NOT contain obsolete annotations", async () => {
    const { MockPptxGen, mockPptxInstance } = makeMockPptx();
    await exportToPowerPoint(state, MockPptxGen);
    const slide = mockPptxInstance.slides[0];
    const allText = slide.texts.map((t) => String(t.txt)).join(" | ");
    expect(allText.toUpperCase()).not.toContain("NON-AUTHORIZED]");
    expect(allText).not.toContain("memerlukan konfirmasi");
    expect(allText).not.toContain("field MOC/Authorization dihapus");
  });

  test("1f. Valid report elements preserved (title, section headings)", () => {
    const html = renderHtml(state);
    expect(html).toContain("PPA JUMPER AUDIT | Week 40 - 2026");
    expect(html).toContain("Total Jumper With MOC/Authorized Jumper");
    expect(html).toContain("Jumper Without MOC/Authorized Jumper");
    expect(html).toContain("PLCs With Active Jumper / Total PLCs");
    expect(html).toContain("Count of Remaining Jumper on PLC PP Area");
  });
});

// ===========================================================================
// 2. NON-AUTHORIZED LIST COLUMNS
// ===========================================================================

describe("Revision: Non-Authorized list formatted as \"ID\", PLC \"PLC\", \"Category\" - Description", () => {
  const records = [
    makeRecord({ jumperId: "010", plc: "D3C", areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.FORCES,
                  authorizationType: AUTH_TYPE.NON_AUTHORIZED, description: "Should appear in list", dueDate: null }),
    makeRecord({ jumperId: "011", plc: "K2", areaId: AREA_IDS.KILN_CTS, category: CATEGORIES.AFI,
                  authorizationType: AUTH_TYPE.NON_AUTHORIZED, description: "Also in list", dueDate: null }),
    makeRecord({ jumperId: "012", plc: "CMS1", areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.SHORTBRANCHES,
                  authorizationType: AUTH_TYPE.AUTHORIZED, description: "Auth record", dueDate: "2026-12-31" }),
  ];
  const state = makeBaseState(records);

  test("2a. HTML Non-Authorized list formats items as: \"ID\", PLC \"PLC\", \"Category\" - Description", () => {
    const html = renderHtml(state);
    const panelMatch = html.match(/<div class="slide-remaining-panel">([\s\S]*?)<div class="slide-plc-section">/);
    expect(panelMatch).not.toBeNull();
    const panelHtml = panelMatch[1];
    expect(panelHtml).toContain("010,");
    expect(panelHtml).toContain("PLC D3C,");
    expect(panelHtml).toContain(CATEGORIES.FORCES);
    expect(panelHtml).toContain("Should appear in list");
    expect(panelHtml).toContain("011,");
    expect(panelHtml).toContain("PLC K2,");
    expect(panelHtml).toContain(CATEGORIES.AFI);
    expect(panelHtml).toContain("Also in list");
  });

  test("2b. HTML Non-Authorized list does NOT contain row numbers or Area", () => {
    const html = renderHtml(state);
    const panelMatch = html.match(/<div class="slide-remaining-panel">([\s\S]*?)<div class="slide-plc-section">/);
    const panelHtml = panelMatch[1];
    expect(panelHtml).not.toContain("slide-remaining-item__no");
    expect(panelHtml).not.toContain("slide-remaining-item__area");
  });

  test("2c. HTML Non-Authorized list has ID, PLC, Category, and Description span classes", () => {
    const html = renderHtml(state);
    expect(html).toContain("slide-remaining-item__id");
    expect(html).toContain("slide-remaining-item__plc");
    expect(html).toContain("slide-remaining-item__cat");
    expect(html).toContain("slide-remaining-item__desc");
  });

  test("2d. Section title and count badge preserved", () => {
    const html = renderHtml(state);
    expect(html).toContain("Jumper Without MOC/Authorized Jumper");
    expect(html).toContain('<span class="slide-count-badge">2</span>');
  });

  test("2e. PPTX Non-Authorized list rendered as text runs matching preview format", async () => {
    const { MockPptxGen, mockPptxInstance } = makeMockPptx();
    await exportToPowerPoint(state, MockPptxGen);
    const slide = mockPptxInstance.slides[0];
    const nonAuthTextItem = slide.texts.find((t) => Array.isArray(t.txt) && t.txt.some((run) => run.text === "010"));
    expect(nonAuthTextItem).toBeDefined();
    const combinedText = nonAuthTextItem.txt.map((run) => run.text).join("");
    expect(combinedText).toContain("010, PLC D3C, Forces - Should appear in list");
    expect(combinedText).toContain("011, PLC K2, AFI - Also in list");
    expect(combinedText).not.toContain("012");
  });

  test("2f. PPTX Non-Authorized text runs do not have row numbers or Area labels", async () => {
    const { MockPptxGen, mockPptxInstance } = makeMockPptx();
    await exportToPowerPoint(state, MockPptxGen);
    const slide = mockPptxInstance.slides[0];
    const nonAuthTextItem = slide.texts.find((t) => Array.isArray(t.txt) && t.txt.some((run) => run.text === "010"));
    const combinedText = nonAuthTextItem.txt.map((run) => run.text).join("");
    expect(combinedText).not.toContain("1.");
    expect(combinedText).not.toContain("2.");
    expect(combinedText).not.toContain(AREA_LABELS[AREA_IDS.DRYER_CM]);
    expect(combinedText).not.toContain(AREA_LABELS[AREA_IDS.KILN_CTS]);
  });
});

// ===========================================================================
// 3. PLC CATEGORY CHART INCLUDES ALL RECORDS
// ===========================================================================

describe("v1.1.3 — Revision 3: PLC Category chart includes Authorized and Non-Authorized records", () => {

  test("3a. jumperCountPerPlc includes Authorized records", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "D3C", category: CATEGORIES.AFI, authorizationType: AUTH_TYPE.AUTHORIZED, dueDate: "2026-12-31" }),
    ];
    const result = jumperCountPerPlc(records);
    expect(result).toHaveLength(1);
    expect(result[0].plc).toBe("D3C");
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(1);
  });

  test("3b. jumperCountPerPlc includes Non-Authorized records (even without Due Date)", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "K2", category: CATEGORIES.AFI, authorizationType: AUTH_TYPE.NON_AUTHORIZED, dueDate: null }),
    ];
    const result = jumperCountPerPlc(records);
    expect(result).toHaveLength(1);
    expect(result[0].plc).toBe("K2");
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(1);
  });

  test("3c. Both auth types contribute to the same chart — no double counting", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "D3C", category: CATEGORIES.AFI, authorizationType: AUTH_TYPE.AUTHORIZED, dueDate: "2026-12-31" }),
      makeRecord({ jumperId: "002", plc: "D3C", category: CATEGORIES.AFI, authorizationType: AUTH_TYPE.NON_AUTHORIZED, dueDate: null }),
      makeRecord({ jumperId: "003", plc: "K2", category: CATEGORIES.FORCES, authorizationType: AUTH_TYPE.NON_AUTHORIZED, dueDate: null }),
    ];
    const result = jumperCountPerPlc(records);
    expect(result).toHaveLength(2);
    const d3c = result.find((r) => r.plc === "D3C");
    const k2 = result.find((r) => r.plc === "K2");
    expect(d3c.byCategory[CATEGORIES.AFI]).toBe(2);
    expect(d3c.total).toBe(2);
    expect(k2.byCategory[CATEGORIES.FORCES]).toBe(1);
    expect(k2.total).toBe(1);
  });

  test("3d. Each record contributes exactly once", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "D3C", category: CATEGORIES.AFI, authorizationType: AUTH_TYPE.AUTHORIZED }),
      makeRecord({ jumperId: "002", plc: "D3C", category: CATEGORIES.SHORTBRANCHES, authorizationType: AUTH_TYPE.NON_AUTHORIZED, dueDate: null }),
    ];
    const result = jumperCountPerPlc(records);
    const d3c = result.find((r) => r.plc === "D3C");
    expect(d3c.byCategory[CATEGORIES.AFI]).toBe(1);
    expect(d3c.byCategory[CATEGORIES.SHORTBRANCHES]).toBe(1);
    expect(d3c.total).toBe(2);
  });

  test("3e. Chart series colors preserved (AFI=#00B0F0, Shortbranches=#BFBFBF, Forces=#008577)", () => {
    expect(CATEGORY_COLORS.AFI.base).toBe("#00B0F0");
    expect(CATEGORY_COLORS.Shortbranches.base).toBe("#BFBFBF");
    expect(CATEGORY_COLORS.Forces.base).toBe("#008577");
  });

  test("3f. WEEK_40_BASELINE: PLC chart now counts all 6 records including Non-Authorized", () => {
    const result = jumperCountPerPlc(WEEK_40_BASELINE.jumperRegister);
    const totalRecords = result.reduce((sum, r) => sum + r.total, 0);
    expect(totalRecords).toBe(6);
    const k2 = result.find((r) => r.plc === "K2");
    expect(k2).toBeDefined();
    expect(k2.byCategory[CATEGORIES.AFI]).toBe(3);
    const d3c = result.find((r) => r.plc === "D3C");
    expect(d3c).toBeDefined();
    expect(d3c.byCategory[CATEGORIES.SHORTBRANCHES]).toBe(2);
  });
});

// ===========================================================================
// 4. KPI CALCULATIONS UNCHANGED
// ===========================================================================

describe("v1.1.3 — KPI calculations remain unchanged", () => {

  test("4a. plcsWithoutActiveJumpers still filters by Due Date status (not all records)", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "D3C", dueDate: "2026-12-31", authorizationType: AUTH_TYPE.AUTHORIZED }),
      makeRecord({ jumperId: "002", plc: "K2", dueDate: null, authorizationType: AUTH_TYPE.NON_AUTHORIZED }),
    ];
    const result = plcsWithoutActiveJumpers(records, 69, new Date("2026-10-09T00:00:00Z"));
    expect(result.plcsWithActive).toBe(1);
    expect(result.plcsWithoutActive).toBe(68);
  });

  test("4b. WEEK_40_BASELINE KPI: 2 PLCs with active jumper / 69 total", () => {
    const result = plcsWithoutActiveJumpers(WEEK_40_BASELINE.jumperRegister, 69, new Date("2026-10-09T00:00:00Z"));
    expect(result.plcsWithActive).toBe(2);
    expect(result.totalPlcInScope).toBe(69);
    expect(result.plcsWithoutActive).toBe(67);
    expect(result.percentage).toBeCloseTo((67 / 69) * 100);
  });
});

// ===========================================================================
// 5. AUTHORIZED / NON-AUTHORIZED TABLE FILTERING UNCHANGED
// ===========================================================================

describe("v1.1.3 — Table filtering unchanged", () => {
  const mixedRecords = [
    makeRecord({ jumperId: "001", authorizationType: AUTH_TYPE.AUTHORIZED }),
    makeRecord({ jumperId: "002", authorizationType: AUTH_TYPE.AUTHORIZED }),
    makeRecord({ jumperId: "003", authorizationType: AUTH_TYPE.NON_AUTHORIZED, dueDate: null }),
    makeRecord({ jumperId: "004", authorizationType: null }),
  ];

  test("5a. getAuthorizedJumpers returns only Authorized records", () => {
    const auth = getAuthorizedJumpers(mixedRecords);
    expect(auth).toHaveLength(2);
    expect(auth.map((r) => r.jumperId)).toEqual(["001", "002"]);
  });

  test("5b. getNonAuthorizedJumpers returns only Non-Authorized records", () => {
    const nonAuth = getNonAuthorizedJumpers(mixedRecords);
    expect(nonAuth).toHaveLength(1);
    expect(nonAuth[0].jumperId).toBe("003");
  });

  test("5c. HTML Authorized table still has 7 columns (ID, PLC, Area, Category, Installed, Due Date, Status)", () => {
    const state = makeBaseState(mixedRecords);
    const html = renderHtml(state);
    const tableMatch = html.match(/<table class="slide-update-table">([\s\S]*?)<\/table>/);
    expect(tableMatch).not.toBeNull();
    for (const th of ["<th>ID</th>", "<th>PLC</th>", "<th>Area</th>", "<th>Category</th>",
                       "<th>Installed</th>", "<th>Due Date</th>", "<th>Status</th>"]) {
      expect(tableMatch[1]).toContain(th);
    }
  });
});

// ===========================================================================
// 6. 12 WEEKLY CHARTS, LOGO ORDER, PAGINATION UNCHANGED
// ===========================================================================

describe("v1.1.3 — Regression: 12 charts, logos, pagination", () => {

  test("6a. CHART_MATRIX still has exactly 12 combinations", () => {
    expect(CHART_MATRIX.length).toBe(12);
  });

  test("6b. All 12 canvas IDs rendered in HTML", () => {
    const state = makeBaseState(WEEK_40_BASELINE.jumperRegister);
    state.weeklyChartData = WEEK_40_BASELINE.weeklyChartData;
    const html = renderHtml(state);
    for (const { areaId, category } of CHART_MATRIX) {
      expect(html).toContain(canvasId(areaId, category));
    }
  });

  test("6c. Logo order: MIND ID before Vale in HTML", () => {
    const state = makeBaseState([]);
    const html = renderHtml(state);
    const mindidIdx = html.indexOf("logo_mindid.png");
    const valeIdx = html.indexOf("logo_vale.png");
    expect(mindidIdx).toBeGreaterThan(-1);
    expect(valeIdx).toBeGreaterThan(-1);
    expect(mindidIdx).toBeLessThan(valeIdx);
  });

  test("6d. PPTX generates exactly 1 slide with 13 charts (12 weekly + 1 PLC bar)", async () => {
    const { MockPptxGen, mockPptxInstance } = makeMockPptx();
    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    await exportToPowerPoint(state, MockPptxGen);
    expect(mockPptxInstance.slides).toHaveLength(1);
    expect(mockPptxInstance.slides[0].charts).toHaveLength(13);
  });
});
