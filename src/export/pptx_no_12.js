/**
 * pptxExporter.js
 * Generator PowerPoint (PPTX) 16:9 satu slide yang sepenuhnya editable.
 *
 * Menggunakan PptxGenJS untuk membuat:
 *   - Header dan metadata laporan editable.
 *   - 4 Kartu Area Summary editable.
 *   - 12 Grafik editable (native combo chart Bar + Line dengan data label dan legenda).
 *   - Remaining Jumper List (tabel native PowerPoint editable).
 *   - Total Jumper with Authorized/MoC KPI card editable.
 *   - Total Removed Jumper KPI card editable.
 *   - Jumper Update Table (tabel native PowerPoint editable).
 *   - Remaining PLC Ratio card editable.
 *   - Grafik Count of Remaining Jumper on PLC PP Area (native bar chart editable).
 *
 * Seluruh data bersumber dari Single Source of Truth (state + selectors).
 */

"use strict";

import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST } from "../model/constants.js";
import {
  remainingJumperList,
  authorizedMocCount,
  removedJumperCount,
  remainingPlcRatio,
  jumperCountPerPlc,
  calculateAreaSummariesFromWeeklyChart,
} from "../logic/selectors.js";
import { getAllChartSeries, getChartKey } from "../logic/chartData.js";
import { CATEGORY_COLORS, ACTUAL_COLOR } from "../preview/chartRenderer.js";
import { validateFullState } from "../model/validation.js";

// Layout Widescreen 16:9 di PowerPoint: 13.33 x 7.5 inci
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;

/**
 * Generate dan unduh presentasi PPTX satu slide yang editable.
 * @param {object} state - state aplikasi (getState())
 * @param {object} [PptxGenJSLib] - Library PptxGenJS (opsional, jika diinjeksi atau diambil dari window/node)
 * @returns {Promise<{ success: boolean, filename?: string, error?: string }>}
 */
