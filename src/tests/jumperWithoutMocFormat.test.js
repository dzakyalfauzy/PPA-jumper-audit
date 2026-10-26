/**
 * jumperWithoutMocFormat.test.js
 * Verification for "Jumper Without MOC/Authorized Jumper" format revision:
 *   Format: "ID", PLC "PLC", "Category" - Description
 *   Without row numbering (no "1.", "2.", etc.)
 *   Without Area label
 */

"use strict";

import { renderSlidePreview } from "../preview/slidePreview.js";
import { exportToPowerPoint } from "../export/pptxExporter.js";
import { createJumperRecord } from "../model/state.js";
import { AREA_IDS, CATEGORIES, AUTH_TYPE } from "../model/constants.js";

function makeRecord(overrides = {}) {
  return createJumperRecord({
    jumperId: "001",
    plc: "K2",
    areaId: AREA_IDS.KILN_CTS,
    category: CATEGORIES.AFI,
    authorizationType: AUTH_TYPE.NON_AUTHORIZED,
    description: "Kiln primary interlock sensor",
    installedDate: "2026-03-07",
    dueDate: null,
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

describe("Jumper Without MOC / Authorized Jumper format revision", () => {
  test("HTML preview formats items as: \"ID\", PLC \"PLC\", \"Category\" - Description", () => {
    const records = [
      makeRecord({
        jumperId: "001",
        plc: "K2",
        areaId: AREA_IDS.KILN_CTS,
        category: CATEGORIES.AFI,
        description: "Motor trip interlock",
      }),
      makeRecord({
        jumperId: "002",
        plc: "CMS1",
        areaId: AREA_IDS.DRYER_CM,
        category: CATEGORIES.FORCES,
        description: "Level switch bypass",
      }),
    ];
    const state = makeBaseState(records);
    const html = renderHtml(state);

    const panelMatch = html.match(/<div class="slide-remaining-panel">([\s\S]*?)<div class="slide-plc-section">/);
    expect(panelMatch).not.toBeNull();
    const panelHtml = panelMatch[1];

    // Item 1
    expect(panelHtml).toContain("001,");
    expect(panelHtml).toContain("PLC K2,");
    expect(panelHtml).toContain(CATEGORIES.AFI);
    expect(panelHtml).toContain("Motor trip interlock");

    // Item 2
    expect(panelHtml).toContain("002,");
    expect(panelHtml).toContain("PLC CMS1,");
    expect(panelHtml).toContain(CATEGORIES.FORCES);
    expect(panelHtml).toContain("Level switch bypass");

    // Check no row numbers and no area labels in panel
    expect(panelHtml).not.toContain("slide-remaining-item__no");
    expect(panelHtml).not.toContain("slide-remaining-item__area");
    expect(panelHtml).not.toContain("Kiln–CTS");
    expect(panelHtml).not.toContain("Dryer–CM");
  });

  test("HTML preview handles missing or empty description without trailing dash", () => {
    const records = [
      makeRecord({
        jumperId: "005",
        plc: "D1C",
        category: CATEGORIES.SHORTBRANCHES,
        description: "",
      }),
    ];
    const state = makeBaseState(records);
    const html = renderHtml(state);

    const panelMatch = html.match(/<div class="slide-remaining-panel">([\s\S]*?)<div class="slide-plc-section">/);
    expect(panelMatch).not.toBeNull();
    const panelHtml = panelMatch[1];

    expect(panelHtml).toContain("005,");
    expect(panelHtml).toContain("PLC D1C,");
    expect(panelHtml).toContain(CATEGORIES.SHORTBRANCHES);
    expect(panelHtml).not.toContain("slide-remaining-item__sep");
    expect(panelHtml).not.toContain("slide-remaining-item__desc");
  });

  test("HTML preview renders empty section fallback when no non-authorized records exist", () => {
    const state = makeBaseState([]);
    const html = renderHtml(state);
    expect(html).toContain("Belum ada data Jumper Non-Authorized.");
  });

  test("PPTX export renders text runs matching \"ID\", PLC \"PLC\", \"Category\" - Description", async () => {
    const records = [
      makeRecord({
        jumperId: "001",
        plc: "K2",
        areaId: AREA_IDS.KILN_CTS,
        category: CATEGORIES.AFI,
        description: "Motor trip interlock",
      }),
      makeRecord({
        jumperId: "002",
        plc: "CMS1",
        areaId: AREA_IDS.DRYER_CM,
        category: CATEGORIES.FORCES,
        description: "Level switch bypass",
      }),
    ];
    const state = makeBaseState(records);
    const { MockPptxGen, mockPptxInstance } = makeMockPptx();
    await exportToPowerPoint(state, MockPptxGen);

    const slide = mockPptxInstance.slides[0];
    const nonAuthTextItem = slide.texts.find((t) => Array.isArray(t.txt) && t.txt.some((run) => run.text === "001"));
    expect(nonAuthTextItem).toBeDefined();

    const combinedText = nonAuthTextItem.txt.map((run) => run.text).join("");
    expect(combinedText).toContain("001, PLC K2, AFI - Motor trip interlock");
    expect(combinedText).toContain("002, PLC CMS1, Forces - Level switch bypass");

    // Ensure no numbering or area
    expect(combinedText).not.toContain("1.");
    expect(combinedText).not.toContain("Kiln–CTS");
  });

  test("PPTX export handles empty description without trailing dash", async () => {
    const records = [
      makeRecord({
        jumperId: "007",
        plc: "K1",
        areaId: AREA_IDS.KILN_CTS,
        category: CATEGORIES.AFI,
        description: null,
      }),
    ];
    const state = makeBaseState(records);
    const { MockPptxGen, mockPptxInstance } = makeMockPptx();
    await exportToPowerPoint(state, MockPptxGen);

    const slide = mockPptxInstance.slides[0];
    const nonAuthTextItem = slide.texts.find((t) => Array.isArray(t.txt) && t.txt.some((run) => run.text === "007"));
    expect(nonAuthTextItem).toBeDefined();

    const combinedText = nonAuthTextItem.txt.map((run) => run.text).join("");
    expect(combinedText).toContain("007, PLC K1, AFI");
    expect(combinedText).not.toContain("007, PLC K1, AFI -");
  });

  test("PPTX export renders fallback text when no non-authorized records exist", async () => {
    const state = makeBaseState([]);
    const { MockPptxGen, mockPptxInstance } = makeMockPptx();
    await exportToPowerPoint(state, MockPptxGen);

    const slide = mockPptxInstance.slides[0];
    const fallbackText = slide.texts.find((t) => t.txt === "Tidak ada record Non-Authorized");
    expect(fallbackText).toBeDefined();
  });
});
