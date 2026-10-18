/**
 * bugfixV111.test.js
 * Comprehensive tests for:
 * - Area Summary non-editable UI & automatic calculation
 * - Absence of obsolete discrepancy warning
 * - Safe LocalStorage migration:
 *   1. Preserves existing valid LocalStorage data
 *   2. Restores Due Date only for exact matching baseline records (001, 002, 003)
 *   3. Does NOT overwrite user-edited records
 *   4. Authorized records without valid Due Dates remain invalid (flagged by validation)
 *   5. Non-Authorized records without Due Dates remain valid
 *   6. Handles malformed JSON gracefully
 *   7. Migrates safely from legacy storage key v2 to v2_1
 */

"use strict";

import {
  WEEK_40_BASELINE,
  getState,
  resetToBaseline,
  migrateLegacyBaselineDueDates,
  loadPersistedState,
  savePersistedState,
  STORAGE_KEY_V2,
  STORAGE_KEY_V2_1,
  createJumperRecord,
} from "../model/state.js";
import { AREA_IDS, CATEGORIES, AUTH_TYPE } from "../model/constants.js";
import { validateFullState, validateJumperRecord } from "../model/validation.js";
import { calculateAreaSummariesFromWeeklyChart } from "../logic/selectors.js";
import { mountFormReportInfo, refreshAreaSummaryDisplay } from "../ui/formReportInfo.js";

