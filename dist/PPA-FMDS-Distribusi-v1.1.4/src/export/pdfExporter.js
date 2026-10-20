/**
 * pdfExporter.js
 * Generator ekspor PDF satu slide (16:9 landscape) untuk PPA Jumper Audit Automation.
 *
 * Menggunakan html2canvas untuk menangkap elemen .slide-canvas visual secara presisi
 * dan jsPDF untuk mengemas hasil render menjadi file PDF 1 halaman 16:9 (960 pt x 540 pt)
 * tanpa margin, tanpa pemotongan, dan tanpa ketergantungan backend.
 */

"use strict";

import { validateFullState } from "../model/validation.js";

/**
 * Menghasilkan nama file standar untuk ekspor PDF berdasarkan config laporan.
 * Format: [ReportTitle]_[WeekLabel]_[Year].pdf
 *
 * @param {object} [config]
 * @returns {string}
 */
export function getPdfFilename(config = {}) {
  const safeTitle = (config.title || "PPA_Jumper_Audit").replace(/[^a-zA-Z0-9_-]/g, "_");
  const reportingWeekRaw = config.reportingWeek != null ? String(config.reportingWeek).trim().toUpperCase() : null;
  const reportingWeekLabel = reportingWeekRaw
    ? (reportingWeekRaw.startsWith("W") ? reportingWeekRaw : `W${reportingWeekRaw}`)
    : "W";
  const reportingYear = config.reportingYear ?? "";
  return `${safeTitle}_${reportingWeekLabel}_${reportingYear || ""}.pdf`;
}

/**
 * Generate dan unduh laporan PDF satu halaman 16:9 landscape.
 *
 * @param {object} state - state aplikasi (getState())
 * @param {object} [options]
 * @param {HTMLElement} [options.element] - elemen slide yang akan dicapture (default .slide-canvas)
 * @param {Function} [options.html2canvas] - library html2canvas custom/injected
 * @param {Function} [options.jsPDF] - class jsPDF custom/injected
 * @param {number} [options.scale=2] - skala DPI render canvas
 * @param {boolean} [options.save=true] - otomatis memicu unduhan file
 * @returns {Promise<{ success: boolean, filename: string, pdf: object, canvas?: object }>}
 */
export async function exportToPdf(state, options = {}) {
  // 1. Validasi state: blokir ekspor jika ada error validasi
  const validation = validateFullState(state);
  if (validation.errors.length > 0) {
    throw new Error(
      `Ekspor PDF diblokir karena terdapat ${validation.errors.length} error validasi: ${validation.errors[0]}`
    );
  }

  const filename = getPdfFilename(state.config);

  // 2. Resolusi dependency html2canvas
  let html2canvasFn = options.html2canvas;
  if (!html2canvasFn) {
    if (typeof window !== "undefined" && window.html2canvas) {
      html2canvasFn = window.html2canvas;
    } else {
      const mod = await import("html2canvas");
      html2canvasFn = mod.default || mod;
    }
  }

  // 3. Resolusi dependency jsPDF
  let JsPdfClass = options.jsPDF;
  if (!JsPdfClass) {
    if (typeof window !== "undefined" && window.jspdf && window.jspdf.jsPDF) {
      JsPdfClass = window.jspdf.jsPDF;
    } else {
      const mod = await import("jspdf");
      JsPdfClass = mod.jsPDF || mod.default?.jsPDF || mod.default;
    }
  }

  // 4. Target DOM element (.slide-canvas)
  const element =
    options.element ||
    (typeof document !== "undefined" ? document.querySelector(".slide-canvas") : null);

  if (!element && !options.canvas) {
    throw new Error("Elemen slide preview (.slide-canvas) tidak ditemukan untuk diekspor ke PDF.");
  }

  // 5. Render elemen ke canvas
  const canvas =
    options.canvas ||
    (await html2canvasFn(element, {
      scale: options.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      ...options.html2canvasOptions,
    }));

  // 6. Buat dokumen PDF 16:9 Widescreen (960 pt x 540 pt)
  const pdf = new JsPdfClass({
    orientation: "landscape",
    unit: "pt",
    format: [960, 540],
  });

  const imgData = typeof canvas.toDataURL === "function" ? canvas.toDataURL("image/png") : canvas;
  pdf.addImage(imgData, "PNG", 0, 0, 960, 540, undefined, "FAST");

  // 7. Simpan file jika diminta (default true di browser)
  if (options.save !== false && typeof pdf.save === "function") {
    pdf.save(filename);
  }

  return {
    success: true,
    filename,
    pdf,
    canvas,
  };
}
