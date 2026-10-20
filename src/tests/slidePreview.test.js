/**
 * slidePreview.test.js
 * Test untuk fungsi presentasi dan integrasi di slidePreview.js dan chartRenderer.js
 * yang TIDAK bergantung pada DOM atau Chart.js (dapat dijalankan di Node.js).
 *
 * Fungsi yang diuji:
 *   - canvasId() — ID canvas konsisten untuk 12 sel grafik
 *   - Kalkulasi terpusat yang dipanggil slidePreview (_computeAll via selectors)
 *   - Integrasi: verifikasi semua 12 kombinasi area×category tercakup
 *
 * Fungsi yang TIDAK dapat diuji di Node.js (didokumentasikan sebagai manual test):
 *   - renderSlidePreview() — butuh DOM + Chart.js
 *   - renderAllCharts() — butuh HTMLCanvasElement
 *   - destroyAllCharts() — butuh Chart.js instances
 */

"use strict";

import { canvasId, CATEGORY_COLORS, ACTUAL_COLOR } from "../preview/chartRenderer.js";
import { renderSlidePreview } from "../preview/slidePreview.js";
import {
  AREA_IDS,
  AREA_ID_LIST,
  AREA_LABELS,
  CATEGORIES,
  CATEGORY_LIST,
  CHART_MATRIX,
  JUMPER_STATUS,
  EXPIRING_SOON_MAX_DAYS,
  AUTH_TYPE,
} from "../model/constants.js";
import {
  plcsWithoutActiveJumpers,
  jumperCountPerPlc,
} from "../logic/selectors.js";
import { getAllChartSeries, getChartKey } from "../logic/chartData.js";
import { createJumperRecord } from "../model/state.js";

// ---------------------------------------------------------------------------
// HELPER
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

// ---------------------------------------------------------------------------
// TEST: canvasId()
// ---------------------------------------------------------------------------

