/**
 * jumperStatus.test.js
 * Test revisi Jumper Register:
 *   - getJumperStatus: batas Active / Expiring Soon / Expired (7 hari, kalender)
 *   - jumperStatusCounts
 *   - PLC_BY_AREA: validitas mapping area → PLC
 *   - nextJumperId: generator ID 3-digit
 *   - migrateJumperRecords: migrasi schema lama → baru
 */

"use strict";

import {
  getJumperStatus,
  jumperStatusCounts,
} from "../logic/selectors.js";
import {
  JUMPER_STATUS,
  EXPIRING_SOON_MAX_DAYS,
  STATUS_COLORS,
  PLC_BY_AREA,
  AREA_ID_LIST,
} from "../model/constants.js";
import {
  nextJumperId,
  migrateJumperRecords,
  WEEK_40_BASELINE,
} from "../model/state.js";

// Today deterministik: 2026-06-15
const TODAY = new Date(2026, 5, 15);

// ---------------------------------------------------------------------------
// getJumperStatus — batas status (3-status system)
// ---------------------------------------------------------------------------

describe("getJumperStatus — 3-status system", () => {
  test("Due Date hari ini = Expiring Soon (bukan Active, bukan Expired)", () => {
    expect(getJumperStatus("2026-06-15", TODAY)).toBe(JUMPER_STATUS.EXPIRING_SOON);
  });

  test("Due Date besok (diff=1) = Expiring Soon", () => {
    expect(getJumperStatus("2026-06-16", TODAY)).toBe(JUMPER_STATUS.EXPIRING_SOON);
  });

  test("Due Date tepat 7 hari lagi = Expiring Soon (batas inklusif)", () => {
    expect(getJumperStatus("2026-06-22", TODAY)).toBe(JUMPER_STATUS.EXPIRING_SOON);
  });

  test("Due Date 8 hari lagi = Active (batas eksklusif Expiring Soon)", () => {
    expect(getJumperStatus("2026-06-23", TODAY)).toBe(JUMPER_STATUS.ACTIVE);
  });

  test("Due Date 30 hari lagi = Active", () => {
    expect(getJumperStatus("2026-07-15", TODAY)).toBe(JUMPER_STATUS.ACTIVE);
  });

  test("Due Date 31 hari lagi = Active", () => {
    expect(getJumperStatus("2026-07-16", TODAY)).toBe(JUMPER_STATUS.ACTIVE);
  });

  test("Due Date kemarin = Expired", () => {
    expect(getJumperStatus("2026-06-14", TODAY)).toBe(JUMPER_STATUS.EXPIRED);
  });

  test("Due Date jauh lewat = Expired", () => {
    expect(getJumperStatus("2020-01-01", TODAY)).toBe(JUMPER_STATUS.EXPIRED);
  });

  test("dueDate null = null (BUKAN Active)", () => {
    expect(getJumperStatus(null, TODAY)).toBeNull();
  });

  test("dueDate undefined = null", () => {
    expect(getJumperStatus(undefined, TODAY)).toBeNull();
  });

  test("dueDate format salah ('Wk51 2026') = null (BUKAN Active)", () => {
    expect(getJumperStatus("Wk51 2026", TODAY)).toBeNull();
  });

  test("dueDate kalender tidak valid (2026-02-31) = null", () => {
    expect(getJumperStatus("2026-02-31", TODAY)).toBeNull();
  });

  test("dueDate format timestamp diabaikan (harus YYYY-MM-DD)", () => {
    expect(getJumperStatus("2026/06/15", TODAY)).toBeNull();
  });

  test("perbandingan pakai tanggal kalender, bukan timestamp", () => {
    // 2026-06-15T23:59 vs TODAY (midnight lokal) — tetap dihitung sebagai hari yang sama
    const lateNightToday = new Date(2026, 5, 15, 23, 59, 59);
    expect(getJumperStatus("2026-06-15", lateNightToday)).toBe(JUMPER_STATUS.EXPIRING_SOON);
  });

  test("threshold terpusat: Expiring Soon 7 hari", () => {
    expect(EXPIRING_SOON_MAX_DAYS).toBe(7);
  });

  test("nilai status hanya dari JUMPER_STATUS (3 entri)", () => {
    expect(Object.values(JUMPER_STATUS).sort()).toEqual(
      ["Active", "Expiring Soon", "Expired"].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// jumperStatusCounts
// ---------------------------------------------------------------------------

describe("jumperStatusCounts", () => {
  test("menghitung distribusi status seluruh register", () => {
    const reg = [
      { dueDate: "2026-06-15" }, // Expiring Soon (hari ini)
      { dueDate: "2026-06-22" }, // Expiring Soon (+7)
      { dueDate: "2026-06-23" }, // Active (+8)
      { dueDate: "2026-07-15" }, // Active (+30)
      { dueDate: "2026-07-16" }, // Active (+31)
      { dueDate: "2026-06-14" }, // Expired (-1)
      { dueDate: null },         // noDate
      { dueDate: "bukan-tanggal" }, // noDate
    ];
    const counts = jumperStatusCounts(reg, TODAY);
    expect(counts).toEqual({
      active: 3,
      expiringSoon: 2,
      expired: 1,
      noDate: 2,
      total: 8,
    });
  });

  test("register kosong = semua 0", () => {
    const counts = jumperStatusCounts([], TODAY);
    expect(counts.total).toBe(0);
    expect(counts.active + counts.expiringSoon + counts.expired + counts.noDate).toBe(0);
  });

  test("record tanpa dueDate TIDAK dihitung sebagai Active", () => {
    const counts = jumperStatusCounts([{ dueDate: null }], TODAY);
    expect(counts.active).toBe(0);
    expect(counts.noDate).toBe(1);
  });

  test("total selalu = jumlah seluruh bucket", () => {
    const reg = [
      { dueDate: "2027-01-01" },
      { dueDate: "2026-06-25" },
      { dueDate: "2026-06-16" },
      { dueDate: "2026-01-01" },
      { dueDate: null },
    ];
    const c = jumperStatusCounts(reg, TODAY);
    expect(c.total).toBe(5);
    expect(c.active + c.expiringSoon + c.expired + c.noDate).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// STATUS_COLORS — palet untuk tiga status
// ---------------------------------------------------------------------------

describe("STATUS_COLORS", () => {
  test("tersedia untuk Active, Expiring Soon, Expired", () => {
    expect(STATUS_COLORS[JUMPER_STATUS.ACTIVE]).toBeDefined();
    expect(STATUS_COLORS[JUMPER_STATUS.EXPIRING_SOON]).toBeDefined();
    expect(STATUS_COLORS[JUMPER_STATUS.EXPIRED]).toBeDefined();
    expect(Object.keys(STATUS_COLORS)).toHaveLength(3);
  });

  test("warna sesuai spesifikasi", () => {
    expect(STATUS_COLORS[JUMPER_STATUS.ACTIVE]).toEqual({ bg: "#DCFCE7", text: "#166534" });
    expect(STATUS_COLORS[JUMPER_STATUS.EXPIRING_SOON]).toEqual({ bg: "#FEF3C7", text: "#92400E" });
    expect(STATUS_COLORS[JUMPER_STATUS.EXPIRED]).toEqual({ bg: "#FEE2E2", text: "#991B1B" });
  });

  test("setiap status punya bg dan text hex", () => {
    for (const key of Object.values(JUMPER_STATUS)) {
      expect(STATUS_COLORS[key].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(STATUS_COLORS[key].text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// PLC_BY_AREA
// ---------------------------------------------------------------------------

describe("PLC_BY_AREA", () => {
  test("mencakup semua area ID", () => {
    for (const areaId of AREA_ID_LIST) {
      expect(Array.isArray(PLC_BY_AREA[areaId])).toBe(true);
      expect(PLC_BY_AREA[areaId].length).toBeGreaterThan(0);
    }
  });

  test("jumlah PLC sesuai spesifikasi: Dryer 13, Kiln 25, Furnace 18, Converter 6", () => {
    expect(PLC_BY_AREA.dryer_cm).toHaveLength(13);
    expect(PLC_BY_AREA.kiln_cts).toHaveLength(25);
    expect(PLC_BY_AREA.furnace).toHaveLength(18);
    expect(PLC_BY_AREA.converter).toHaveLength(6);
  });

  test("tidak ada duplikat PLC di dalam satu area", () => {
    for (const areaId of AREA_ID_LIST) {
      const list = PLC_BY_AREA[areaId];
      expect(new Set(list).size).toBe(list.length);
    }
  });

  test("semua entry non-empty string", () => {
    for (const areaId of AREA_ID_LIST) {
      for (const plc of PLC_BY_AREA[areaId]) {
        expect(typeof plc).toBe("string");
        expect(plc.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// nextJumperId — generator 3-digit
// ---------------------------------------------------------------------------

describe("nextJumperId", () => {
  test("register kosong = 001", () => {
    expect(nextJumperId([])).toBe("001");
  });

  test("increment dari ID tertinggi", () => {
    const reg = [{ jumperId: "001" }, { jumperId: "003" }, { jumperId: "002" }];
    expect(nextJumperId(reg)).toBe("004");
  });

  test("selalu 3 digit (padStart)", () => {
    expect(nextJumperId([{ jumperId: "009" }])).toBe("010");
    expect(nextJumperId([{ jumperId: "099" }])).toBe("100");
  });

  test("baseline W40 → 007", () => {
    expect(nextJumperId(WEEK_40_BASELINE.jumperRegister)).toBe("007");
  });

  test("ID non-numeric diabaikan", () => {
    expect(nextJumperId([{ jumperId: "abc" }, { jumperId: "005" }])).toBe("006");
  });
});

// ---------------------------------------------------------------------------
// migrateJumperRecords — schema lama → baru
// ---------------------------------------------------------------------------

describe("migrateJumperRecords", () => {
  test("J-001 → 001", () => {
    const [migrated] = migrateJumperRecords([{ jumperId: "J-001" }]);
    expect(migrated.jumperId).toBe("001");
  });

  test("J-1 → 001 (pad 3 digit)", () => {
    const [migrated] = migrateJumperRecords([{ jumperId: "J-1" }]);
    expect(migrated.jumperId).toBe("001");
  });

  test("field lama dihapus dari hasil migrasi", () => {
    const [migrated] = migrateJumperRecords([{
      jumperId: "J-001",
      authorizationStatus: "Authorized",
      mocStatus: "Approved/Complete",
      identificationYear: 2026,
      removalStatus: "No",
      removalWeek: null,
      removalYear: null,
      dueDateStatus: "confirmed",
      installedWeekOrDate: "Wk10 2026",
      quantity: 1,
      plc: "D3C",
      areaId: "dryer_cm",
      category: "Shortbranches",
      description: "x",
      equipmentTag: null,
    }]);

    expect(migrated.authorizationStatus).toBeUndefined();
    expect(migrated.mocStatus).toBeUndefined();
    expect(migrated.identificationYear).toBeUndefined();
    expect(migrated.removalStatus).toBeUndefined();
    expect(migrated.installedWeekOrDate).toBeUndefined();
    expect(migrated.quantity).toBeUndefined();
    expect(migrated.dueDateStatus).toBeUndefined();
    expect(migrated.authorizationType).toBeNull();
  });

  test("installedDate week-string lama → null", () => {
    const [migrated] = migrateJumperRecords([{
      jumperId: "J-001",
      installedWeekOrDate: "Wk10 2026",
      installedDate: "Wk10 2026",
    }]);
    expect(migrated.installedDate).toBeNull();
  });

  test("dueDate ISO valid dipertahankan; week-string → null", () => {
    const [iso, week] = migrateJumperRecords([
      { jumperId: "J-001", dueDate: "2026-12-31", dueDateStatus: "confirmed" },
      { jumperId: "J-002", dueDate: "Wk51 2026", dueDateStatus: "confirmed" },
    ]);
    expect(iso.dueDate).toBe("2026-12-31");
    expect(week.dueDate).toBeNull();
  });

  test("dueDateStatus unconfirmed → dueDate null meski ISO", () => {
    const [migrated] = migrateJumperRecords([{
      jumperId: "J-001",
      dueDate: "2026-12-31",
      dueDateStatus: "unconfirmed",
    }]);
    expect(migrated.dueDate).toBeNull();
  });

  test("ID tidak dikenal digenerate dari posisi (3 digit)", () => {
    const migrated = migrateJumperRecords([
      { jumperId: "weird" },
      { jumperId: "also-weird" },
    ]);
    expect(migrated[0].jumperId).toBe("001");
    expect(migrated[1].jumperId).toBe("002");
  });

  test("field inti dipertahankan", () => {
    const [migrated] = migrateJumperRecords([{
      jumperId: "J-004",
      plc: "K2C",
      areaId: "kiln_cts",
      category: "AFI",
      description: "desc",
      equipmentTag: "tag-1",
      installedDate: "2026-09-27",
      dueDate: "2027-01-15",
      dueDateStatus: "confirmed",
    }]);
    expect(migrated).toEqual({
      jumperId: "004",
      plc: "K2C",
      areaId: "kiln_cts",
      category: "AFI",
      description: "desc",
      equipmentTag: "tag-1",
      installedDate: "2026-09-27",
      dueDate: "2027-01-15",
      authorizationType: null,
    });
  });
});