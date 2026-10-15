/**
 * formWeeklyChart.test.js
 * Unit test untuk filterRows dan paginateRows dari src/ui/formWeeklyChart.js.
 *
 * Fungsi yang diuji:
 *   - filterRows — Area, Category, Week dropdown filters + search (AND logic)
 *   - paginateRows — batch 10, See More incremental
 *   - Filter + pagination reset interaction
 */

"use strict";

import { filterRows, paginateRows } from "../ui/formWeeklyChart.js";

// ---------------------------------------------------------------------------
// SAMPLE DATA — 25 rows across areas, categories, weeks
// ---------------------------------------------------------------------------

function makeSampleData() {
  const areas = ["dryer_cm", "kiln_cts", "furnace", "converter"];
  const categories = ["Shortbranches", "Forces", "AFI"];
  const weeks = ["W38", "W39", "W40"];
  const rows = [];
  let plan = 1;
  for (const areaId of areas) {
    for (const category of categories) {
      for (const week of weeks) {
        rows.push({ areaId, category, week, plan: plan++, actual: plan });
      }
    }
  }
  // 4 * 3 * 3 = 36 rows
  return rows;
}

const SAMPLE = makeSampleData();

// ---------------------------------------------------------------------------
// filterRows
// ---------------------------------------------------------------------------

