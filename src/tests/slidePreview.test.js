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
import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST, CHART_MATRIX } from "../model/constants.js";
import {
  remainingJumperList,
  authorizedMocCount,
  removedJumperCount,
  remainingPlcRatio,
  jumperCountPerPlc,
} from "../logic/selectors.js";
import { getAllChartSeries, getChartKey } from "../logic/chartData.js";
import { createJumperRecord } from "../model/state.js";
import {
  AREA_IDS, CATEGORIES,
  AUTH_STATUS, MOC_STATUS,
  REMOVAL_STATUS, DUE_DATE_STATUS,
} from "../model/constants.js";

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

function makeRecord(overrides = {}) {
  return createJumperRecord({
    jumperId:            "J-001",
    plc:                 "PLC-A",
    areaId:              AREA_IDS.DRYER_CM,
    category:            CATEGORIES.AFI,
    description:         "Test",
    installedWeekOrDate: "W35-2026",
    authorizationStatus: AUTH_STATUS.AUTHORIZED,
    mocStatus:           MOC_STATUS.APPROVED_COMPLETE,
    identificationYear:  2026,
    removalStatus:       REMOVAL_STATUS.NO,
    removalWeek:         null,
    removalYear:         null,
    dueDateStatus:       DUE_DATE_STATUS.CONFIRMED,
    dueDate:             "2026-12-31",
    quantity:            1,
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

  const appConfigWith2026 = {
    reporting: { identificationYearFilter: 2026 },
    discrepancyWarning: { enabled: true, basis: null },
  };
  const appConfigNull = {
    reporting: { identificationYearFilter: null },
    discrepancyWarning: { enabled: true, basis: null },
  };

  // ── Remaining Jumper List ──
  test("remainingJumperList ok:false jika identificationYearFilter null (OQ-01)", () => {
    const result = remainingJumperList([], appConfigNull);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/OQ-01/);
  });

  test("remainingJumperList ok:true dengan filter dikonfigurasi — record yang cocok masuk", () => {
    const record = makeRecord({
      removalStatus: REMOVAL_STATUS.NO,
      mocStatus: MOC_STATUS.NOT_AVAILABLE,
      identificationYear: 2026,
    });
    const result = remainingJumperList([record], appConfigWith2026);
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  test("remainingJumperList ok:true — register kosong mengembalikan data kosong", () => {
    const result = remainingJumperList([], appConfigWith2026);
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  // ── Authorized/MoC ──
  test("authorizedMocCount mengembalikan placeholderWarning yang mengandung OQ", () => {
    const { placeholderWarning } = authorizedMocCount([]);
    expect(placeholderWarning).toMatch(/OQ/);
  });

  test("authorizedMocCount = 0 jika register kosong", () => {
    expect(authorizedMocCount([]).count).toBe(0);
  });

  test("authorizedMocCount menghitung Quantity, bukan jumlah record", () => {
    const r1 = makeRecord({ jumperId: "J-1", quantity: 3, authorizationStatus: AUTH_STATUS.AUTHORIZED, mocStatus: MOC_STATUS.APPROVED_COMPLETE });
    const r2 = makeRecord({ jumperId: "J-2", quantity: 2, authorizationStatus: AUTH_STATUS.AUTHORIZED, mocStatus: MOC_STATUS.APPROVED_COMPLETE });
    expect(authorizedMocCount([r1, r2]).count).toBe(5);
  });

  // ── Removed Jumper ──
  test("removedJumperCount = 0 jika tidak ada label minggu laporan", () => {
    const record = makeRecord({ removalStatus: REMOVAL_STATUS.YES, removalWeek: "W40", removalYear: 2026, quantity: 2 });
    // reportingWeekLabel = null → count = 0 (slidePreview tidak memanggil removedJumperCount)
    const { count } = removedJumperCount([record], 2026, null);
    expect(count).toBe(0); // null label → tidak cocok dengan "W40"
  });

  test("removedJumperCount benar dengan label eksplisit", () => {
    const record = makeRecord({ removalStatus: REMOVAL_STATUS.YES, removalWeek: "W40", removalYear: 2026, quantity: 3 });
    const { count } = removedJumperCount([record], 2026, "W40");
    expect(count).toBe(3);
  });

  // ── Regression Tests: Konsistensi Periode Laporan ──
  test("removedJumperCount mencocokkan removalWeek baik W40, '40', maupun wk40 secara konsisten", () => {
    const records = [
      makeRecord({ jumperId: "J-R1", removalStatus: REMOVAL_STATUS.YES, removalWeek: "W40", removalYear: 2026, quantity: 1 }),
      makeRecord({ jumperId: "J-R2", removalStatus: REMOVAL_STATUS.YES, removalWeek: "40", removalYear: 2026, quantity: 2 }),
      makeRecord({ jumperId: "J-R3", removalStatus: REMOVAL_STATUS.YES, removalWeek: "W52", removalYear: 2026, quantity: 5 }), // beda minggu
    ];
    // Periode eksplisit W40
    const resW40 = removedJumperCount(records, 2026, "W40");
    expect(resW40.count).toBe(3); // J-R1 (1) + J-R2 (2)

    // Periode eksplisit W52
    const resW52 = removedJumperCount(records, 2026, "W52");
    expect(resW52.count).toBe(5);
  });

  test("Slide preview mengikat period label dan removed count ke Reporting Week terpilih (W40), bukan label terakhir weekLabels", () => {
    // Simulasi state dengan reportingWeek = 40, tetapi weekLabels berisi sampai W52
    const state = {
      config: {
        title: "PPA Jumper Audit",
        plantArea: "Process Plant Area",
        reportingYear: 2026,
        reportingWeek: 40,
        weekLabels: ["W38", "W39", "W40", "W52"], // label terakhir W52
        totalPlcInScope: 69,
        identificationYearFilter: 2026,
      },
      areaSummary: [],
      weeklyChartData: [],
      jumperRegister: [
        makeRecord({ jumperId: "J-R40", removalStatus: REMOVAL_STATUS.YES, removalWeek: "W40", removalYear: 2026, quantity: 2 }),
        makeRecord({ jumperId: "J-R52", removalStatus: REMOVAL_STATUS.YES, removalWeek: "W52", removalYear: 2026, quantity: 7 }),
      ],
    };

    // Panggil renderSlidePreview ke elemen DOM virtual
    const container = { innerHTML: "" };
    renderSlidePreview(container, state, null);

    // Header harus menampilkan Period: W40, BUKAN W52
    expect(container.innerHTML).toContain("Period: W40");
    expect(container.innerHTML).not.toContain("Period: W52");

    // Kartu ringkasan status (Normal/Due Soon/Expired) DIHAPUS dari slide.
    // Kata "Normal"/"Due Soon"/"Expired" hanya boleh muncul di legenda teks & kolom Status.
    expect(container.innerHTML).not.toContain("slide-kpi-row");
    expect(container.innerHTML).not.toContain("slide-kpi-box");
    expect(container.innerHTML).toContain("Jumper Update Table");
    // Legenda aturan status 4-tier tetap tampil
    expect(container.innerHTML).toContain("Upcoming");
    expect(container.innerHTML).toContain("Due Soon (0–7 hari)");
  });

  // ── PLC Ratio ──
  test("remainingPlcRatio ok:false jika totalPlcInScope null", () => {
    const result = remainingPlcRatio([], null);
    expect(result.ok).toBe(false);
    expect(result.ratio).toBeNull();
  });

  test("remainingPlcRatio benar: 2 PLC aktif dari 10 = 0.2", () => {
    const records = [
      makeRecord({ jumperId: "J-1", plc: "PLC-A" }),
      makeRecord({ jumperId: "J-2", plc: "PLC-B" }),
      makeRecord({ jumperId: "J-3", plc: "PLC-A" }), // duplikat PLC-A
    ];
    const result = remainingPlcRatio(records, 10);
    expect(result.ok).toBe(true);
    expect(result.activePlcCount).toBe(2);
    expect(result.ratio).toBeCloseTo(0.2);
  });

  // ── jumperCountPerPlc ──
  test("jumperCountPerPlc menghasilkan byCategory dengan semua 3 kategori", () => {
    const record = makeRecord({ plc: "PLC-X", category: CATEGORIES.AFI, quantity: 4 });
    const result = jumperCountPerPlc([record]);
    expect(result).toHaveLength(1);
    expect(result[0].byCategory).toHaveProperty(CATEGORIES.AFI);
    expect(result[0].byCategory).toHaveProperty(CATEGORIES.FORCES);
    expect(result[0].byCategory).toHaveProperty(CATEGORIES.SHORTBRANCHES);
    expect(result[0].byCategory[CATEGORIES.AFI]).toBe(4);
    expect(result[0].byCategory[CATEGORIES.FORCES]).toBe(0);
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
// DOKUMENTASI: Manual Test yang Diperlukan di Browser
// ---------------------------------------------------------------------------

/*
 * Manual Test Checklist — Buka http://localhost:3000 (npx serve .)
 *
 * MT-01: Preview awal
 *   - Buka aplikasi. Section "Preview" menampilkan placeholder "Isi form di atas...".
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
 * MT-04: Remaining Jumper List
 *   - identificationYearFilter kosong → panel menampilkan "[OQ-01] belum dikonfigurasi".
 *   - Isi identificationYearFilter → panel menampilkan daftar yang memenuhi filter.
 *
 * MT-05: Overflow Warning
 *   - Tambah lebih dari 12 record dengan Removal=No, MOC=Not Available, ID Year = filter.
 *   - Preview menampilkan warning overflow; hanya 12 item pertama ditampilkan.
 *
 * MT-06: PLC Ratio
 *   - totalPlcInScope kosong → panel menampilkan "belum tersedia".
 *   - Isi totalPlcInScope → rasio muncul.
 *
 * MT-07: Jumper Update Table
 *   - Tambah beberapa record jumper.
 *   - Tabel "Jumper Update Table" di preview menampilkan kolom PLC, Update Jumper,
 *     Installed, Authorized Jumper, Due Date.
 *   - Due Date "unconfirmed" menampilkan "Perlu konfirmasi", bukan tanggal palsu.
 *
 * MT-08: Count per PLC (bar chart)
 *   - Tambah beberapa record aktif dengan PLC berbeda.
 *   - Bar chart di kanan bawah menampilkan data per PLC × Category.
 *
 * MT-09: Responsivitas
 *   - Ubah lebar browser. Slide menjaga rasio 16:9.
 *   - Font dan grafik tetap terbaca pada ukuran normal.
 */
