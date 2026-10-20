/**
 * totalRemoveJumper.test.js
 * Unit and integration tests for Total Remove Jumper feature:
 *  1. Report Setup field renders & validation rules (integer >= 0, rejects empty/negative/decimal/NaN).
 *  2. State management, migration for legacy localStorage states, and persistence.
 *  3. HTML Slide Preview renders 3-column KPI card with Total Remove Jumper.
 *  4. PPTX Export includes 3-column KPI card with native elements on a single 16:9 slide.
 *  5. PDF Export succeeds on a single 16:9 slide and blocks when invalid.
 *  6. Existing active-jumper KPI calculations remain unchanged.
 */

"use strict";

import {
  WEEK_40_BASELINE,
  getState,
  resetToBaseline,
  createInitialState,
  loadPersistedState,
  updateConfig,
  STORAGE_KEY_V2_1,
  STORAGE_KEY_V2,
  isObsoleteLegacyDataset,
} from "../model/state.js";
import { validateConfig, validateFullState } from "../model/validation.js";
import { renderSlidePreview } from "../preview/slidePreview.js";
import { exportToPowerPoint } from "../export/pptxExporter.js";
import { exportToPdf, getPdfFilename } from "../export/pdfExporter.js";
import { plcsWithoutActiveJumpers } from "../logic/selectors.js";
import { mountFormReportInfo } from "../ui/formReportInfo.js";