describe("filterRows", () => {

  test("returns all rows when no filters active", () => {
    const result = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "" });
    expect(result).toHaveLength(SAMPLE.length);
  });

  test("filters by Area only", () => {
    const result = filterRows(SAMPLE, { filterArea: "dryer_cm", filterCategory: "", filterWeek: "", searchQuery: "" });
    expect(result.every((r) => r.areaId === "dryer_cm")).toBe(true);
    expect(result).toHaveLength(9); // 3 categories * 3 weeks
  });

  test("filters by Category only", () => {
    const result = filterRows(SAMPLE, { filterArea: "", filterCategory: "AFI", filterWeek: "", searchQuery: "" });
    expect(result.every((r) => r.category === "AFI")).toBe(true);
    expect(result).toHaveLength(12); // 4 areas * 3 weeks
  });

  test("filters by Week only", () => {
    const result = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "W40", searchQuery: "" });
    expect(result.every((r) => r.week === "W40")).toBe(true);
    expect(result).toHaveLength(12); // 4 areas * 3 categories
  });

  test("combines Area + Category filters (AND logic)", () => {
    const result = filterRows(SAMPLE, { filterArea: "kiln_cts", filterCategory: "Forces", filterWeek: "", searchQuery: "" });
    expect(result.every((r) => r.areaId === "kiln_cts" && r.category === "Forces")).toBe(true);
    expect(result).toHaveLength(3); // 3 weeks
  });

  test("combines all three dropdown filters (AND logic)", () => {
    const result = filterRows(SAMPLE, { filterArea: "furnace", filterCategory: "Shortbranches", filterWeek: "W39", searchQuery: "" });
    expect(result).toHaveLength(1);
    expect(result[0].areaId).toBe("furnace");
    expect(result[0].category).toBe("Shortbranches");
    expect(result[0].week).toBe("W39");
  });

  test("search by area label (case-insensitive)", () => {
    const result = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "kiln" });
    expect(result.every((r) => r.areaId === "kiln_cts")).toBe(true);
    expect(result).toHaveLength(9);
  });

  test("search by category name", () => {
    const result = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "forces" });
    expect(result.every((r) => r.category === "Forces")).toBe(true);
  });

  test("search by week label", () => {
    const result = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "w38" });
    expect(result.every((r) => r.week === "W38")).toBe(true);
  });

  test("search by Plan value", () => {
    const target = SAMPLE[0];
    const result = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: String(target.plan) });
    expect(result.some((r) => r.plan === target.plan)).toBe(true);
  });

  test("search combined with dropdown filter (AND)", () => {
    const result = filterRows(SAMPLE, { filterArea: "dryer_cm", filterCategory: "", filterWeek: "", searchQuery: "AFI" });
    expect(result.every((r) => r.areaId === "dryer_cm" && r.category === "AFI")).toBe(true);
    expect(result).toHaveLength(3);
  });

  test("returns empty array when filters match nothing", () => {
    const result = filterRows(SAMPLE, { filterArea: "dryer_cm", filterCategory: "", filterWeek: "", searchQuery: "zzzzz" });
    expect(result).toHaveLength(0);
  });

  test("does not mutate original data", () => {
    const copy = [...SAMPLE];
    filterRows(SAMPLE, { filterArea: "dryer_cm", filterCategory: "AFI", filterWeek: "W38", searchQuery: "" });
    expect(SAMPLE).toEqual(copy);
    expect(SAMPLE).toHaveLength(copy.length);
  });

  test("handles rows with null plan/actual gracefully in search", () => {
    const data = [
      { areaId: "dryer_cm", category: "AFI", week: "W40", plan: null, actual: null },
      { areaId: "dryer_cm", category: "AFI", week: "W41", plan: 5, actual: 3 },
    ];
    const result = filterRows(data, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "5" });
    expect(result).toHaveLength(1);
    expect(result[0].plan).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// paginateRows
// ---------------------------------------------------------------------------

describe("paginateRows", () => {

  test("returns first 10 rows when limit is 10", () => {
    const result = paginateRows(SAMPLE, 10);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe(SAMPLE[0]);
    expect(result[9]).toBe(SAMPLE[9]);
  });

  test("returns all rows when limit exceeds data length", () => {
    const result = paginateRows(SAMPLE, 100);
    expect(result).toHaveLength(SAMPLE.length);
  });

  test("returns empty array for empty data", () => {
    const result = paginateRows([], 10);
    expect(result).toHaveLength(0);
  });

  test("incremental reveal: limit 10 then 20", () => {
    const batch1 = paginateRows(SAMPLE, 10);
    const batch2 = paginateRows(SAMPLE, 20);
    expect(batch1).toHaveLength(10);
    expect(batch2).toHaveLength(20);
    expect(batch2.slice(0, 10)).toEqual(batch1);
  });

  test("See More reveals remaining: limit 30 shows all 36 rows from sample", () => {
    const batch3 = paginateRows(SAMPLE, 30);
    expect(batch3).toHaveLength(30);
    const batchAll = paginateRows(SAMPLE, 40);
    expect(batchAll).toHaveLength(SAMPLE.length); // 36
  });

  test("does not mutate original array", () => {
    const copy = [...SAMPLE];
    paginateRows(SAMPLE, 5);
    expect(SAMPLE).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// Filter + Pagination integration
// ---------------------------------------------------------------------------

describe("filterRows + paginateRows integration", () => {

  test("filter first, then paginate — correct count", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "dryer_cm", filterCategory: "", filterWeek: "", searchQuery: "" });
    expect(filtered).toHaveLength(9);
    const page1 = paginateRows(filtered, 10);
    expect(page1).toHaveLength(9); // less than 10 → show all
  });

  test("pagination resets conceptually when filter changes", () => {
    // Simulate: user had visibleLimit=20, then changes filter → limit should reset to 10
    const allFiltered = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "" });
    const expandedPage = paginateRows(allFiltered, 20);
    expect(expandedPage).toHaveLength(20);

    // After filter change, conceptual reset to 10
    const narrowFiltered = filterRows(SAMPLE, { filterArea: "furnace", filterCategory: "", filterWeek: "", searchQuery: "" });
    const resetPage = paginateRows(narrowFiltered, 10);
    expect(resetPage).toHaveLength(9); // furnace has 9 rows → all fit in first 10
  });

  test("filter with search + dropdown + pagination", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "kiln_cts", filterCategory: "AFI", filterWeek: "", searchQuery: "" });
    expect(filtered).toHaveLength(3);
    const page1 = paginateRows(filtered, 10);
    expect(page1).toHaveLength(3);
  });

  test("hasMore flag logic: filtered.length > visibleLimit", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "" });
    const limit = 10;
    const hasMore = filtered.length > limit;
    expect(hasMore).toBe(true);

    const limit2 = 40;
    const hasMore2 = filtered.length > limit2;
    expect(hasMore2).toBe(false);
  });
});
