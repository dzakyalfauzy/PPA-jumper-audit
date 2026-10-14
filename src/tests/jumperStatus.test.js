/**
 * jumperStatus.test.js
 * Test revisi Jumper Register:
 *   - getJumperStatus: batas Normal / Upcoming / Due Soon / Expired (7 & 30 hari, kalender)
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
  DUE_SOON_MAX_DAYS,
  UPCOMING_MAX_DAYS,
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
// getJumperStatus — batas status
// ---------------------------------------------------------------------------

describe("getJumperStatus", () => {
  test("Due Date hari ini = Due Soon (bukan Normal, bukan Expired)", () => {
    expect(getJumperStatus("2026-06-15", TODAY)).toBe(JUMPER_STATUS.DUE_SOON);
  });

  test("Due Date besok (diff=1) = Due Soon", () => {
    expect(getJumperStatus("2026-06-16", TODAY)).toBe(JUMPER_STATUS.DUE_SOON);
  });

  test("Due Date tepat 7 hari lagi = Due Soon (batas inklusif)", () => {
    expect(getJumperStatus("2026-06-22", TODAY)).toBe(JUMPER_STATUS.DUE_SOON);
  });

  test("Due Date 8 hari lagi = Upcoming (batas eksklusif Due Soon)", () => {
    expect(getJumperStatus("2026-06-23", TODAY)).toBe(JUMPER_STATUS.UPCOMING);
  });

  test("Due Date tepat 30 hari lagi = Upcoming (batas inklusif)", () => {
    expect(getJumperStatus("2026-07-15", TODAY)).toBe(JUMPER_STATUS.UPCOMING);
  });

  test("Due Date 31 hari lagi = Normal (batas eksklusif Upcoming)", () => {
    expect(getJumperStatus("2026-07-16", TODAY)).toBe(JUMPER_STATUS.NORMAL);
  });

  test("Due Date kemarin = Expired", () => {
    expect(getJumperStatus("2026-06-14", TODAY)).toBe(JUMPER_STATUS.EXPIRED);
  });

  test("Due Date jauh lewat = Expired", () => {
    expect(getJumperStatus("2020-01-01", TODAY)).toBe(JUMPER_STATUS.EXPIRED);
  });

  test("dueDate null = null (BUKAN Normal)", () => {
    expect(getJumperStatus(null, TODAY)).toBeNull();
  });

  test("dueDate undefined = null", () => {
    expect(getJumperStatus(undefined, TODAY)).toBeNull();
  });

  test("dueDate format salah ('Wk51 2026') = null (BUKAN Normal)", () => {
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
    expect(getJumperStatus("2026-06-15", lateNightToday)).toBe(JUMPER_STATUS.DUE_SOON);
  });

  test("threshold terpusat: Due Soon 7 hari, Upcoming 30 hari", () => {
    expect(DUE_SOON_MAX_DAYS).toBe(7);
    expect(UPCOMING_MAX_DAYS).toBe(30);
  });

  test("nilai status hanya dari JUMPER_STATUS (4 entri)", () => {
    expect(Object.values(JUMPER_STATUS).sort()).toEqual(
      ["Due Soon", "Expired", "Normal", "Upcoming"].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// jumperStatusCounts
// ---------------------------------------------------------------------------

describe("jumperStatusCounts", () => {
  test("menghitung distribusi status seluruh register", () => {
    const reg = [
      { dueDate: "2026-06-15" }, // Due Soon (hari ini)
      { dueDate: "2026-06-22" }, // Due Soon (+7)
      { dueDate: "2026-06-23" }, // Upcoming (+8)
      { dueDate: "2026-07-15" }, // Upcoming (+30)
      { dueDate: "2026-07-16" }, // Normal (+31)
      { dueDate: "2026-06-14" }, // Expired (-1)
      { dueDate: null },         // noDate
      { dueDate: "bukan-tanggal" }, // noDate
    ];
    const counts = jumperStatusCounts(reg, TODAY);
    expect(counts).toEqual({
      normal: 1,
      upcoming: 2,
      dueSoon: 2,
      expired: 1,
      noDate: 2,
      total: 8,
    });
  });

  test("register kosong = semua 0", () => {
    const counts = jumperStatusCounts([], TODAY);
    expect(counts.total).toBe(0);
    expect(counts.normal + counts.upcoming + counts.dueSoon + counts.expired + counts.noDate).toBe(0);
  });

  test("record tanpa dueDate TIDAK dihitung sebagai Normal", () => {
    const counts = jumperStatusCounts([{ dueDate: null }], TODAY);
    expect(counts.normal).toBe(0);
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
    expect(c.normal + c.upcoming + c.dueSoon + c.expired + c.noDate).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// STATUS_COLORS — palet untuk keempat status
// ---------------------------------------------------------------------------

describe("STATUS_COLORS", () => {
  test("tersedia untuk Normal, Upcoming, Due Soon, Expired", () => {
    expect(STATUS_COLORS[JUMPER_STATUS.NORMAL]).toBeDefined();
    expect(STATUS_COLORS[JUMPER_STATUS.UPCOMING]).toBeDefined();
    expect(STATUS_COLORS[JUMPER_STATUS.DUE_SOON]).toBeDefined();
    expect(STATUS_COLORS[JUMPER_STATUS.EXPIRED]).toBeDefined();
    expect(Object.keys(STATUS_COLORS)).toHaveLength(4);
  });

  test("warna sesuai spesifikasi", () => {
    expect(STATUS_COLORS.Normal).toEqual({ bg: "#DCFCE7", text: "#166534" });
    expect(STATUS_COLORS.Upcoming).toEqual({ bg: "#DBEAFE", text: "#1D4ED8" });
    expect(STATUS_COLORS["Due Soon"]).toEqual({ bg: "#FEF3C7", text: "#92400E" });
    expect(STATUS_COLORS.Expired).toEqual({ bg: "#FEE2E2", text: "#991B1B" });
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

  test("jumlah PLC sesuai spesifikasi: Dryer 14, Kiln 25, Furnace 18, Converter 6", () => {
    expect(PLC_BY_AREA.dryer_cm).toHaveLength(14);
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
    });
  });
});