describe("canvasId — ID canvas konsisten untuk 12 sel grafik", () => {

  test("menghasilkan string non-kosong untuk setiap kombinasi valid", () => {
    for (const areaId of AREA_ID_LIST) {
      for (const category of CATEGORY_LIST) {
        const id = canvasId(areaId, category);
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });

  test("format: dimulai dengan 'chart-'", () => {
    expect(canvasId(AREA_IDS.DRYER_CM, CATEGORIES.AFI)).toMatch(/^chart-/);
  });

  test("menghasilkan ID unik untuk semua 12 kombinasi", () => {
    const ids = new Set();
    for (const { areaId, category } of CHART_MATRIX) {
      ids.add(canvasId(areaId, category));
    }
    expect(ids.size).toBe(12);
  });

  test("tidak mengandung karakter berbahaya HTML/URL", () => {
    for (const { areaId, category } of CHART_MATRIX) {
      const id = canvasId(areaId, category);
      expect(id).not.toMatch(/[<>"'&\s]/);
    }
  });

  test("konsisten — panggilan berulang menghasilkan ID sama", () => {
    const id1 = canvasId(AREA_IDS.FURNACE, CATEGORIES.FORCES);
    const id2 = canvasId(AREA_IDS.FURNACE, CATEGORIES.FORCES);
    expect(id1).toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// TEST: CATEGORY_COLORS — Revisi Palet Warna Kategori
// ---------------------------------------------------------------------------

describe("CATEGORY_COLORS — Palet warna kategori konsisten pada seluruh 4 area (Excel Reference)", () => {
  test("memiliki tema untuk Shortbranches, Forces, dan AFI", () => {
    expect(CATEGORY_COLORS).toHaveProperty(CATEGORIES.SHORTBRANCHES);
    expect(CATEGORY_COLORS).toHaveProperty(CATEGORIES.FORCES);
    expect(CATEGORY_COLORS).toHaveProperty(CATEGORIES.AFI);
  });

  test("AFI menggunakan warna dasar #00B0F0 (cyan/biru) untuk Plan", () => {
    expect(CATEGORY_COLORS[CATEGORIES.AFI].base).toBe("#00B0F0");
    expect(CATEGORY_COLORS[CATEGORIES.AFI].actual).toBe(ACTUAL_COLOR);
  });

  test("Shortbranches menggunakan warna dasar #BFBFBF (abu-abu) untuk Plan", () => {
    expect(CATEGORY_COLORS[CATEGORIES.SHORTBRANCHES].base).toBe("#BFBFBF");
    expect(CATEGORY_COLORS[CATEGORIES.SHORTBRANCHES].actual).toBe(ACTUAL_COLOR);
  });

  test("Forces menggunakan warna dasar #008577 (teal/hijau) untuk Plan", () => {
    expect(CATEGORY_COLORS[CATEGORIES.FORCES].base).toBe("#008577");
    expect(CATEGORY_COLORS[CATEGORIES.FORCES].actual).toBe(ACTUAL_COLOR);
  });

  test("Actual konsisten menggunakan warna ungu #A52A98 untuk semua kategori", () => {
    expect(ACTUAL_COLOR).toBe("#A52A98");
    expect(CATEGORY_COLORS[CATEGORIES.AFI].actual).toBe("#A52A98");
    expect(CATEGORY_COLORS[CATEGORIES.SHORTBRANCHES].actual).toBe("#A52A98");
    expect(CATEGORY_COLORS[CATEGORIES.FORCES].actual).toBe("#A52A98");
  });

  test("setiap kategori Plan memiliki warna berbeda sehingga mudah dibedakan secara visual", () => {
    const colors = [
      CATEGORY_COLORS[CATEGORIES.AFI].base,
      CATEGORY_COLORS[CATEGORIES.SHORTBRANCHES].base,
      CATEGORY_COLORS[CATEGORIES.FORCES].base,
    ];
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// TEST: CHART_MATRIX coverage — 12 kombinasi
// ---------------------------------------------------------------------------

describe("CHART_MATRIX — 12 kombinasi area × category", () => {

  test("CHART_MATRIX berisi tepat 12 item", () => {
    expect(CHART_MATRIX.length).toBe(12);
  });

  test("setiap area muncul tepat 3 kali (satu per category)", () => {
    for (const areaId of AREA_ID_LIST) {
      const count = CHART_MATRIX.filter((m) => m.areaId === areaId).length;
      expect(count).toBe(3);
    }
  });

  test("setiap category muncul tepat 4 kali (satu per area)", () => {
    for (const category of CATEGORY_LIST) {
      const count = CHART_MATRIX.filter((m) => m.category === category).length;
      expect(count).toBe(4);
    }
  });

  test("getAllChartSeries menghasilkan map dengan 12 key sesuai CHART_MATRIX", () => {
    const series = getAllChartSeries([], ["W40"]);
    expect(series.size).toBe(12);
    for (const { areaId, category } of CHART_MATRIX) {
      expect(series.has(getChartKey(areaId, category))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// TEST: Integrasi kalkulasi preview — simulasi _computeAll
// ---------------------------------------------------------------------------

describe("Integrasi kalkulasi preview (tanpa DOM)", () => {

  // ── PLCs Without Active Jumpers (metric terbalik) ──
  test("plcsWithoutActiveJumpers ok:false jika totalPlcInScope null", () => {
    const result = plcsWithoutActiveJumpers([], null);
    expect(result.ok).toBe(false);
    expect(result.percentage).toBeNull();
  });

  test("plcsWithoutActiveJumpers benar: 2 PLC aktif unik dari 10 = 80% tanpa jumper", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2026-12-31" }), // Active (> 7 days)
      makeRecord({ jumperId: "002", plc: "PLC-B", dueDate: "2026-12-31" }), // Active
      makeRecord({ jumperId: "003", plc: "PLC-A", dueDate: "2026-12-31" }), // duplicate PLC-A
    ];
    const result = plcsWithoutActiveJumpers(records, 10, new Date(2026, 5, 15));
    expect(result.ok).toBe(true);
    expect(result.plcsWithActive).toBe(2);
    expect(result.plcsWithoutActive).toBe(8);
    expect(result.percentage).toBeCloseTo(80);
  });

  test("plcsWithoutActiveJumpers: Expired record tetap dihitung sebagai aktif", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2020-01-01" }), // Expired
    ];
    const result = plcsWithoutActiveJumpers(records, 10, new Date(2026, 5, 15));
    expect(result.plcsWithActive).toBe(1);
    expect(result.plcsWithoutActive).toBe(9);
  });

  test("plcsWithoutActiveJumpers: Expiring Soon (≤ 7 hari) dihitung sebagai aktif", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2026-06-20" }), // 5 days from 2026-06-15
    ];
    const result = plcsWithoutActiveJumpers(records, 10, new Date(2026, 5, 15));
    expect(result.plcsWithActive).toBe(1);
    expect(result.plcsWithoutActive).toBe(9);
  });

  test("plcsWithoutActiveJumpers: record tanpa Due Date tidak dihitung aktif", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: null }),
    ];
    const result = plcsWithoutActiveJumpers(records, 10, new Date(2026, 5, 15));
    expect(result.plcsWithActive).toBe(0);
    expect(result.plcsWithoutActive).toBe(10);
  });

  // ── jumperCountPerPlc ──
  test("jumperCountPerPlc menghasilkan byCategory dengan semua 3 kategori", () => {
    const record = makeRecord({ plc: "PLC-X", category: CATEGORIES.AFI });
    const result = jumperCountPerPlc([record]);
    expect(result).toHaveLength(1);
    expect(result[0].byCategory).toHaveProperty(CATEGORIES.AFI);
    expect(result[0].byCategory).toHaveProperty(CATEGORIES.FORCES);
    expect(result[0].byCategory).toHaveProperty(CATEGORIES.SHORTBRANCHES);
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(1);
    expect(result[0].byCategory[CATEGORIES.FORCES]).toBe(0);
    expect(result[0].byCategory[CATEGORIES.SHORTBRANCHES]).toBe(0);
  });

  test("jumperCountPerPlc: record aktif dan expired dihitung", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", category: CATEGORIES.AFI, dueDate: "2026-12-31" }), // Active
      makeRecord({ jumperId: "002", plc: "PLC-A", category: CATEGORIES.AFI, dueDate: "2020-01-01" }), // Expired
    ];
    const result = jumperCountPerPlc(records);
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(2);
  });

  // ── Chart series integrasi ──
  test("getAllChartSeries mempertahankan urutan weekLabels non-alfabetis", () => {
    const weekLabels = ["W40", "W36", "W38"];
    const chartData = [
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W36", plan: 5, actual: 4 },
      { areaId: AREA_IDS.DRYER_CM, category: CATEGORIES.AFI, week: "W40", plan: 9, actual: 8 },
    ];
    const series = getAllChartSeries(chartData, weekLabels);
    const dryerAfi = series.get(getChartKey(AREA_IDS.DRYER_CM, CATEGORIES.AFI));
    // Urutan output harus W40, W36, W38 (sesuai weekLabels)
    expect(dryerAfi.labels).toEqual(["W40", "W36", "W38"]);
    expect(dryerAfi.planSeries[0]).toBe(9);  // W40
    expect(dryerAfi.planSeries[1]).toBe(5);  // W36
    expect(dryerAfi.planSeries[2]).toBeNull(); // W38 tidak ada
  });

  test("null Plan/Actual tetap null (bukan 0) di series — BR-02", () => {
    const weekLabels = ["W36"];
    const series = getAllChartSeries([], weekLabels);
    const dryerAfi = series.get(getChartKey(AREA_IDS.DRYER_CM, CATEGORIES.AFI));
    expect(dryerAfi.planSeries[0]).toBeNull();
    expect(dryerAfi.actualSeries[0]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TEST: renderSlidePreview — integrasi HTML (tanpa Chart.js)
// ---------------------------------------------------------------------------

describe("renderSlidePreview — layout revisi (tanpa DOM browser)", () => {

  const previewState = {
    config: {
      title: "PPA JUMPER AUDIT WEEK-40",
      plantArea: "Process Plant Area",
      reportingYear: 2026,
      reportingWeek: 40,
      totalPlcInScope: 69,
    },
    areaSummary: [],
    weeklyChartData: [],
    jumperRegister: [
      makeRecord({ jumperId: "001", plc: "D3C", areaId: AREA_IDS.DRYER_CM, dueDate: "2099-12-31" }),
      makeRecord({ jumperId: "002", plc: "K2",  areaId: AREA_IDS.KILN_CTS, dueDate: "2000-01-01" }),
    ],
  };

  function render(state) {
    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);
    return container.innerHTML;
  }

  test("judul tabel baru tampil, judul lama tidak ada", () => {
    const html = render(previewState);
    expect(html).toContain("Total Jumper With MOC/Authorized Jumper");
    expect(html).not.toContain("Jumper Update Table");
    expect(html).toContain("Jumper Without MOC/Authorized Jumper");
    expect(html).not.toContain("Remaining Jumper List");
  });

  test("kartu Area Summary dan baris KPI status lama dihapus", () => {
    const html = render(previewState);
    expect(html).not.toContain("slide-kpi-row");
    expect(html).not.toContain("slide-kpi-box");
  });

  test("header menampilkan format baru: Title | Week X - Year dan official logos", () => {
    const html = render(previewState);
    expect(html).toContain("Week 40 - 2026");
    expect(html).toContain("assets/logo_vale.png");
    expect(html).toContain("assets/logo_mindid.png");
    expect(html).not.toContain("Chart Week Labels");
  });

  test("logo order: MIND ID sebelum Vale dalam HTML", () => {
    const html = render(previewState);
    const mindidIdx = html.indexOf("logo_mindid.png");
    const valeIdx = html.indexOf("logo_vale.png");
    expect(mindidIdx).toBeGreaterThan(-1);
    expect(valeIdx).toBeGreaterThan(-1);
    expect(mindidIdx).toBeLessThan(valeIdx);
  });

  test("metric PLC: pembilang jumlah PLC dengan jumper aktif / total PLC", () => {
    const html = render(previewState);
    // 2 record: 1 Active (D3C), 1 Expired (K2) → 2 PLC dengan jumper aktif
    // Fraction: 2 / 69
    expect(html).toContain("2 / 69");
    expect(html).toContain("PLCs With Active Jumper / Total PLCs");
    expect(html).toContain("PLCs with active jumper / Total PLCs in Scope");
  });

  test("legenda aturan status 3-status tampil (7 hari)", () => {
    const html = render(previewState);
    expect(html).toContain("Expiring Soon (0–7 hari)");
    expect(html).toContain("Active (> 7 hari)");
    expect(EXPIRING_SOON_MAX_DAYS).toBe(7);
  });

  test("kolom tabel: ID, PLC, Area, Category, Installed, Due Date, Status", () => {
    const html = render(previewState);
    for (const th of ["<th>ID</th>", "<th>PLC</th>", "<th>Area</th>", "<th>Category</th>",
                      "<th>Installed</th>", "<th>Due Date</th>", "<th>Status</th>"]) {
      expect(html).toContain(th);
    }
  });

  test("status badge dihitung dari Due Date (Active & Expired tampil)", () => {
    const html = render(previewState);
    // Badge warna STATUS_COLORS dirender inline pada kolom Status
    expect(html).toContain("background:#DCFCE7"); // Active
    expect(html).toContain("background:#FEE2E2"); // Expired
    expect(html).toContain(JUMPER_STATUS.ACTIVE);
    expect(html).toContain(JUMPER_STATUS.EXPIRED);
  });

  test("record tanpa Due Date menampilkan em-dash, bukan status Active", () => {
    const state = {
      ...previewState,
      jumperRegister: [makeRecord({ jumperId: "009", dueDate: null })],
    };
    const html = render(state);
    expect(html).toContain('<td class="ut-due"></td>');
    expect(html).toContain('class="slide-empty"');
    // Tidak ada badge warna status sama sekali
    expect(html).not.toContain("#DCFCE7"); // Active
    expect(html).not.toContain("#FEF3C7"); // Expiring Soon
    expect(html).not.toContain("#FEE2E2"); // Expired
  });
});

// ---------------------------------------------------------------------------
// TEST: PHASE 3.1 — Report Classification: Authorized vs Non-Authorized
// ---------------------------------------------------------------------------

describe("PHASE 3.1 — Report Classification: Authorized vs Non-Authorized in Slide Preview", () => {
  const regressionRecords = [
    makeRecord({ jumperId: "001", authorizationType: AUTH_TYPE.AUTHORIZED }),
    makeRecord({ jumperId: "002", authorizationType: AUTH_TYPE.AUTHORIZED }),
    makeRecord({ jumperId: "003", authorizationType: AUTH_TYPE.NON_AUTHORIZED }),
    makeRecord({ jumperId: "004", authorizationType: null }),
  ];

  const state = {
    config: {
      title: "PPA Report",
      plantArea: "PP Area",
      reportingYear: 2026,
      reportingWeek: 40,
      totalPlcInScope: 69,
    },
    areaSummary: [],
    weeklyChartData: [],
    jumperRegister: regressionRecords,
  };

  test("Authorized table contains only IDs 001 and 002", () => {
    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);
    const html = container.innerHTML;

    // Authorized table is in slide-bottom-left (.slide-update-table)
    const updateTableMatch = html.match(/<table class="slide-update-table">([\s\S]*?)<\/table>/);
    expect(updateTableMatch).not.toBeNull();
    const updateTableHtml = updateTableMatch[1];

    expect(updateTableHtml).toContain("001");
    expect(updateTableHtml).toContain("002");
    expect(updateTableHtml).not.toContain("003");
    expect(updateTableHtml).not.toContain("004");
  });

  test("Non-Authorized section contains only ID 003 and confirms Authorized records do not appear", () => {
    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);
    const html = container.innerHTML;

    // Non-Authorized section is in slide-remaining-panel
    const remainingPanelMatch = html.match(/<div class="slide-remaining-panel">([\s\S]*?)<div class="slide-plc-section">/);
    expect(remainingPanelMatch).not.toBeNull();
    const remainingPanelHtml = remainingPanelMatch[1];

    expect(remainingPanelHtml).toContain("003");
    expect(remainingPanelHtml).not.toContain("001");
    expect(remainingPanelHtml).not.toContain("002");
    expect(remainingPanelHtml).not.toContain("004");
  });

  test("Badge count on Non-Authorized section reflects only Non-Authorized records (1)", () => {
    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);
    const html = container.innerHTML;

    expect(html).toContain('<span class="slide-count-badge">1</span>');
  });

  test("Record belum diklasifikasikan (004) tidak muncul di preview dan tidak ada teks Unclassified", () => {
    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);
    const html = container.innerHTML;

    expect(html).not.toContain("004");
    expect(html).not.toContain("Unclassified");
  });
});

// ---------------------------------------------------------------------------
// TEST: Konsistensi KPI Metrik PLC antara Pure Selector dan Web Preview
// ---------------------------------------------------------------------------

describe("Konsistensi KPI Metrik PLC antara Pure Selector dan Web Preview", () => {
  test("Nilai fraction dan persentase di web preview konsisten dengan pure selector", () => {
    const records = [
      makeRecord({ jumperId: "001", plc: "PLC-A", dueDate: "2099-12-31" }), // Active
      makeRecord({ jumperId: "002", plc: "PLC-A", dueDate: "2020-01-01" }), // Expired (tetap aktif, PLC-A dihitung 1x)
      makeRecord({ jumperId: "003", plc: "PLC-B", dueDate: "2026-06-20" }), // Expiring Soon (PLC-B)
      makeRecord({ jumperId: "004", plc: "PLC-C", dueDate: null }),         // No Due Date (tidak aktif)
    ];

    const state = {
      config: {
        title: "KPI Consistency Audit",
        plantArea: "PP Area",
        reportingYear: 2026,
        reportingWeek: 40,
        totalPlcInScope: 10,
      },
      areaSummary: [],
      weeklyChartData: [],
      jumperRegister: records,
    };

    // 1. Pure selector
    const selectorResult = plcsWithoutActiveJumpers(records, 10, new Date(2026, 5, 15));
    expect(selectorResult.ok).toBe(true);
    expect(selectorResult.plcsWithActive).toBe(2);
    expect(selectorResult.plcsWithoutActive).toBe(8);
    expect(selectorResult.percentage).toBe(80);

    // 2. Web preview HTML
    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);
    const html = container.innerHTML;

    // Header label
    expect(html).toContain("PLCs With Active Jumper / Total PLCs");
    // Fraction pembilang jumlah PLC aktif (2 / 10)
    expect(html).toContain("2 / 10");
    // Persentase (80.0%)
    expect(html).toContain("80.0%");
    // Sub-label
    expect(html).toContain("PLCs with active jumper / Total PLCs in Scope");
  });

  test("Ketika totalPlcInScope tidak valid (0 atau null), preview menampilkan reason dengan konsisten", () => {
    const state = {
      config: {
        title: "Invalid PLC Scope",
        plantArea: "PP Area",
        reportingYear: 2026,
        reportingWeek: 40,
        totalPlcInScope: 0,
      },
      areaSummary: [],
      weeklyChartData: [],
      jumperRegister: [],
    };

    const selectorResult = plcsWithoutActiveJumpers([], 0);
    expect(selectorResult.ok).toBe(false);
    expect(selectorResult.percentage).toBeNull();

    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);
    const html = container.innerHTML;

    expect(html).toContain("Total PLC in Scope harus bilangan bulat positif");
  });
});

// ---------------------------------------------------------------------------
// DOKUMENTASI: Manual Test yang Diperlukan di Browser
// ---------------------------------------------------------------------------

/*
 * Manual Test Checklist — Buka http://localhost:3000 (npx serve .)
 *
 * MT-01: Preview awal
 *   - Buka aplikasi. Section "Preview" menampilkan placeholder.
 *   - Setelah isi Report Title → preview update otomatis.
 *
 * MT-02: 12 Grafik
 *   - Isi beberapa baris Weekly Chart Data.
 *   - Preview menampilkan 12 grafik; grafik yang ada data menampilkan garis Plan dan Actual.
 *   - Grafik yang tidak ada data menampilkan canvas kosong (bukan error).
 *   - Urutan minggu di sumbu X = urutan Chart Week Labels (bukan alfabet).
 *
 * MT-03: Null vs 0
 *   - Tambah baris dengan Plan=0, Actual=0 → grafik tampilkan titik di Y=0.
 *   - Minggu yang tidak ada data → tidak ada titik (gap, bukan 0).
 *
 * MT-04: Jumper Without MOC/Authorized Jumper
 *   - Panel menampilkan daftar dari Jumper Authorized Register.
 *   - Note: Filter MOC/Authorization tidak tersedia (fields removed).
 *
 * MT-05: Overflow Warning
 *   - Tambah lebih dari 12 record.
 *   - Preview menampilkan warning overflow; hanya 12 item pertama ditampilkan.
 *
 * MT-06: PLCs Without Active Jumper / Total PLCs
 *   - totalPlcInScope kosong → panel menampilkan "belum tersedia".
 *   - Isi totalPlcInScope → rasio muncul dengan persentase.
 *
 * MT-07: Total Jumper With MOC/Authorized Jumper
 *   - Tambah beberapa record jumper.
 *   - Tabel menampilkan kolom PLC, Area, Category, Installed, Due Date, Status.
 *   - Status dihitung dari Due Date (Active/Expiring Soon/Expired).
 *
 * MT-08: Count per PLC (bar chart)
 *   - Tambah beberapa record aktif dengan PLC berbeda.
 *   - Bar chart di kanan bawah menampilkan data per PLC × Category.
 *
 * MT-09: Responsivitas
 *   - Ubah lebar browser. Slide menjaga rasio 16:9.
 *   - Font dan grafik tetap terbaca pada ukuran normal.
 */