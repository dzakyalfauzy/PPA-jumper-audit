/**
 * pdfExporter.test.js
 * Unit dan integration tests untuk src/export/pdfExporter.js
 */

"use strict";

import { exportToPdf, getPdfFilename } from "../export/pdfExporter.js";
import { WEEK_40_BASELINE, createJumperRecord } from "../model/state.js";
import { AREA_IDS, CATEGORIES, AUTH_TYPE } from "../model/constants.js";
import { jsPDF } from "jspdf";

describe("PHASE 6 — PDF Export (pdfExporter.js)", () => {
  let mockState;

  beforeEach(() => {
    mockState = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  });

  test("1. getPdfFilename menghasilkan format nama file yang benar", () => {
    const fn1 = getPdfFilename({
      title: "PPA JUMPER AUDIT WEEK-40",
      reportingWeek: 40,
      reportingYear: 2026,
    });
    expect(fn1).toBe("PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pdf");

    const fn2 = getPdfFilename({
      title: "Custom Report / Area: 1",
      reportingWeek: 12,
      reportingYear: 2025,
    });
    expect(fn2).toBe("Custom_Report___Area__1_W12_2025.pdf");

    const fnEmpty = getPdfFilename({});
    expect(fnEmpty).toBe("PPA_Jumper_Audit_W_.pdf");
  });

  test("2. exportToPdf memblokir ekspor jika terdapat validation errors", async () => {
    // Record tanpa authorizationType menghasilkan error validasi
    mockState.jumperRegister.push(
      createJumperRecord({
        jumperId: "999",
        plc: "D1C",
        areaId: AREA_IDS.DRYER_CM,
        category: CATEGORIES.FORCES,
        authorizationType: null,
      })
    );

    await expect(exportToPdf(mockState)).rejects.toThrow(
      /Ekspor PDF diblokir karena terdapat/
    );
  });

  test("3. exportToPdf melempar error jika elemen .slide-canvas tidak ditemukan", async () => {
    await expect(
      exportToPdf(mockState, {
        element: null,
        canvas: null,
      })
    ).rejects.toThrow(/tidak ditemukan/);
  });

  test("4. exportToPdf berhasil membuat dokumen PDF 16:9 landscape 1 halaman", async () => {
    let savedFilename = null;
    let addedImageArgs = null;

    const mockCanvas = {
      width: 2200,
      height: 1238,
      toDataURL: () => "data:image/png;base64,mockPngData",
    };

    class MockJsPdf {
      constructor(opts) {
        this.opts = opts;
        this.pages = [1];
      }
      addImage(...args) {
        addedImageArgs = args;
      }
      save(fn) {
        savedFilename = fn;
      }
    }

    const result = await exportToPdf(mockState, {
      canvas: mockCanvas,
      jsPDF: MockJsPdf,
      save: true,
    });

    expect(result.success).toBe(true);
    expect(result.filename).toBe("PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pdf");
    expect(savedFilename).toBe("PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pdf");

    // Dimensi 16:9 landscape: 960 pt x 540 pt
    expect(result.pdf.opts).toEqual({
      orientation: "landscape",
      unit: "pt",
      format: [960, 540],
    });

    // Parameter addImage: image, format, x, y, w, h
    expect(addedImageArgs[0]).toBe("data:image/png;base64,mockPngData");
    expect(addedImageArgs[1]).toBe("PNG");
    expect(addedImageArgs[2]).toBe(0);
    expect(addedImageArgs[3]).toBe(0);
    expect(addedImageArgs[4]).toBe(960);
    expect(addedImageArgs[5]).toBe(540);
  });

  test("5. Integrasi nyata dengan class jsPDF menghasilkan dokumen PDF valid", async () => {
    const mockCanvas = {
      width: 1920,
      height: 1080,
      toDataURL: () =>
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    const result = await exportToPdf(mockState, {
      canvas: mockCanvas,
      jsPDF: jsPDF,
      save: false, // jangan trigger download di node test
    });

    expect(result.success).toBe(true);
    const pdfDoc = result.pdf;

    // Jumlah halaman = 1
    expect(pdfDoc.getNumberOfPages()).toBe(1);

    // Dimensi halaman tepat 960 x 540 pt
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    expect(pageWidth).toBeCloseTo(960);
    expect(pageHeight).toBeCloseTo(540);
    expect(pageWidth / pageHeight).toBeCloseTo(16 / 9);

    // Validasi output PDF string / buffer
    const arrayBuffer = pdfDoc.output("arraybuffer");
    expect(arrayBuffer.byteLength).toBeGreaterThan(100);
  });
});