describe("Total Remove Jumper — Data Model & Validation", () => {
  beforeEach(() => {
    resetToBaseline();
  });

  test("1a. WEEK_40_BASELINE config includes totalRemoveJumper with default 0", () => {
    expect(WEEK_40_BASELINE.config.totalRemoveJumper).toBe(0);
  });

  test("1b. createInitialState initializes totalRemoveJumper to 0", () => {
    const state = createInitialState();
    expect(state.config.totalRemoveJumper).toBe(0);
  });

  test("1c. Valid non-negative integers pass validation", () => {
    const validValues = [0, 1, 5, 42, 100];
    for (const val of validValues) {
      const result = validateConfig({
        title: "Test Report",
        reportingYear: 2026,
        reportingWeek: "W43",
        totalPlcInScope: 63,
        totalRemoveJumper: val,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  test("1d. Missing or empty totalRemoveJumper is rejected", () => {
    for (const val of [null, undefined, ""]) {
      const result = validateConfig({
        title: "Test Report",
        reportingYear: 2026,
        reportingWeek: "W43",
        totalPlcInScope: 63,
        totalRemoveJumper: val,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Total Remove Jumper wajib diisi.");
    }
  });

  test("1e. Negative totalRemoveJumper is rejected", () => {
    const result = validateConfig({
      title: "Test Report",
      reportingYear: 2026,
      reportingWeek: "W43",
      totalPlcInScope: 63,
      totalRemoveJumper: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Total Remove Jumper harus berupa bilangan bulat non-negatif (>= 0)."
    );
  });

  test("1f. Decimal totalRemoveJumper is rejected", () => {
    const result = validateConfig({
      title: "Test Report",
      reportingYear: 2026,
      reportingWeek: "W43",
      totalPlcInScope: 63,
      totalRemoveJumper: 3.5,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Total Remove Jumper harus berupa bilangan bulat non-negatif (>= 0)."
    );
  });

  test("1g. Non-numeric totalRemoveJumper is rejected", () => {
    for (const val of ["five", NaN, true, {}]) {
      const result = validateConfig({
        title: "Test Report",
        reportingYear: 2026,
        reportingWeek: "W43",
        totalPlcInScope: 63,
        totalRemoveJumper: val,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Total Remove Jumper harus berupa bilangan bulat non-negatif (>= 0)."
      );
    }
  });
});

describe("Total Remove Jumper — State, Persistence, & Migration", () => {
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

  test("2a. Legacy state without totalRemoveJumper migrates safely to default 0", () => {
    const legacyState = {
      config: {
        title: "Legacy Report",
        reportingYear: 2026,
        reportingWeek: 40,
        totalPlcInScope: 63,
      },
      weeklyChartData: [],
      jumperRegister: [],
      areaSummary: [],
    };
    mockStorage[STORAGE_KEY_V2_1] = JSON.stringify(legacyState);

    const loaded = loadPersistedState();
    expect(loaded).toBe(true);

    const state = getState();
    expect(state.config.title).toBe("Legacy Report");
    expect(state.config.totalRemoveJumper).toBe(0);
  });

  test("2b. Existing user-entered totalRemoveJumper is preserved on reload", () => {
    const userState = {
      config: {
        title: "User Report",
        reportingYear: 2026,
        reportingWeek: "W43",
        totalPlcInScope: 63,
        totalRemoveJumper: 14,
      },
      weeklyChartData: [],
      jumperRegister: [],
      areaSummary: [],
    };
    mockStorage[STORAGE_KEY_V2_1] = JSON.stringify(userState);

    const loaded = loadPersistedState();
    expect(loaded).toBe(true);

    const state = getState();
    expect(state.config.totalRemoveJumper).toBe(14);
  });

  test("2c. updateConfig correctly updates totalRemoveJumper", () => {
    resetToBaseline();
    updateConfig({ totalRemoveJumper: 7 });
    expect(getState().config.totalRemoveJumper).toBe(7);
  });

  test("2d. resetToBaseline resets totalRemoveJumper to baseline default (0)", () => {
    updateConfig({ totalRemoveJumper: 25 });
    expect(getState().config.totalRemoveJumper).toBe(25);

    resetToBaseline();
    expect(getState().config.totalRemoveJumper).toBe(0);
  });

  test("2e. Obsolete legacy state (36 chart rows, 11 jumpers, title W40, week W40, scope 69) is upgraded to reference dataset", () => {
    const obsoleteState = {
      config: {
        title: "PPA JUMPER AUDIT WEEK-40",
        plantArea: "Process Plant Area",
        reportingYear: 2026,
        reportingWeek: 40,
        totalPlcInScope: 69,
        totalRemoveJumper: 0,
      },
      weeklyChartData: Array.from({ length: 36 }, (_, i) => ({
        areaId: "dryer_cm",
        category: "Shortbranches",
        week: i < 12 ? "W38" : i < 24 ? "W39" : "W40",
        plan: 2,
        actual: 2,
      })),
      jumperRegister: Array.from({ length: 11 }, (_, i) => ({
        jumperId: String(i + 1).padStart(3, "0"),
        plc: "D3C",
        areaId: "dryer_cm",
        category: "Shortbranches",
      })),
      areaSummary: [
        { areaId: "dryer_cm", jumperCount: 4 },
        { areaId: "kiln_cts", jumperCount: 3 },
        { areaId: "furnace", jumperCount: 0 },
        { areaId: "converter", jumperCount: 0 },
      ],
    };

    expect(isObsoleteLegacyDataset(obsoleteState)).toBe(true);

    mockStorage[STORAGE_KEY_V2_1] = JSON.stringify(obsoleteState);
    mockStorage[STORAGE_KEY_V2] = JSON.stringify(obsoleteState);

    const loaded = loadPersistedState();
    expect(loaded).toBe(true);

    const state = getState();
    // Upgraded to target reference dataset
    expect(state.config.title).toBe("PPA JUMPER AUDIT WEEK");
    expect(state.config.reportingYear).toBe(2026);
    expect(state.config.reportingWeek).toBe("W43");
    expect(state.config.totalPlcInScope).toBe(63);
    expect(state.config.totalRemoveJumper).toBe(0);

    expect(state.weeklyChartData).toHaveLength(60);
    expect(state.jumperRegister).toHaveLength(6);
    expect(state.areaSummary).toEqual([
      { areaId: "dryer_cm", jumperCount: 3 },
      { areaId: "kiln_cts", jumperCount: 3 },
      { areaId: "furnace", jumperCount: 0 },
      { areaId: "converter", jumperCount: 0 },
    ]);

    // Legacy storage key cleaned up
    expect(mockStorage[STORAGE_KEY_V2]).toBeUndefined();
  });

  test("2f. Preserves user-entered valid totalRemoveJumper when upgrading obsolete legacy state", () => {
    const obsoleteStateWithKpi = {
      config: {
        title: "PPA JUMPER AUDIT WEEK-40",
        plantArea: "Process Plant Area",
        reportingYear: 2026,
        reportingWeek: "W40",
        totalPlcInScope: 69,
        totalRemoveJumper: 8,
      },
      weeklyChartData: Array.from({ length: 36 }, (_, i) => ({
        areaId: "dryer_cm",
        category: "Shortbranches",
        week: "W38",
        plan: 1,
        actual: 1,
      })),
      jumperRegister: Array.from({ length: 11 }, (_, i) => ({
        jumperId: String(i + 1).padStart(3, "0"),
        plc: "K2",
      })),
      areaSummary: [],
    };

    mockStorage[STORAGE_KEY_V2_1] = JSON.stringify(obsoleteStateWithKpi);

    const loaded = loadPersistedState();
    expect(loaded).toBe(true);

    const state = getState();
    expect(state.config.title).toBe("PPA JUMPER AUDIT WEEK");
    expect(state.config.reportingWeek).toBe("W43");
    expect(state.config.totalPlcInScope).toBe(63);
    expect(state.config.totalRemoveJumper).toBe(8); // preserved!
    expect(state.weeklyChartData).toHaveLength(60);
    expect(state.jumperRegister).toHaveLength(6);
  });

  test("2g. Explicit resetToBaseline replaces dataset with reference dataset and removes legacy storage key", () => {
    mockStorage[STORAGE_KEY_V2] = JSON.stringify({ dummy: true });
    updateConfig({ title: "Custom Modified", totalRemoveJumper: 19 });

    resetToBaseline();

    const state = getState();
    expect(state.config.title).toBe("PPA JUMPER AUDIT WEEK");
    expect(state.config.reportingYear).toBe(2026);
    expect(state.config.reportingWeek).toBe("W43");
    expect(state.config.totalPlcInScope).toBe(63);
    expect(state.config.totalRemoveJumper).toBe(0);
    expect(state.weeklyChartData).toHaveLength(60);
    expect(state.jumperRegister).toHaveLength(6);
    expect(mockStorage[STORAGE_KEY_V2]).toBeUndefined();
  });
});

describe("Total Remove Jumper — Form Report Info UI", () => {
  function createMockElement(id) {
    const children = [];
    return {
      id,
      innerHTML: "",
      value: "",
      textContent: "",
      style: {},
      options: [],
      selectedOptions: [],
      appendChild(child) { children.push(child); return child; },
      querySelector(selector) {
        if (selector === `#${id}` || selector.includes(id)) return this;
        return children.find(c => c.id && selector.includes(c.id)) || null;
      },
      querySelectorAll() { return []; },
      addEventListener() {},
    };
  }

  test("3a. mountFormReportInfo renders Total Remove Jumper input element", () => {
    const dummyInfo = createMockElement("section-report-info");
    const dummyArea = createMockElement("section-area-summary");
    mountFormReportInfo(dummyInfo, dummyArea);

    expect(dummyInfo.innerHTML).toContain('id="ri-total-remove"');
    expect(dummyInfo.innerHTML).toContain("Total Remove Jumper");
    expect(dummyInfo.innerHTML).toContain('min="0"');
    expect(dummyInfo.innerHTML).toContain('step="1"');
  });
});

describe("Total Remove Jumper — Slide Preview & KPI Visual Hierarchy", () => {
  beforeEach(() => {
    resetToBaseline();
  });

  test("4a. Slide Preview HTML contains 3 KPI columns including Total Remove Jumper", () => {
    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    state.config.totalRemoveJumper = 5;

    const dummyContainer = { innerHTML: "" };
    renderSlidePreview(dummyContainer, state);

    const html = dummyContainer.innerHTML;
    // Kolom 1
    expect(html).toContain("2 / 63");
    expect(html).toContain("PLCs with active jumper / Total PLCs in Scope");

    // Kolom 2
    expect(html).toContain("96.8%");
    expect(html).toContain("PLCs without active jumper");

    // Kolom 3
    expect(html).toContain("slide-plc-kpi-remove");
    expect(html).toContain(">5<");
    expect(html).toContain("Total Remove Jumper");
  });

  test("4b. Active-jumper KPI calculation is NOT altered by totalRemoveJumper", () => {
    const baselineMetric = plcsWithoutActiveJumpers(
      WEEK_40_BASELINE.jumperRegister,
      63,
      new Date("2026-10-09T00:00:00Z")
    );

    // Total Remove Jumper = 99
    updateConfig({ totalRemoveJumper: 99 });
    const afterMetric = plcsWithoutActiveJumpers(
      getState().jumperRegister,
      getState().config.totalPlcInScope,
      new Date("2026-10-09T00:00:00Z")
    );

    expect(afterMetric.plcsWithActive).toBe(baselineMetric.plcsWithActive);
    expect(afterMetric.plcsWithoutActive).toBe(baselineMetric.plcsWithoutActive);
    expect(afterMetric.percentage).toBe(baselineMetric.percentage);
  });
});

describe("Total Remove Jumper — PPTX & PDF Export", () => {
  let mockPptxInstance;

  beforeEach(() => {
    resetToBaseline();
    mockPptxInstance = {
      layout: null,
      slides: [],
      addSlide() {
        const slide = {
          shapes: [],
          texts: [],
          charts: [],
          tables: [],
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(text, opts) { this.texts.push({ text, opts }); },
          addChart(type, data, opts) { this.charts.push({ type, data, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
        };
        this.slides.push(slide);
        return slide;
      },
      write: async () => Buffer.from("mock"),
    };
  });

  test("5a. PPTX export generates single 16:9 slide with Total Remove Jumper KPI column", async () => {
    class MockPptxGen {
      constructor() {
        this.ChartType = { bar: "bar", line: "line" };
        this.defineLayout = () => {};
        return Object.assign(mockPptxInstance, { ChartType: this.ChartType, defineLayout: this.defineLayout });
      }
    }

    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    state.config.totalRemoveJumper = 8;

    const result = await exportToPowerPoint(state, MockPptxGen);
    expect(result.success).toBe(true);
    expect(mockPptxInstance.slides).toHaveLength(1);
    expect(mockPptxInstance.layout).toMatch(/16_9|LAYOUT_16x9/);

    const slide = mockPptxInstance.slides[0];
    const textValues = slide.texts.map((t) => t.text);

    // Verify all 3 KPI elements are present
    expect(textValues).toContain("2 / 63");
    expect(textValues).toContain("PLCs with active jumper / Total PLCs in Scope");
    expect(textValues).toContain("96.8%");
    expect(textValues).toContain("PLCs without active jumper");
    expect(textValues).toContain("Total Remove Jumper");
    expect(textValues).toContain("8");
  });

  test("5b. PDF export succeeds with valid totalRemoveJumper on 16:9 format", async () => {
    const mockCanvas = {
      width: 1920,
      height: 1080,
      toDataURL: () => "data:image/png;base64,mock",
    };
    class MockJsPdf {
      constructor(opts) {
        this.opts = opts;
        this.pages = [1];
      }
      addImage() {}
      save() {}
    }

    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    state.config.totalRemoveJumper = 3;

    const result = await exportToPdf(state, {
      canvas: mockCanvas,
      jsPDF: MockJsPdf,
      save: false,
    });

    expect(result.success).toBe(true);
    expect(result.pdf.opts).toEqual({
      orientation: "landscape",
      unit: "pt",
      format: [960, 540],
    });
  });

  test("5c. PDF export throws error when totalRemoveJumper is invalid", async () => {
    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    state.config.totalRemoveJumper = -5;

    await expect(exportToPdf(state)).rejects.toThrow(/Total Remove Jumper/);
  });
});
