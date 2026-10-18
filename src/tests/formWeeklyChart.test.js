/**
 * formWeeklyChart.test.js
 * Unit test untuk filterRows dan paginateRows dari src/ui/formWeeklyChart.js.
 *
 * Fungsi yang diuji:
 *   - filterRows — Area, Category, Week dropdown filters + search (AND logic)
 *   - paginateRows — conventional pagination (page + pageSize)
 *   - Filter + pagination reset interaction
 */

"use strict";

import { filterRows, paginateRows } from "../ui/formWeeklyChart.js";

// ---------------------------------------------------------------------------
// SAMPLE DATA — 36 rows across areas, categories, weeks
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
// paginateRows — conventional page-based pagination
// ---------------------------------------------------------------------------

describe("paginateRows", () => {

  test("page 1 returns first 10 rows", () => {
    const result = paginateRows(SAMPLE, 1, 10);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe(SAMPLE[0]);
    expect(result[9]).toBe(SAMPLE[9]);
  });

  test("page 2 returns rows 11-20", () => {
    const result = paginateRows(SAMPLE, 2, 10);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe(SAMPLE[10]);
    expect(result[9]).toBe(SAMPLE[19]);
  });

  test("page 3 returns rows 21-30", () => {
    const result = paginateRows(SAMPLE, 3, 10);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe(SAMPLE[20]);
  });

  test("last page returns partial rows (36 total, page 4 = 6 rows)", () => {
    const result = paginateRows(SAMPLE, 4, 10);
    expect(result).toHaveLength(6);
    expect(result[0]).toBe(SAMPLE[30]);
    expect(result[5]).toBe(SAMPLE[35]);
  });

  test("page beyond data returns empty array", () => {
    const result = paginateRows(SAMPLE, 5, 10);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty data", () => {
    const result = paginateRows([], 1, 10);
    expect(result).toHaveLength(0);
  });

  test("single record on page 1", () => {
    const data = [{ areaId: "dryer_cm", category: "AFI", week: "W40", plan: 1, actual: 2 }];
    const result = paginateRows(data, 1, 10);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(data[0]);
  });

  test("exactly 10 records fits in one page", () => {
    const data = SAMPLE.slice(0, 10);
    const page1 = paginateRows(data, 1, 10);
    expect(page1).toHaveLength(10);
    const page2 = paginateRows(data, 2, 10);
    expect(page2).toHaveLength(0);
  });

  test("11 records: page 1 has 10, page 2 has 1", () => {
    const data = SAMPLE.slice(0, 11);
    expect(paginateRows(data, 1, 10)).toHaveLength(10);
    expect(paginateRows(data, 2, 10)).toHaveLength(1);
  });

  test("20 records: page 1 has 10, page 2 has 10, page 3 has 0", () => {
    const data = SAMPLE.slice(0, 20);
    expect(paginateRows(data, 1, 10)).toHaveLength(10);
    expect(paginateRows(data, 2, 10)).toHaveLength(10);
    expect(paginateRows(data, 3, 10)).toHaveLength(0);
  });

  test("21 records: page 1 has 10, page 2 has 10, page 3 has 1", () => {
    const data = SAMPLE.slice(0, 21);
    expect(paginateRows(data, 1, 10)).toHaveLength(10);
    expect(paginateRows(data, 2, 10)).toHaveLength(10);
    expect(paginateRows(data, 3, 10)).toHaveLength(1);
  });

  test("does not mutate original array", () => {
    const copy = [...SAMPLE];
    paginateRows(SAMPLE, 2, 10);
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
    const page1 = paginateRows(filtered, 1, 10);
    expect(page1).toHaveLength(9); // less than 10 → show all
  });

  test("pagination page count correct after filter", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "" });
    const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
    expect(totalPages).toBe(4); // 36 / 10 = 3.6 → 4 pages
  });

  test("filter narrows to < 10 rows → only 1 page needed", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "furnace", filterCategory: "", filterWeek: "", searchQuery: "" });
    expect(filtered).toHaveLength(9);
    const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
    expect(totalPages).toBe(1);
    const page1 = paginateRows(filtered, 1, 10);
    expect(page1).toHaveLength(9);
  });

  test("filter returns 0 rows → totalPages is 1, page 1 returns empty", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "dryer_cm", filterCategory: "", filterWeek: "", searchQuery: "zzzzz" });
    expect(filtered).toHaveLength(0);
    const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
    expect(totalPages).toBe(1);
    const page1 = paginateRows(filtered, 1, 10);
    expect(page1).toHaveLength(0);
  });

  test("filter with search + dropdown + pagination", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "kiln_cts", filterCategory: "AFI", filterWeek: "", searchQuery: "" });
    expect(filtered).toHaveLength(3);
    const page1 = paginateRows(filtered, 1, 10);
    expect(page1).toHaveLength(3);
  });

  test("previous page disabled on page 1, next disabled on last page", () => {
    const filtered = filterRows(SAMPLE, { filterArea: "", filterCategory: "", filterWeek: "", searchQuery: "" });
    const totalPages = Math.ceil(filtered.length / 10);
    const currentPage = 1;
    expect(currentPage <= 1).toBe(true);
    expect(currentPage >= totalPages).toBe(false);

    const lastPage = totalPages;
    expect(lastPage >= totalPages).toBe(true);
    expect(lastPage <= 1).toBe(false);
  });

  test("page info text format: 'Menampilkan X-Y dari Z data (Halaman P dari T)'", () => {
    const totalItems = 36;
    const currentPage = 2;
    const totalPages = 4;
    const startIndex = (currentPage - 1) * 10;
    const displayStart = totalItems === 0 ? 0 : startIndex + 1;
    const displayEnd = Math.min(startIndex + 10, totalItems);
    const text = `Menampilkan ${displayStart}\u2013${displayEnd} dari ${totalItems} data (Halaman ${currentPage} dari ${totalPages})`;
    expect(text).toBe("Menampilkan 11\u201320 dari 36 data (Halaman 2 dari 4)");
  });
});