export async function exportToPowerPoint(state, PptxGenJSLib = null) {
  // 1. Validasi State
  const validation = validateFullState(state);
  if (validation.errors.length > 0) {
    throw new Error(`Ekspor diblokir karena terdapat ${validation.errors.length} error validasi: ${validation.errors[0]}`);
  }

  // 2. Load PptxGenJS
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
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "PPA Automation";
  pptx.company = "PPA Process Plant Area";
  pptx.title = state.config.title || "PPA Jumper Audit";

  const slide = pptx.addSlide();
  slide.background = { color: "F8FAFC" };

  // 3. Hitung Data dan KPI (Single Source of Truth)
  const config = state.config;
  const reportingYear = config.reportingYear;
  const reportingWeek = config.reportingWeek;
  const reportingWeekLabel = reportingWeek != null ? `W${reportingWeek}` : "—";
  const weekLabels = config.weekLabels || [];

  const appConfig = {
    reporting: { identificationYearFilter: config.identificationYearFilter ?? null },
    discrepancyWarning: { enabled: true, basis: null },
  };

  const remainingResult = remainingJumperList(state.jumperRegister, appConfig);
  const authorizedResult = authorizedMocCount(state.jumperRegister);
  const removedResult = reportingWeekLabel !== "—"
    ? removedJumperCount(state.jumperRegister, reportingYear, reportingWeekLabel)
    : { count: 0, records: [] };
  const plcRatioResult = remainingPlcRatio(state.jumperRegister, config.totalPlcInScope);
  const jumperPerPlc = jumperCountPerPlc(state.jumperRegister);
  const calculatedSummaries = calculateAreaSummariesFromWeeklyChart(state.weeklyChartData, reportingWeek, reportingYear);
  const allChartSeries = getAllChartSeries(state.weeklyChartData, weekLabels);

  // 4. Header Slide
  _buildHeader(slide, config, reportingWeekLabel);

  // 5. Area Summary Cards (Kiri Atas)
  _buildAreaSummaryCards(slide, calculatedSummaries);

  // 6. 12 Charts Grid (Kiri Tengah)
  // _build12Charts(slide, pptx, allChartSeries, calculatedSummaries, weekLabels);

  // 7. Bottom Left: KPI Cards & Jumper Update Table
  _buildBottomLeft(slide, authorizedResult, removedResult, reportingWeekLabel, reportingYear, state.jumperRegister);

  // 8. Right Column: Remaining Jumper List, Remaining PLC, dan PLC Chart
  _buildRightColumn(slide, pptx, remainingResult, plcRatioResult, jumperPerPlc);

  // 9. Export & Unduh
  const safeTitle = (config.title || "PPA_Jumper_Audit").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeTitle}_${reportingWeekLabel}_${reportingYear || ""}.pptx`;

  await pptx.writeFile({ fileName: filename });
  return { success: true, filename };
}

// ---------------------------------------------------------------------------
// BUILDER SECTIONS
// ---------------------------------------------------------------------------

function _buildHeader(slide, config, reportingWeekLabel) {
  // Banner Navy
  slide.addShape("rect", {
    x: 0, y: 0, w: SLIDE_W, h: 0.65,
    fill: { color: "1E3A8A" },
    line: { color: "1E3A8A" }
  });

  // Judul
  slide.addText(config.title || "PPA JUMPER AUDIT", {
    x: 0.3, y: 0.08, w: 7.5, h: 0.48,
    fontSize: 16, bold: true, color: "FFFFFF",
    align: "left", valign: "middle"
  });

  // Meta Periode
  const metaText = `${config.plantArea || "Process Plant Area"}  |  Week ${config.reportingWeek || "—"} · ${config.reportingYear || "—"}  |  Period: ${reportingWeekLabel} (${config.reportingYear || "—"})`;
  slide.addText(metaText, {
    x: 7.8, y: 0.08, w: 5.2, h: 0.48,
    fontSize: 11, bold: false, color: "E2E8F0",
    align: "right", valign: "middle"
  });
}

function _buildAreaSummaryCards(slide, calculatedSummaries) {
  const startX = 0.3;
  const startY = 0.72;
  const cardW = 1.95;
  const cardH = 0.58;
  const gap = 0.12;

  AREA_ID_LIST.forEach((areaId, i) => {
    const x = startX + i * (cardW + gap);
    const summary = calculatedSummaries[areaId];
    const val = summary && summary.totalActual !== null ? String(summary.totalActual) : "—";
    const label = AREA_LABELS[areaId] || areaId;

    // Card background
    slide.addShape("rect", {
      x, y: startY, w: cardW, h: cardH,
      fill: { color: "FFFFFF" },
      line: { color: "CBD5E1", width: 1 }
    });

    // Label Header
    slide.addText(label.toUpperCase(), {
      x, y: startY + 0.04, w: cardW, h: 0.2,
      fontSize: 8.5, bold: true, color: "1E3A8A",
      align: "center", valign: "top"
    });

    // Count value
    slide.addText(`${val} jumpers`, {
      x, y: startY + 0.22, w: cardW, h: 0.32,
      fontSize: 12, bold: true, color: "0F172A",
      align: "center", valign: "middle"
    });
  });
}

function _build12Charts(slide, pptx, allChartSeries, calculatedSummaries, weekLabels) {
  const colStartX = 0.3;
  const colStartY = 1.35;
  const colW = 1.95;
  const colGap = 0.12;
  const chartH = 0.95;
  const chartGap = 0.08;

  AREA_ID_LIST.forEach((areaId, areaIdx) => {
    const x = colStartX + areaIdx * (colW + colGap);
    const summary = calculatedSummaries[areaId];
    const totalJumpers = summary && summary.totalActual !== null ? ` (${summary.totalActual} jumpers)` : "";

    // Header Kolom Area
    slide.addShape("rect", {
      x, y: colStartY, w: colW, h: 0.24,
      fill: { color: "1E3A8A" },
      line: { color: "1E3A8A" }
    });
    slide.addText(`${AREA_LABELS[areaId]}${totalJumpers}`, {
      x, y: colStartY, w: colW, h: 0.24,
      fontSize: 8, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });

    // 3 Kategori Charts
    CATEGORY_LIST.forEach((category, catIdx) => {
      const y = colStartY + 0.26 + catIdx * (chartH + chartGap);
      const key = getChartKey(areaId, category);
      const series = allChartSeries.get(key);

      // Label Judul Kategori
      const catColorHex = (CATEGORY_COLORS[category]?.base || "#0EA5E9").replace("#", "");
      slide.addShape("oval", {
        x: x + 0.08, y: y + 0.04, w: 0.08, h: 0.08,
        fill: { color: catColorHex },
        line: { color: catColorHex }
      });
      slide.addText(category, {
        x: x + 0.2, y: y, w: colW - 0.25, h: 0.16,
        fontSize: 7.5, bold: true, color: "334155",
        align: "left", valign: "middle"
      });

      // Data Chart Native
      const pData = (series?.planSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const aData = (series?.actualSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const labels = series?.labels && series.labels.length > 0 ? series.labels : (weekLabels.length > 0 ? weekLabels : ["W40"]);

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
            dataLabelFontSize: 7,
          }
        },
        {
          type: pptx.ChartType.line,
          data: [{ name: "Actual", labels, values: aData }],
          options: {
            chartColors: [actualColorHex],
            dataLabelValue: true,
            dataLabelFontColor: actualColorHex,
            dataLabelFontSize: 7.5,
            lineDataSymbol: "square",
            lineDataSymbolSize: 5,
            lineSize: 1.8
          }
        }
      ];

      try {
        slide.addChart(chartDataTypes, null, {
          x, y: y + 0.15, w: colW, h: chartH - 0.15,
          showLegend: catIdx === 0, // Tampilkan legenda hanya di chart baris pertama agar rapi
          legendPos: "t",
          legendFontSize: 6.5,
          showValAxisTitle: false,
          showCatAxisTitle: false,
          valAxisHidden: false,
          catAxisHidden: false,
          valAxisFontSize: 6.5,
          catAxisFontSize: 6.5,
          catAxisLabelPos: "low"
        });
      } catch (err) {
        // Fallback visual jika chart gagal di-render
        slide.addShape("rect", {
          x, y: y + 0.15, w: colW, h: chartH - 0.15,
          fill: { color: "F1F5F9" },
          line: { color: "CBD5E1" }
        });
        slide.addText(`${category} Data`, {
          x, y: y + 0.15, w: colW, h: chartH - 0.15,
          fontSize: 8, color: "64748B", align: "center", valign: "middle"
        });
      }
    });
  });
}

function _buildBottomLeft(slide, authorizedResult, removedResult, reportingWeekLabel, reportingYear, jumperRegister) {
  const startX = 0.3;
  const startY = 4.65;
  const totalW = 8.16;

  // 1. KPI Cards Row
  const kpiCardW = 3.98;
  const kpiCardH = 0.65;

  // KPI 1: Authorized/MoC
  slide.addShape("rect", {
    x: startX, y: startY, w: kpiCardW, h: kpiCardH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });
  slide.addText("Total Jumper with Authorized/MoC", {
    x: startX + 0.1, y: startY + 0.05, w: kpiCardW - 0.2, h: 0.18,
    fontSize: 8, bold: true, color: "1E3A8A"
  });
  slide.addText(String(authorizedResult.count), {
    x: startX + 0.1, y: startY + 0.24, w: kpiCardW - 0.2, h: 0.34,
    fontSize: 16, bold: true, color: "0F172A"
  });

  // KPI 2: Total Removed
  const kpi2X = startX + kpiCardW + 0.2;
  slide.addShape("rect", {
    x: kpi2X, y: startY, w: kpiCardW, h: kpiCardH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });
  slide.addText(`Total Removed (${reportingWeekLabel}, ${reportingYear || "—"})`, {
    x: kpi2X + 0.1, y: startY + 0.05, w: kpiCardW - 0.2, h: 0.18,
    fontSize: 8, bold: true, color: "1E3A8A"
  });
  slide.addText(String(removedResult.count), {
    x: kpi2X + 0.1, y: startY + 0.24, w: kpiCardW - 0.2, h: 0.34,
    fontSize: 16, bold: true, color: "0F172A"
  });

  // 2. Jumper Update Table
  const tableY = startY + kpiCardH + 0.12;
  const tableH = 1.95;

  slide.addText("Jumper Update Table", {
    x: startX, y: tableY, w: totalW, h: 0.2,
    fontSize: 9, bold: true, color: "1E3A8A"
  });

  const tableHeader = [
    { text: "PLC", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "Update Jumper", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "Installed", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "Authorized", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    { text: "Due Date", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
  ];

  const tableRows = (jumperRegister || []).slice(0, 6).map((r) => {
    const isAuth = r.authorizationStatus === "Authorized" && r.mocStatus === "Approved/Complete";
    const dueDateDisplay = r.dueDateStatus === "confirmed" && r.dueDate ? r.dueDate : "Perlu konfirmasi";
    return [
      { text: r.plc || "—", options: { fontSize: 7 } },
      { text: r.description || "—", options: { fontSize: 7 } },
      { text: r.installedWeekOrDate || "—", options: { fontSize: 7 } },
      { text: isAuth ? "✓" : "—", options: { fontSize: 7, align: "center" } },
      { text: dueDateDisplay, options: { fontSize: 7 } },
    ];
  });

  const allRows = [tableHeader, ...(tableRows.length > 0 ? tableRows : [[
    { text: "Tidak ada record", options: { fontSize: 7, colspan: 5 } }
  ]])];

  slide.addTable(allRows, {
    x: startX, y: tableY + 0.22, w: totalW, h: tableH - 0.25,
    colW: [0.9, 3.8, 1.2, 0.9, 1.36],
    border: { color: "CBD5E1", pt: 0.5 },
    fill: "FFFFFF",
    autoPage: false
  });
}

function _buildRightColumn(slide, pptx, remainingResult, plcRatioResult, jumperPerPlc) {
  const colX = 8.7;
  const colW = 4.33;

  // 1. Remaining Jumper List (Panel Kanan Atas)
  const remListY = 0.72;
  const remListH = 2.65;

  slide.addShape("rect", {
    x: colX, y: remListY, w: colW, h: remListH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });

  const countBadge = remainingResult.ok ? ` (${remainingResult.data.length})` : "";
  slide.addText(`Remaining Jumper List${countBadge}`, {
    x: colX + 0.15, y: remListY + 0.08, w: colW - 0.3, h: 0.22,
    fontSize: 9.5, bold: true, color: "1E3A8A"
  });

  const remHeaders = [
    { text: "No", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7 } },
    { text: "ID", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7 } },
    { text: "PLC", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7 } },
    { text: "Description", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7 } },
  ];

  const remData = (remainingResult.data || []).slice(0, 7).map((r, i) => [
    { text: String(i + 1), options: { fontSize: 6.8, align: "center" } },
    { text: r.jumperId || "—", options: { fontSize: 6.8, bold: true } },
    { text: r.plc || "—", options: { fontSize: 6.8 } },
    { text: r.description || "—", options: { fontSize: 6.8 } },
  ]);

  const remRows = [remHeaders, ...(remData.length > 0 ? remData : [[
    { text: "Tidak ada jumper yang memenuhi filter (BR-03)", options: { fontSize: 7, colspan: 4 } }
  ]])];

  slide.addTable(remRows, {
    x: colX + 0.1, y: remListY + 0.35, w: colW - 0.2, h: remListH - 0.5,
    colW: [0.35, 0.75, 0.65, 2.38],
    border: { color: "E2E8F0", pt: 0.5 },
    fill: "FFFFFF",
    autoPage: false
  });

  // 2. Remaining PLC Ratio Card
  const plcRatioY = 3.48;
  const plcRatioH = 0.95;

  slide.addShape("rect", {
    x: colX, y: plcRatioY, w: colW, h: plcRatioH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });
  slide.addText("Remaining PLC Ratio", {
    x: colX + 0.15, y: plcRatioY + 0.08, w: colW - 0.3, h: 0.18,
    fontSize: 8.5, bold: true, color: "1E3A8A"
  });

  if (plcRatioResult.ok) {
    const pct = (plcRatioResult.ratio * 100).toFixed(1);
    slide.addText(`${plcRatioResult.activePlcCount} / ${plcRatioResult.totalPlcInScope}  (${pct}%)`, {
      x: colX + 0.15, y: plcRatioY + 0.3, w: colW - 0.3, h: 0.35,
      fontSize: 16, bold: true, color: "0F172A"
    });
    slide.addText("PLC with active jumpers / Total PLC in Scope", {
      x: colX + 0.15, y: plcRatioY + 0.68, w: colW - 0.3, h: 0.18,
      fontSize: 7.5, color: "64748B"
    });
  } else {
    slide.addText(plcRatioResult.reason || "Belum tersedia", {
      x: colX + 0.15, y: plcRatioY + 0.35, w: colW - 0.3, h: 0.35,
      fontSize: 8, color: "E11D48"
    });
  }

  // 3. Count per PLC Chart (Kanan Bawah)
  const plcChartY = 4.54;
  const plcChartH = 2.72;

  slide.addShape("rect", {
    x: colX, y: plcChartY, w: colW, h: plcChartH,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", width: 1 }
  });
  slide.addText("Count of Remaining Jumper on PLC PP Area", {
    x: colX + 0.15, y: plcChartY + 0.08, w: colW - 0.3, h: 0.22,
    fontSize: 8.5, bold: true, color: "1E3A8A"
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
        x: colX + 0.1, y: plcChartY + 0.32, w: colW - 0.2, h: plcChartH - 0.42,
        chartColors: ["00B0F0", "BFBFBF", "008577"],
        showLegend: true,
        legendPos: "t",
        legendFontSize: 7,
        dataLabelValue: true,
        dataLabelFontSize: 7,
        valAxisFontSize: 7,
        catAxisFontSize: 7,
      });
    } catch (e) {
      slide.addText("PLC Bar Chart", {
        x: colX + 0.15, y: plcChartY + 0.8, w: colW - 0.3, h: 0.5,
        fontSize: 8, color: "64748B", align: "center"
      });
    }
  } else {
    slide.addText("Tidak ada data jumper aktif", {
      x: colX + 0.15, y: plcChartY + 1.0, w: colW - 0.3, h: 0.3,
      fontSize: 8, color: "64748B", align: "center"
    });
  }
}
