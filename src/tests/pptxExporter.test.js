/**
 * pptxExporter.test.js
 * Unit dan integration tests untuk src/export/pptxExporter.js
 */

"use strict";

import { exportToPowerPoint, getOptimizedWeekLabels, SLIDE_W, SLIDE_H, MARGIN } from "../export/pptxExporter.js";
import { WEEK_40_BASELINE } from "../model/state.js";
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
          addShape(type, opts) { this.shapes.push({ type, opts }); },
          addText(txt, opts) { this.texts.push({ txt, opts }); },
          addTable(rows, opts) { this.tables.push({ rows, opts }); },
          addChart(types, data, opts) { this.charts.push({ types, data, opts }); },
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
    expect(result.filename).toMatch(/PPA_JUMPER_AUDIT.*_W40_2026\.pptx/);

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

  test("5. Kartu ringkasan status dihapus — Jumper Update Table mengisi ruang bawah", async () => {
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

    // Judul Jumper Update Table di bawah chart grid (y = 5.10)
    const title = slide.texts.find((t) => String(t.txt) === "Jumper Update Table");
    expect(title).toBeDefined();
    expect(title.opts.y).toBeCloseTo(5.10, 2);

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
});
