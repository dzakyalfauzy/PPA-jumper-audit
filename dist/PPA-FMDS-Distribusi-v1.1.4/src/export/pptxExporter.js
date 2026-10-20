/**
 * pptxExporter.js
 * Generator PowerPoint (PPTX) 16:9 satu slide yang proporsional dan fit 100% di kanvas (revisi).
 *
 * Dimensi Kanvas 16:9 Widescreen Resmi: 13.333" x 7.500"
 * Batas Konten Ketat:
 *   - Margin Slide: Kiri/Kanan/Bawah = 0.22"
 *   - Lebar Konten Aktif: 13.333 - 2 * 0.22 = 12.893"
 *   - Kolom Utama (Kiri): Lebar 8.60" (0.22" s.d. 8.82")
 *   - Kolom Pendukung (Kanan): Lebar 4.07" (9.04" s.d. 13.11")
 *   - Jarak antar Kolom Utama & Kanan: 0.22"
 *
 * Perubahan Revisi:
 *   - Hapus 4 Area Summary Cards
 *   - Rename "Jumper Update Table" → "Total Jumper With MOC/Authorized Jumper"
 *   - Rename "Remaining Jumper List" → "Jumper Without MOC/Authorized Jumper"
 *   - PLCs With Active Jumper / Total PLCs — Percentage
 *   - Status 3-status: Active / Expiring Soon / Expired
 *   - 12 charts tetap dipertahankan
 */

"use strict";

import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST, STATUS_COLORS, EXPIRING_SOON_MAX_DAYS } from "../model/constants.js";
import {
  plcsWithoutActiveJumpers,
  jumperCountPerPlc,
  calculateAreaSummariesFromWeeklyChart,
  getJumperStatus,
  getAuthorizedJumpers,
  getNonAuthorizedJumpers,
} from "../logic/selectors.js";
import { getAllChartSeries, getChartKey } from "../logic/chartData.js";
import { CATEGORY_COLORS, ACTUAL_COLOR } from "../preview/chartRenderer.js";
import { validateFullState } from "../model/validation.js";
import { LOGO_VALE_BASE64, LOGO_MINDID_BASE64 } from "./logos.js";

// Layout Widescreen 16:9
export const SLIDE_W = 13.333;
export const SLIDE_H = 7.500;
export const MARGIN = 0.22;

/**
 * Filter label minggu agar ringkas dan hanya menampilkan rentang minggu laporan relevan (cth 5-8 minggu)
 */
export function getOptimizedWeekLabels(configuredLabels, reportingWeek) {
  if (!Array.isArray(configuredLabels) || configuredLabels.length === 0) {
    if (!reportingWeek) return ["W40"];
    const wStr = String(reportingWeek).trim().toUpperCase();
    return [wStr.startsWith("W") ? wStr : `W${wStr}`];
  }

  if (configuredLabels.length <= 8) {
    return configuredLabels;
  }

  const targetNum = parseInt(String(reportingWeek || "40").replace(/\D/g, ""), 10) || 40;
  const targetLabel = `W${targetNum}`;
  const idx = configuredLabels.findIndex((l) => l.toUpperCase() === targetLabel.toUpperCase());

  if (idx !== -1) {
    const start = Math.max(0, idx - 3);
    const end = Math.min(configuredLabels.length, start + 6);
    return configuredLabels.slice(start, end);
  }

  return configuredLabels.slice(-6);
}

/**
 * Generate dan unduh presentasi PPTX satu slide yang editable.
 * @param {object} state - state aplikasi (getState())
 * @param {object} [PptxGenJSLib] - Library PptxGenJS
 * @returns {Promise<{ success: boolean, filename?: string, error?: string }>}
 */