function createMockElement(id = "") {
  const children = [];
  return {
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    children,
    querySelector(sel) {
      if (sel.startsWith("#")) {
        const targetId = sel.slice(1);
        if (this.id === targetId) return this;
        for (const child of this.children) {
          const res = child.querySelector(sel);
          if (res) return res;
        }
      }
      return null;
    },
    querySelectorAll(sel) {
      const results = [];
      if (sel === "input" && this.innerHTML.includes("<input")) {
        results.push(this);
      }
      for (const child of this.children) {
        results.push(...child.querySelectorAll(sel));
      }
      return results;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
  };
}

describe("BUGFIX v1.1.1 — Area Summary UI & Discrepancy Removal", () => {
  beforeEach(() => {
    resetToBaseline();
  });

  test("1. Area Summary renders non-editable metric display elements (not inputs)", () => {
    const dummyInfo = createMockElement("info");
    const dummyArea = createMockElement("area");
    mountFormReportInfo(dummyInfo, dummyArea);

    // Verify HTML output contains .area-card__metric (div) for each area
    for (const areaId of [AREA_IDS.DRYER_CM, AREA_IDS.KILN_CTS, AREA_IDS.FURNACE, AREA_IDS.CONVERTER]) {
      expect(dummyArea.innerHTML).toContain(`id="area-${areaId}"`);
      expect(dummyArea.innerHTML).toContain("area-card__metric");
    }
    // Verify no <input type="number" id="area-... is present
    expect(dummyArea.innerHTML).not.toMatch(/<input[^>]+id="area-/);
    expect(dummyArea.innerHTML).not.toContain("area-card__input");
  });

  test("2. Correct automatic calculation and display for all four areas", () => {
    const state = getState();
    const summaries = calculateAreaSummariesFromWeeklyChart(state.weeklyChartData, 40, 2026);
    expect(summaries.dryer_cm.totalActual).toBe(4);
    expect(summaries.kiln_cts.totalActual).toBe(3);
    expect(summaries.furnace.totalActual).toBe(0);
    expect(summaries.converter.totalActual).toBe(0);

    const dummyArea = createMockElement("area");
    const metricDryer = createMockElement(`area-${AREA_IDS.DRYER_CM}`);
    const metricKiln = createMockElement(`area-${AREA_IDS.KILN_CTS}`);
    const metricFurnace = createMockElement(`area-${AREA_IDS.FURNACE}`);
    const metricConverter = createMockElement(`area-${AREA_IDS.CONVERTER}`);
    dummyArea.appendChild(metricDryer);
    dummyArea.appendChild(metricKiln);
    dummyArea.appendChild(metricFurnace);
    dummyArea.appendChild(metricConverter);

    refreshAreaSummaryDisplay(dummyArea);
    expect(metricDryer.textContent).toBe("4");
    expect(metricKiln.textContent).toBe("3");
    expect(metricFurnace.textContent).toBe("0");
    expect(metricConverter.textContent).toBe("0");
  });

  test("3. No obsolete discrepancy banner or discrepancy warning elements appear", () => {
    const dummyInfo = createMockElement("info");
    const dummyArea = createMockElement("area");
    mountFormReportInfo(dummyInfo, dummyArea);

    // Verify obsolete discrepancy banner is not in HTML
    expect(dummyArea.innerHTML).not.toContain("area-discrepancy-banner");
    expect(dummyArea.innerHTML).not.toContain("Discrepancy Warning");
    expect(dummyArea.innerHTML).not.toContain("has-discrepancy");
    expect(dummyArea.innerHTML).not.toContain("area-disc-");
  });
});

describe("BUGFIX v1.1.1 — Safe LocalStorage Migration & Legacy Handling", () => {
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
    resetToBaseline();
  });

  afterAll(() => {
    delete globalThis.window;
  });

  test("4. Existing valid LocalStorage data is preserved intact", () => {
    const customState = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    customState.config.title = "Custom User Title";
    customState.jumperRegister[0].description = "User edited description";
    customState.jumperRegister[0].dueDate = "2027-01-15";

    mockStorage[STORAGE_KEY_V2_1] = JSON.stringify(customState);

    const loaded = loadPersistedState();
    expect(loaded).toBe(true);

    const currentState = getState();
    expect(currentState.config.title).toBe("Custom User Title");
    expect(currentState.jumperRegister[0].description).toBe("User edited description");
    expect(currentState.jumperRegister[0].dueDate).toBe("2027-01-15");
  });

  test("5. Legacy Authorized records with missing Due Dates matching baseline are restored", () => {
    // Simulate legacy v2 state with null Due Dates on baseline records 001, 002, 003
    const legacyState = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    legacyState.jumperRegister[0].dueDate = null;
    legacyState.jumperRegister[1].dueDate = null;
    legacyState.jumperRegister[2].dueDate = null;

    mockStorage[STORAGE_KEY_V2] = JSON.stringify(legacyState);

    const loaded = loadPersistedState();
    expect(loaded).toBe(true);

    const currentState = getState();
    expect(currentState.jumperRegister[0].dueDate).toBe("2026-10-31");
    expect(currentState.jumperRegister[1].dueDate).toBe("2026-11-15");
    expect(currentState.jumperRegister[2].dueDate).toBe("2026-12-31");

    // After migration, validateFullState should have 0 errors and 0 warnings
    const valResult = validateFullState(currentState);
    expect(valResult.valid).toBe(true);
    expect(valResult.errors).toHaveLength(0);
    expect(valResult.warnings).toHaveLength(0);

    // Migrated state should now be saved to STORAGE_KEY_V2_1
    expect(mockStorage[STORAGE_KEY_V2_1]).toBeDefined();
    // Legacy key remains intact as a safe fallback
    expect(mockStorage[STORAGE_KEY_V2]).toBeDefined();
  });

  test("6. User-edited records are NOT overwritten by migration", () => {
    // Record 001 was edited by user (different PLC, different installedDate, or custom description) with null dueDate
    const legacyRecords = [
      {
        jumperId: "001",
        plc: "PLC_CUSTOM_99", // edited
        areaId: "dryer_cm",
        category: "Shortbranches",
        description: "Custom user description", // edited
        equipmentTag: null,
        installedDate: "2026-01-01", // edited
        dueDate: null,
        authorizationType: AUTH_TYPE.AUTHORIZED,
      },
      {
        jumperId: "999", // user-created record
        plc: "D3C",
        areaId: "dryer_cm",
        category: "Shortbranches",
        description: "User jumper 999",
        equipmentTag: null,
        installedDate: "2026-05-01",
        dueDate: null,
        authorizationType: AUTH_TYPE.AUTHORIZED,
      },
    ];

    const migrated = migrateLegacyBaselineDueDates(legacyRecords);
    // Neither should have their null dueDate overwritten!
    expect(migrated[0].dueDate).toBeNull();
    expect(migrated[1].dueDate).toBeNull();
  });

  test("7. Authorized records without valid Due Dates remain invalid in validation", () => {
    const invalidRecord = createJumperRecord({
      jumperId: "999",
      plc: "D3C",
      areaId: AREA_IDS.DRYER_CM,
      category: CATEGORIES.FORCES,
      authorizationType: AUTH_TYPE.AUTHORIZED,
      description: "User created jumper with missing due date",
      installedDate: "2026-05-01",
      dueDate: null,
    });
    const result = validateJumperRecord(invalidRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Due Date wajib diisi untuk Authorized Jumper"))).toBe(true);
  });

  test("8. Non-Authorized records without Due Dates remain valid", () => {
    const validNonAuth = createJumperRecord({
      jumperId: "004",
      plc: "K2",
      areaId: AREA_IDS.KILN_CTS,
      category: CATEGORIES.AFI,
      authorizationType: AUTH_TYPE.NON_AUTHORIZED,
      description: "Non-Authorized without due date",
      installedDate: "2026-09-27",
      dueDate: null,
    });
    const result = validateJumperRecord(validNonAuth);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("9. Malformed persisted JSON is handled gracefully without data destruction", () => {
    delete mockStorage[STORAGE_KEY_V2_1];
    mockStorage[STORAGE_KEY_V2] = "INVALID_JSON{[[{";

    const loaded = loadPersistedState();
    expect(loaded).toBe(false);

    // Stored string was NOT destroyed or overwritten
    expect(mockStorage[STORAGE_KEY_V2]).toBe("INVALID_JSON{[[{");
  });
});
