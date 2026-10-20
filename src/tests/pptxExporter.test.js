/**
 * pptxExporter.test.js
 * Unit dan integration tests untuk src/export/pptxExporter.js
 */

"use strict";

import { exportToPowerPoint, getOptimizedWeekLabels, SLIDE_W, SLIDE_H, MARGIN } from "../export/pptxExporter.js";
import { WEEK_40_BASELINE, createJumperRecord } from "../model/state.js";
import { AREA_IDS, CATEGORIES, AUTH_TYPE } from "../model/constants.js";
import { LOGO_VALE_BASE64, LOGO_MINDID_BASE64 } from "../export/logos.js";
import PptxGenJS from "pptxgenjs";

describe("PHASE 6.2 — PowerPoint Export & Layout Redesign (pptxExporter.js)", () => {
  let mockState;

  beforeEach(() => {
    mockState = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  });

  test("1. Ekspor berhasil dengan state valid Week-40 Baseline", async () => {
    let writtenFileArg = null;
    const mockPptxInstance = {
      layout: null,
      author: null,
      company: null,
      title: null,
      slides: [],
      addSlide() {
        const s = {
          background: null,
          shapes: [],
          texts: [],
          tables: [],
          charts: [],
          images: [],
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(txt, opts) { this.texts.push({ txt, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
          addChart(types, data, opts) { this.charts.push({ types, data, opts }); },
          addImage(opts) { this.images.push(opts); },
        };
        this.slides.push(s);
        return s;
      },
      async writeFile(opts) {
        writtenFileArg = opts;
        return "mock_success";
      },
      write: async () => Buffer.from("mock"),
    };

    class MockPptxGen {
      constructor() {
        this.ChartType = { bar: "bar", line: "line" };
        this.defineLayout = () => {};
        return Object.assign(mockPptxInstance, { ChartType: this.ChartType, defineLayout: this.defineLayout });
      }
    }

    const result = await exportToPowerPoint(mockState, MockPptxGen);
    expect(result.success).toBe(true);
    expect(result.filename).toMatch(/PPA_JUMPER_AUDIT.*_W43_2026\.pptx/);

    // Verifikasi tepat 1 slide
    expect(mockPptxInstance.slides).toHaveLength(1);
    expect(mockPptxInstance.layout).toMatch(/16_9|LAYOUT_16x9/);

    const slide = mockPptxInstance.slides[0];

    // Verifikasi 12 combo charts + 1 PLC bar chart = 13 charts native
    expect(slide.charts).toHaveLength(13);

    // Verifikasi tabel native editable (Jumper Update Table dan Remaining List)
    expect(slide.tables).toHaveLength(2);

    // Verifikasi writeFile atau write terpanggil
    expect(mockPptxInstance.slides).toHaveLength(1);
    expect(result.success).toBe(true);
  });

  test("2. Validasi Geometri & Bounds: Semua elemen berada di dalam batas slide 13.33 x 7.5", async () => {
    const mockPptxInstance = {
      slides: [],
      addSlide() {
        const s = {
          shapes: [], texts: [], tables: [], charts: [],
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(txt, opts) { this.texts.push({ txt, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
          addChart(types, data, opts) { this.charts.push({ types, data, opts }); },
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

    await exportToPowerPoint(mockState, MockPptxGen);
    const slide = mockPptxInstance.slides[0];

    // Periksa batas semua shapes (kecuali background banner x=0, y=0, w=SLIDE_W)
    for (const item of slide.shapes) {
      const o = item.opts;
      if (o.w === SLIDE_W) continue;
      expect(o.x + o.w).toBeLessThanOrEqual(SLIDE_W - MARGIN + 0.01);
      expect(o.y + o.h).toBeLessThanOrEqual(SLIDE_H - MARGIN + 0.01);
    }

    // Periksa batas semua charts
    for (const item of slide.charts) {
      const o = item.opts;
      expect(o.x + o.w).toBeLessThanOrEqual(SLIDE_W - MARGIN + 0.01);
      expect(o.y + o.h).toBeLessThanOrEqual(SLIDE_H - MARGIN + 0.01);
    }

    // Periksa batas semua tables (Jumper Update Table & Remaining List)
    for (const item of slide.tables) {
      const o = item.opts;
      expect(o.x + o.w).toBeLessThanOrEqual(SLIDE_W - MARGIN + 0.01);
      expect(o.y + o.h).toBeLessThanOrEqual(SLIDE_H - MARGIN + 0.01);
    }
  });

  test("3. getOptimizedWeekLabels: Menyaring rentang minggu secara kronologis dan ringkas", () => {
    // Kurang dari atau sama dengan 8 label: dipertahankan
    const smallSet = ["W38", "W39", "W40", "W41", "W42"];
    expect(getOptimizedWeekLabels(smallSet, 40)).toEqual(smallSet);

    // Kumpulan 52 minggu: diambil jendela 6 minggu di sekitar W40
    const fullYear = Array.from({ length: 52 }, (_, i) => `W${i + 1}`);
    const optimized = getOptimizedWeekLabels(fullYear, 40);
    expect(optimized.length).toBeLessThanOrEqual(7);
    expect(optimized).toContain("W40");
    expect(optimized[0]).toBe("W37");
  });

  test("4. Memblokir ekspor dan melempar error jika state tidak valid (misal title kosong)", async () => {
    mockState.config.title = "";

    await expect(exportToPowerPoint(mockState, PptxGenJS)).rejects.toThrow(
      /Ekspor diblokir karena terdapat/
    );
  });

  test("5. Kartu ringkasan status dihapus — Total Jumper With MOC/Authorized Jumper mengisi ruang bawah", async () => {
    const mockPptxInstance = {
      slides: [],
      addSlide() {
        const s = {
          shapes: [], texts: [], tables: [], charts: [],
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(txt, opts) { this.texts.push({ txt, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
          addChart(types, data, opts) { this.charts.push({ types, data, opts }); },
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

    await exportToPowerPoint(mockState, MockPptxGen);
    const slide = mockPptxInstance.slides[0];

    // Label kartu status lama TIDAK muncul sebagai teks slide
    const allText = slide.texts.map((t) => String(t.txt)).join(" | ");
    expect(allText).not.toMatch(/Normal \(Due Date > 30 hari\)/);
    expect(allText).not.toMatch(/Due Soon \(0–30 hari\)/);
    expect(allText).not.toMatch(/Expired \(lewat Due Date\)/);

    // Judul Total Jumper With MOC/Authorized Jumper di bawah chart grid (y = 5.10)
    const title = slide.texts.find((t) => String(t.txt) === "Total Jumper With MOC/Authorized Jumper");
    expect(title).toBeDefined();
    expect(title.opts.y).toBeCloseTo(5.10, 2);

    // Judul lama TIDAK muncul lagi (rename tabel)
    const oldTitle = slide.texts.find((t) => String(t.txt) === "Jumper Update Table");
    expect(oldTitle).toBeUndefined();

    // Tabel Jumper Update di bawah judul & mengisi ruang s.d. y+h <= 7.24
    const jumperTable = slide.tables.find(
      (tb) => tb.rows[0] && tb.rows[0][0] && tb.rows[0][0].text === "ID"
    );
    expect(jumperTable).toBeDefined();
    expect(jumperTable.opts.y).toBeCloseTo(5.28, 2);
    expect(jumperTable.opts.y + jumperTable.opts.h).toBeLessThanOrEqual(7.24 + 0.01);

    // Header kolom tetap 7 kolom: ID | PLC | Area | Category | Installed | Due Date | Status
    const headerTexts = jumperTable.rows[0].map((c) => c.text);
    expect(headerTexts).toEqual(["ID", "PLC", "Area", "Category", "Installed", "Due Date", "Status"]);
  });

  test("6. PHASE 3.1: PPTX memisahkan tabel Authorized vs Non-Authorized secara eksak", async () => {
    const mockPptxInstance = {
      slides: [],
      addSlide() {
        const s = {
          shapes: [], texts: [], tables: [], charts: [],
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(txt, opts) { this.texts.push({ txt, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
          addChart(types, data, opts) { this.charts.push({ types, data, opts }); },
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

    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    state.jumperRegister = [
      createJumperRecord({
        jumperId: "001",
        plc: "D1C",
        areaId: AREA_IDS.DRYER_CM,
        category: CATEGORIES.FORCES,
        authorizationType: AUTH_TYPE.AUTHORIZED,
        description: "Test jumper 1",
        installedDate: "2026-03-07",
        dueDate: "2026-12-31",
      }),
      createJumperRecord({
        jumperId: "002",
        plc: "D2C",
        areaId: AREA_IDS.DRYER_CM,
        category: CATEGORIES.SHORTBRANCHES,
        authorizationType: AUTH_TYPE.AUTHORIZED,
        description: "Test jumper 2",
        installedDate: "2026-04-18",
        dueDate: "2026-12-31",
      }),
      createJumperRecord({
        jumperId: "003",
        plc: "K1",
        areaId: AREA_IDS.KILN_CTS,
        category: CATEGORIES.AFI,
        authorizationType: AUTH_TYPE.NON_AUTHORIZED,
        description: "Test jumper 3",
        installedDate: "2026-07-04",
        dueDate: "2026-12-31",
      }),
    ];

    await exportToPowerPoint(state, MockPptxGen);
    const slide = mockPptxInstance.slides[0];

    // 1. Authorized table (bottom left, headers: ID, PLC, Area, Category, Installed, Due Date, Status)
    const authTable = slide.tables.find(
      (tb) => tb.rows[0] && tb.rows[0][0] && tb.rows[0][0].text === "ID" && tb.rows[0][1].text === "PLC"
    );
    expect(authTable).toBeDefined();

    // Data rows in authTable (excluding header row 0)
    const authDataIds = authTable.rows.slice(1).map((r) => r[0].text);
    expect(authDataIds).toEqual(["001", "002"]);
    expect(authDataIds).not.toContain("003");

    // 2. Non-Authorized table (right column, headers: No, ID, PLC, Area, Category)
    const nonAuthTable = slide.tables.find(
      (tb) => tb.rows[0] && tb.rows[0][0] && tb.rows[0][0].text === "No" && tb.rows[0][1].text === "ID"
    );
    expect(nonAuthTable).toBeDefined();

    const nonAuthDataIds = nonAuthTable.rows.slice(1).map((r) => r[1].text);
    expect(nonAuthDataIds).toEqual(["003"]);
    expect(nonAuthDataIds).not.toContain("001");
    expect(nonAuthDataIds).not.toContain("002");

    // 3. Right column title includes exact count badge (1)
    const nonAuthTitle = slide.texts.find((t) => String(t.txt).startsWith("Jumper Without MOC/Authorized Jumper"));
    expect(nonAuthTitle).toBeDefined();
    expect(nonAuthTitle.txt).toBe("Jumper Without MOC/Authorized Jumper (1)");

    // 4. Record yang belum memiliki Authorization Type memblokir ekspor
    state.jumperRegister.push(
      createJumperRecord({
        jumperId: "004",
        plc: "K2",
        areaId: AREA_IDS.KILN_CTS,
        category: CATEGORIES.AFI,
        authorizationType: null,
        description: "Test jumper 4",
        installedDate: "2026-09-27",
      })
    );
    await expect(exportToPowerPoint(state, MockPptxGen)).rejects.toThrow(
      /Authorization Type/
    );
  });

  test("7. Konsistensi metrik PLCs With Active Jumper / Total PLCs pada PPTX", async () => {
    const mockPptxInstance = {
      slides: [],
      addSlide() {
        const s = {
          shapes: [], texts: [], tables: [], charts: [],
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(txt, opts) { this.texts.push({ txt, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
          addChart(types, data, opts) { this.charts.push({ types, data, opts }); },
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

    const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
    state.config.totalPlcInScope = 10;
    // 3 jumper: 2 pada PLC-A (1 Active, 1 Expired), 1 pada PLC-B (Expiring Soon)
    // Total PLC unik dengan jumper aktif = 2 (PLC-A dan PLC-B)
    // PLCs without active = 10 - 2 = 8
    // Percentage = (8 / 10) * 100 = 80.0%
    state.jumperRegister = [
      createJumperRecord({
        jumperId: "001",
        plc: "D1C",
        areaId: AREA_IDS.DRYER_CM,
        category: CATEGORIES.FORCES,
        authorizationType: AUTH_TYPE.AUTHORIZED,
        description: "Test jumper 1",
        installedDate: "2026-03-07",
        dueDate: "2099-12-31", // Active
      }),
      createJumperRecord({
        jumperId: "002",
        plc: "D1C",
        areaId: AREA_IDS.DRYER_CM,
        category: CATEGORIES.SHORTBRANCHES,
        authorizationType: AUTH_TYPE.AUTHORIZED,
        description: "Test jumper 2",
        installedDate: "2026-04-18",
        dueDate: "2020-01-01", // Expired — tetap dihitung aktif
      }),
      createJumperRecord({
        jumperId: "003",
        plc: "K1",
        areaId: AREA_IDS.KILN_CTS,
        category: CATEGORIES.AFI,
        authorizationType: AUTH_TYPE.NON_AUTHORIZED,
        description: "Test jumper 3",
        installedDate: "2026-05-20",
        dueDate: "2099-12-31", // Active
      }),
    ];

    await exportToPowerPoint(state, MockPptxGen);
    const slide = mockPptxInstance.slides[0];

    const plcRatioTitle = slide.texts.find((t) => t.txt === "PLCs With Active Jumper / Total PLCs");
    expect(plcRatioTitle).toBeDefined();

    // Pembilang harus 2 (plcsWithActive), total 10, persentase 80.0%
    const plcRatioValue = slide.texts.find((t) => typeof t.txt === "string" && t.txt === "2 / 10");
    expect(plcRatioValue).toBeDefined();

    const plcRatioPct = slide.texts.find((t) => typeof t.txt === "string" && t.txt === "80.0%");
    expect(plcRatioPct).toBeDefined();

    const plcRatioSubLabel = slide.texts.find((t) => t.txt === "PLCs with active jumper / Total PLCs in Scope");
    expect(plcRatioSubLabel).toBeDefined();

    const plcWithoutActiveLabel = slide.texts.find((t) => t.txt === "PLCs without active jumper");
    expect(plcWithoutActiveLabel).toBeDefined();
  });

  test("8. Logo order: MIND ID sebelum Vale pada slide PPTX", async () => {
    const mockPptxInstance8 = {
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
      async writeFile() { return "mock_success"; },
      write: async () => Buffer.from("mock"),
    };
    class MockPptxGen8 {
      constructor() {
        this.ChartType = { bar: "bar", line: "line" };
        this.defineLayout = () => {};
        return Object.assign(mockPptxInstance8, { ChartType: this.ChartType, defineLayout: this.defineLayout });
      }
    }

    await exportToPowerPoint(mockState, MockPptxGen8);
    const slide = mockPptxInstance8.slides[0];
    expect(slide.images.length).toBeGreaterThanOrEqual(2);
    const mindidImg = slide.images.find((img) => img.data && img.data.includes(LOGO_MINDID_BASE64.substring(0, 30)));
    const valeImg = slide.images.find((img) => img.data && img.data.includes(LOGO_VALE_BASE64.substring(0, 30)));
    expect(mindidImg).toBeDefined();
    expect(valeImg).toBeDefined();
    expect(mindidImg.x).toBeLessThan(valeImg.x);
  });
});