export async function exportToPowerPoint(state, PptxGenJSLib = null) {
  const validation = validateFullState(state);
  if (validation.errors.length > 0) {
    throw new Error(`Ekspor diblokir karena terdapat ${validation.errors.length} error validasi: ${validation.errors[0]}`);
  }

  let PptxGenClass = PptxGenJSLib;
  if (!PptxGenClass) {
    if (typeof window !== "undefined" && window.PptxGenJS) {
      PptxGenClass = window.PptxGenJS;
    } else {
      const module = await import("pptxgenjs");
      PptxGenClass = module.default || module;
    }
  }

  const pptx = new PptxGenClass();
  pptx.defineLayout({ name: "WIDESCREEN_16_9", width: 13.333, height: 7.500 });
  pptx.layout = "WIDESCREEN_16_9";
  pptx.author = "PPA Automation";
  pptx.company = "PPA Process Plant Area";
  pptx.title = state.config.title || "PPA Jumper Audit";

  const slide = pptx.addSlide();
  slide.background = { color: "F8FAFC" };

  const config = state.config;
  const reportingYear = config.reportingYear;
  const reportingWeek = config.reportingWeek;
  const reportingWeekLabel = reportingWeek != null
    ? (String(reportingWeek).trim().toUpperCase().startsWith("W") ? String(reportingWeek).trim().toUpperCase() : `W${reportingWeek}`)
    : "—";
  const displayWeekLabels = getOptimizedWeekLabels(_getSortedWeekLabels(state), reportingWeek);

  const plcMetricResult = plcsWithoutActiveJumpers(state.jumperRegister, config.totalPlcInScope);
  const jumperPerPlc = jumperCountPerPlc(state.jumperRegister);
  const calculatedSummaries = calculateAreaSummariesFromWeeklyChart(state.weeklyChartData, reportingWeek, reportingYear);
  const allChartSeries = getAllChartSeries(state.weeklyChartData, displayWeekLabels);

  const authorizedJumpers = getAuthorizedJumpers(state.jumperRegister);
  const nonAuthorizedJumpers = getNonAuthorizedJumpers(state.jumperRegister);

  // 1. Header
  _buildHeader(slide, config, reportingWeekLabel);

  // 2. 12 Charts Grid (Area Summary cards removed)
  _build12Charts(slide, pptx, allChartSeries, calculatedSummaries, displayWeekLabels);

  // 3. Bottom Left: Total Jumper With MOC/Authorized Jumper (was: Jumper Update Table)
  _buildBottomLeft(slide, authorizedJumpers);

  // 4. Right Column: Jumper Without MOC/Authorized Jumper, PLCs With Active Jumper, & PLC Chart
  _buildRightColumn(slide, pptx, plcMetricResult, jumperPerPlc, nonAuthorizedJumpers, config.totalRemoveJumper);

  // Export buffer & XML post-process
  const safeTitle = (config.title || "PPA_Jumper_Audit").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeTitle}_${reportingWeekLabel}_${reportingYear || ""}.pptx`;

  const rawData = await pptx.write({ outputType: "nodebuffer" }).catch(async () => {
    return await pptx.write("nodebuffer").catch(async () => {
      return await pptx.write({ outputType: "blob" });
    });
  });

  let finalBuffer = rawData;
  try {
    let JSZipClass = null;
    if (typeof window !== "undefined" && window.JSZip) {
      JSZipClass = window.JSZip;
    } else {
      JSZipClass = (await import("jszip")).default;
    }

    if (JSZipClass) {
      const zip = await JSZipClass.loadAsync(rawData);

      const chartFiles = Object.keys(zip.files).filter((f) => f.match(/^ppt\/charts\/chart\d+\.xml$/));
      for (const cf of chartFiles) {
        let xml = await zip.file(cf).async("text");
        xml = xml.replaceAll('<a:defRPr sz="1200"', '<a:defRPr sz="750"');
        xml = xml.replace(/(<c:catAx>[\s\S]*?)<a:bodyPr\/>/, '$1<a:bodyPr rot="0" vert="horz"/>');
        zip.file(cf, xml);
      }

      if (typeof window === "undefined") {
        finalBuffer = await zip.generateAsync({ type: "nodebuffer" });
        const fs = (await import("fs")).default;
        fs.writeFileSync(filename, finalBuffer);
      } else {
        finalBuffer = await zip.generateAsync({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        });
        const blobUrl = window.URL.createObjectURL(finalBuffer);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
      }
    }
  } catch (err) {
    if (typeof pptx.writeFile === "function") {
      await pptx.writeFile({ fileName: filename });
    }
  }

  return { success: true, filename };
}

// Helper to get sorted week labels from state (reused from slidePreview)
function _getSortedWeekLabels(state) {
  const weeks = new Set();
  for (const row of state.weeklyChartData) {
    if (row.week) weeks.add(row.week);
  }
  return Array.from(weeks).sort((a, b) => {
    const pa = _parseWeekForSort(a);
    const pb = _parseWeekForSort(b);
    if (pa.year !== pb.year) return pa.year - pb.year;
    if (pa.weekNumber !== pb.weekNumber) return pa.weekNumber - pb.weekNumber;
    return a.localeCompare(b);
  });
}

function _parseWeekForSort(label) {
  const str = String(label).trim();
  const yearMatch = str.match(/(?:wk|w)\s*(\d{1,2})\s*\(['"]?(\d{2,4})['"]?\)/i);
  if (yearMatch) {
    const wNum = parseInt(yearMatch[1], 10);
    let y = parseInt(yearMatch[2], 10);
    if (y < 100) y = 2000 + y;
    return { weekNumber: wNum, year: y };
  }
  const simpleMatch = str.match(/^(?:wk|w)?\s*(\d{1,2})$/i);
  if (simpleMatch) {
    return { weekNumber: parseInt(simpleMatch[1], 10), year: 2026 };
  }
  return { weekNumber: 999, year: 2026 };
}

// ---------------------------------------------------------------------------
// SECTION BUILDERS
// ---------------------------------------------------------------------------

function _buildHeader(slide, config, reportingWeekLabel) {
  slide.addShape("rect", {
    x: 0, y: 0, w: SLIDE_W, h: 0.50,
    fill: { color: "1E3A8A" },
    line: { color: "1E3A8A" }
  });

  const title = (config.title || "PPA JUMPER AUDIT").trim();
  const year = config.reportingYear != null ? String(config.reportingYear).trim() : "—";
  const rawWeek = config.reportingWeek != null ? String(config.reportingWeek).trim() : "";
  const weekNum = rawWeek.replace(/^W/i, "");
  const weekLabel = weekNum !== "" && weekNum !== "—" ? `Week ${weekNum}` : "Week —";
  const headerText = `${title} | ${weekLabel} - ${year}`;

  slide.addText(headerText, {
    x: MARGIN, y: 0.05, w: 9.5, h: 0.40,
    fontSize: 14, bold: true, color: "FFFFFF",
    align: "left", valign: "middle"
  });

  // Logos on the far right directly on the header bar: MIND ID (left) then Vale (right)
  const logoH = 0.26;
  const logoY = 0.17;
  const mindidW = 0.90;
  const valeW = 0.68;
  const mindidX = 11.33;
  const valeX = 12.41;

  if (typeof slide.addImage === "function") {
    slide.addImage({
      data: `data:image/png;base64,${LOGO_MINDID_BASE64}`,
      x: mindidX, y: logoY, w: mindidW, h: logoH
    });
    slide.addImage({
      data: `data:image/png;base64,${LOGO_VALE_BASE64}`,
      x: valeX, y: logoY, w: valeW, h: logoH
    });
  }
}

function _build12Charts(slide, pptx, allChartSeries, calculatedSummaries, displayWeekLabels) {
  const colStartX = MARGIN; // 0.22
  const colStartY = 0.56;   // langsung di bawah header (Area Summary cards removed)
  const colW = 2.08;
  const colGap = 0.09;
  const headerH = 0.22;
  const chartH = 1.20;
  const chartGap = 0.05;

  AREA_ID_LIST.forEach((areaId, areaIdx) => {
    const x = colStartX + areaIdx * (colW + colGap);
    const summary = calculatedSummaries[areaId];
    const totalJumpers = summary && summary.totalActual !== null ? ` (${summary.totalActual} jumpers)` : "";

    // Area Column Header
    slide.addShape("rect", {
      x, y: colStartY, w: colW, h: headerH,
      fill: { color: "1E3A8A" },
      line: { color: "1E3A8A" }
    });
    slide.addText(`${AREA_LABELS[areaId]}${totalJumpers}`, {
      x, y: colStartY, w: colW, h: headerH,
      fontSize: 9, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });

    // 3 Category Rows
    CATEGORY_LIST.forEach((category, catIdx) => {
      const y = colStartY + headerH + 0.03 + catIdx * (chartH + chartGap);
      const key = getChartKey(areaId, category);
      const series = allChartSeries.get(key);

      const catColorHex = (CATEGORY_COLORS[category]?.base || "#0EA5E9").replace("#", "");
      slide.addText(`●  ${category}`, {
        x: x + 0.04, y: y, w: colW - 0.08, h: 0.15,
        fontSize: 8.5, bold: true, color: catColorHex,
        align: "left", valign: "middle"
      });

      const pData = (series?.planSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const aData = (series?.actualSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const labels = series?.labels && series.labels.length > 0 ? series.labels : displayWeekLabels;

      const planColorHex = (CATEGORY_COLORS[category]?.base || "#BFBFBF").replace("#", "");
      const actualColorHex = ACTUAL_COLOR.replace("#", "");

      const chartDataTypes = [
        {
          type: pptx.ChartType.bar,
          data: [{ name: "Plan", labels, values: pData }],
          options: {
            chartColors: [planColorHex],
            dataLabelValue: true,
            dataLabelFontColor: "1E293B",
            dataLabelFontSize: 8,
          }
        },
        {
          type: pptx.ChartType.line,
          data: [{ name: "Actual", labels, values: aData }],
          options: {
            chartColors: [actualColorHex],
            dataLabelValue: true,
            dataLabelFontColor: actualColorHex,
            dataLabelFontSize: 8.5,
            lineDataSymbol: "square",
            lineDataSymbolSize: 6,
            lineSize: 2.0
          }
        }
      ];

      try {
        slide.addChart(chartDataTypes, null, {
          x, y: y + 0.13, w: colW, h: chartH - 0.13,
          showLegend: catIdx === 0,
          legendPos: "t",
          legendFontSize: 7.5,
          showValAxisTitle: false,
          showCatAxisTitle: false,
          valAxisHidden: false,
          catAxisHidden: false,
          valAxisFontSize: 7.5,
          catAxisFontSize: 7.5,
          catAxisLabelPos: "low"
        });
      } catch (err) {
        slide.addShape("rect", {
          x, y: y + 0.13, w: colW, h: chartH - 0.13,
          fill: { color: "F1F5F9" },
          line: { color: "CBD5E1" }
        });
        slide.addText(`${category} Data`, {
          x, y: y + 0.13, w: colW, h: chartH - 0.13,
          fontSize: 9, color: "64748B", align: "center", valign: "middle"
        });
      }
    });
  });
}

function _buildBottomLeft(slide, authorizedJumpers) {
  const startX = MARGIN; // 0.22
  const startY = 5.10;   // langsung di bawah charts (y = 5.10) — chart grid dipertinggi
  const totalW = 8.60; // 4 * 2.08 + 3 * 0.09 = 8.59 (~8.60)

  // Total Jumper With MOC/Authorized Jumper — mengisi ruang sisa di bawah chart grid
  const tableY = startY;         // 5.10
  const tableH = 2.14;           // 5.10 + 2.14 = 7.24 <= 7.28" (Aman!)

  slide.addText("Total Jumper With MOC/Authorized Jumper", {
    x: startX, y: tableY, w: totalW, h: 0.16,
    fontSize: 9.5, bold: true, color: "1E3A8A"
  });

  const tableHeader = [
    { text: "ID", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 8 } },
    { text: "PLC", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 8 } },
    { text: "Area", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 8 } },
    { text: "Category", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 8 } },
    { text: "Installed", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 8 } },
    { text: "Due Date", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 8 } },
    { text: "Status", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 8, align: "center" } },
  ];

  const tableRows = (authorizedJumpers || []).slice(0, 8).map((r) => {
    const status = getJumperStatus(r.dueDate);
    const colors = status ? STATUS_COLORS[status] : null;
    return [
      { text: r.jumperId || "—", options: { fontSize: 7.5, bold: true } },
      { text: r.plc || "—", options: { fontSize: 7.5 } },
      { text: AREA_LABELS[r.areaId] || r.areaId || "—", options: { fontSize: 7.5 } },
      { text: r.category || "—", options: { fontSize: 7.5 } },
      { text: r.installedDate || "—", options: { fontSize: 7.5 } },
      { text: r.dueDate || "—", options: { fontSize: 7.5 } },
      {
        text: status || "—",
        options: {
          fontSize: 7.5,
          align: "center",
          bold: true,
          color: colors ? colors.text.replace("#", "") : "64748B",
          fill: colors ? colors.bg.replace("#", "") : "F1F5F9",
        },
      },
    ];
  });

  const allRows = [tableHeader, ...(tableRows.length > 0 ? tableRows : [[
    { text: "Tidak ada record Authorized", options: { fontSize: 8, colspan: 7 } }
  ]])];

  slide.addTable(allRows, {
    x: startX, y: tableY + 0.18, w: totalW, h: tableH - 0.20,
    colW: [0.55, 1.15, 1.45, 1.35, 1.30, 1.30, 1.50],
    border: { color: "CBD5E1", pt: 0.5 },
    fill: "FFFFFF",
    autoPage: false
  });
}

function _buildRightColumn(slide, pptx, plcMetricResult, jumperPerPlc, nonAuthorizedJumpers = [], totalRemoveJumper = 0) {
  const colX = 9.04; // 8.82 + 0.22 gap = 9.04
  const colW = 4.07; // 9.04 + 4.07 = 13.11 <= 13.113" (Aman!)

  // 1. Jumper Without MOC/Authorized Jumper (was: Remaining Jumper List)
  const remListY = 0.56;
  const remListH = 2.65;

  slide.addShape("rect", {
    x: colX, y: remListY, w: colW, h: remListH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });

  const countBadge = ` (${nonAuthorizedJumpers.length})`;
  slide.addText(`Jumper Without MOC/Authorized Jumper${countBadge}`, {
    x: colX + 0.12, y: remListY + 0.05, w: colW - 0.24, h: 0.18,
    fontSize: 10, bold: true, color: "1E3A8A"
  });

  const remHeaders = [
    { text: "No", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "ID", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "PLC", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "Area", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "Category", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
  ];

  const nonAuthItems = (nonAuthorizedJumpers || []).slice(0, 8);
  const remData = nonAuthItems.length > 0
    ? nonAuthItems.map((r, i) => [
        { text: String(i + 1), options: { fontSize: 7 } },
        { text: r.jumperId || "—", options: { fontSize: 7, bold: true } },
        { text: r.plc || "—", options: { fontSize: 7 } },
        { text: AREA_LABELS[r.areaId] || r.areaId || "—", options: { fontSize: 7 } },
        { text: r.category || "—", options: { fontSize: 7 } },
      ])
    : [[
        { text: "Tidak ada record Non-Authorized", options: { fontSize: 7, colspan: 5, color: "64748B" } }
      ]];

  const remRows = [remHeaders, ...remData];

  slide.addTable(remRows, {
    x: colX + 0.08, y: remListY + 0.26, w: colW - 0.16, h: remListH - 0.32,
    colW: [0.30, 0.65, 0.72, 1.08, 1.08],
    border: { color: "E2E8F0", pt: 0.5 },
    fill: "FFFFFF",
    autoPage: false
  });

  // 2. PLCs With Active Jumper / Total PLCs Card
  const plcRatioY = 3.28;
  const plcRatioH = 0.88;

  slide.addShape("rect", {
    x: colX, y: plcRatioY, w: colW, h: plcRatioH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });
  slide.addText("PLCs With Active Jumper / Total PLCs", {
    x: colX + 0.12, y: plcRatioY + 0.06, w: colW - 0.24, h: 0.16,
    fontSize: 9, bold: true, color: "1E3A8A"
  });

  if (plcMetricResult.ok) {
    const pct = plcMetricResult.percentage !== null ? plcMetricResult.percentage.toFixed(1) : "—";
    const w1 = 1.35;
    const w2 = 1.15;
    const w3 = 1.15;
    const gap = 0.045;

    // Kolom 1 (Kiri): 2 / 63
    const col1X = colX + 0.12;
    slide.addText(`${plcMetricResult.plcsWithActive} / ${plcMetricResult.totalPlcInScope}`, {
      x: col1X, y: plcRatioY + 0.22, w: w1, h: 0.36,
      fontSize: 15, bold: true, color: "0F172A", align: "left", valign: "top"
    });
    slide.addText("PLCs with active jumper / Total PLCs in Scope", {
      x: col1X, y: plcRatioY + 0.58, w: w1, h: 0.26,
      fontSize: 7.2, bold: true, color: "64748B", align: "left", valign: "top"
    });

    // Divider 1
    const div1X = col1X + w1 + gap;
    slide.addShape("line", {
      x: div1X, y: plcRatioY + 0.22, w: 0, h: 0.56,
      line: { color: "E2E8F0", width: 1 }
    });

    // Kolom 2 (Tengah): 96.8%
    const col2X = div1X + gap;
    slide.addText(`${pct}%`, {
      x: col2X, y: plcRatioY + 0.18, w: w2, h: 0.40,
      fontSize: 18, bold: true, color: "1E3A8A", align: "center", valign: "top"
    });
    slide.addText("PLCs without active jumper", {
      x: col2X, y: plcRatioY + 0.58, w: w2, h: 0.26,
      fontSize: 7.2, bold: true, color: "64748B", align: "center", valign: "top"
    });

    // Divider 2
    const div2X = col2X + w2 + gap;
    slide.addShape("line", {
      x: div2X, y: plcRatioY + 0.22, w: 0, h: 0.56,
      line: { color: "E2E8F0", width: 1 }
    });

    // Kolom 3 (Kanan): Total Remove Jumper
    const col3X = div2X + gap;
    const removeVal = totalRemoveJumper !== null && totalRemoveJumper !== undefined ? String(totalRemoveJumper) : "0";
    slide.addText(removeVal, {
      x: col3X, y: plcRatioY + 0.18, w: w3, h: 0.40,
      fontSize: 18, bold: true, color: "0F172A", align: "right", valign: "top"
    });
    slide.addText("Total Remove Jumper", {
      x: col3X, y: plcRatioY + 0.58, w: w3, h: 0.26,
      fontSize: 7.2, bold: true, color: "64748B", align: "right", valign: "top"
    });
  } else {
    slide.addText(plcMetricResult.reason || "Belum tersedia", {
      x: colX + 0.12, y: plcRatioY + 0.30, w: colW - 0.24, h: 0.30,
      fontSize: 8.5, color: "E11D48"
    });
  }

  // 3. Count per PLC Chart (Kanan Bawah)
  const plcChartY = 4.24;
  const plcChartH = 3.00; // 4.24 + 3.00 = 7.24 <= 7.28" (Aman!)

  slide.addShape("rect", {
    x: colX, y: plcChartY, w: colW, h: plcChartH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });
  slide.addText("Count of Remaining Jumper on PLC PP Area", {
    x: colX + 0.12, y: plcChartY + 0.06, w: colW - 0.24, h: 0.18,
    fontSize: 9, bold: true, color: "1E3A8A"
  });

  if (jumperPerPlc.length > 0) {
    const plcLabels = jumperPerPlc.map((p) => p.plc);
    const afiVals = jumperPerPlc.map((p) => p.byCategory["AFI"] ?? 0);
    const sbVals = jumperPerPlc.map((p) => p.byCategory["Shortbranches"] ?? 0);
    const forcVals = jumperPerPlc.map((p) => p.byCategory["Forces"] ?? 0);

    const plcChartData = [
      { name: "AFI", labels: plcLabels, values: afiVals },
      { name: "Shortbranches", labels: plcLabels, values: sbVals },
      { name: "Forces", labels: plcLabels, values: forcVals },
    ];

    try {
      slide.addChart(pptx.ChartType.bar, plcChartData, {
        x: colX + 0.08, y: plcChartY + 0.28, w: colW - 0.16, h: plcChartH - 0.36,
        chartColors: ["00B0F0", "BFBFBF", "008577"],
        showLegend: true,
        legendPos: "t",
        legendFontSize: 7.5,
        dataLabelValue: true,
        dataLabelFontSize: 7.5,
        valAxisFontSize: 7.5,
        catAxisFontSize: 7.5,
      });
    } catch (e) {
      slide.addText("PLC Bar Chart", {
        x: colX + 0.12, y: plcChartY + 0.8, w: colW - 0.24, h: 0.5,
        fontSize: 9, color: "64748B", align: "center"
      });
    }
  } else {
    slide.addText("Tidak ada data jumper aktif", {
      x: colX + 0.12, y: plcChartY + 1.0, w: colW - 0.24, h: 0.3,
      fontSize: 9, color: "64748B", align: "center"
    });
  }
}