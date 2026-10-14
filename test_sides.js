import PptxGenJS from 'pptxgenjs';
import { WEEK_40_BASELINE } from './src/model/state.js';
import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST } from './src/model/constants.js';
import { getAllChartSeries, getChartKey } from './src/logic/chartData.js';
import { calculateAreaSummariesFromWeeklyChart, remainingJumperList, authorizedMocCount, removedJumperCount, remainingPlcRatio, jumperCountPerPlc } from './src/logic/selectors.js';
import { CATEGORY_COLORS, ACTUAL_COLOR } from './src/preview/chartRenderer.js';

const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
const config = state.config;
const reportingYear = config.reportingYear;
const reportingWeek = config.reportingWeek;
const reportingWeekLabel = `W${reportingWeek}`;
const weekLabels = config.weekLabels || [];
const appConfig = {
  reporting: { identificationYearFilter: config.identificationYearFilter ?? null },
  discrepancyWarning: { enabled: true, basis: null },
};

const remainingResult = remainingJumperList(state.jumperRegister, appConfig);
const authorizedResult = authorizedMocCount(state.jumperRegister);
const removedResult = removedJumperCount(state.jumperRegister, reportingYear, reportingWeekLabel);
const plcRatioResult = remainingPlcRatio(state.jumperRegister, config.totalPlcInScope);
const jumperPerPlc = jumperCountPerPlc(state.jumperRegister);

// Test Left vs Right
async function testSides() {
  // Test Bottom Left alone
  {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();
    
    // Bottom left code
    const startX = 0.3;
    const startY = 4.65;
    const totalW = 8.16;
    const kpiCardW = 3.98;
    const kpiCardH = 0.65;

    slide.addShape("rect", { x: startX, y: startY, w: kpiCardW, h: kpiCardH, fill: { color: "FFFFFF" } });
    slide.addText("Total Jumper with Authorized/MoC", { x: startX + 0.1, y: startY + 0.05, w: kpiCardW - 0.2, h: 0.18, fontSize: 8 });
    slide.addText(String(authorizedResult.count), { x: startX + 0.1, y: startY + 0.24, w: kpiCardW - 0.2, h: 0.34, fontSize: 16 });

    const kpi2X = startX + kpiCardW + 0.2;
    slide.addShape("rect", { x: kpi2X, y: startY, w: kpiCardW, h: kpiCardH, fill: { color: "FFFFFF" } });
    slide.addText(`Total Removed (${reportingWeekLabel}, ${reportingYear || "—"})`, { x: kpi2X + 0.1, y: startY + 0.05, w: kpiCardW - 0.2, h: 0.18, fontSize: 8 });
    slide.addText(String(removedResult.count), { x: kpi2X + 0.1, y: startY + 0.24, w: kpiCardW - 0.2, h: 0.34, fontSize: 16 });

    const tableY = startY + kpiCardH + 0.12;
    const tableH = 1.95;
    slide.addText("Jumper Update Table", { x: startX, y: tableY, w: totalW, h: 0.2, fontSize: 9 });

    const tableHeader = [
      { text: "PLC", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
      { text: "Update Jumper", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
      { text: "Installed", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
      { text: "Authorized", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
      { text: "Due Date", options: { bold: true, fill: "F1F5F9", color: "1E293B", fontSize: 7.5 } },
    ];
    const tableRows = (state.jumperRegister || []).slice(0, 6).map((r) => {
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
    slide.addTable([tableHeader, ...tableRows], {
      x: startX, y: tableY + 0.22, w: totalW, h: tableH - 0.25,
      colW: [0.9, 3.8, 1.2, 0.9, 1.36],
      border: { color: "CBD5E1", pt: 0.5 },
      fill: "FFFFFF",
      autoPage: false
    });
    await pptx.writeFile({ fileName: 'test_bottom_left.pptx' });
  }

  // Test Right Column alone
  {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();
    
    const colX = 8.7;
    const colW = 4.33;
    const remListY = 0.72;
    const remListH = 2.65;

    slide.addShape("rect", { x: colX, y: remListY, w: colW, h: remListH, fill: { color: "FFFFFF" } });
    slide.addText("Remaining Jumper List", { x: colX + 0.15, y: remListY + 0.08, w: colW - 0.3, h: 0.22, fontSize: 9.5 });

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
    slide.addTable([remHeaders, ...remData], {
      x: colX + 0.1, y: remListY + 0.35, w: colW - 0.2, h: remListH - 0.5,
      colW: [0.35, 0.75, 0.65, 2.38],
      border: { color: "E2E8F0", pt: 0.5 },
      fill: "FFFFFF",
      autoPage: false
    });

    // PLC Ratio
    const plcRatioY = 3.48;
    const plcRatioH = 0.95;
    slide.addShape("rect", { x: colX, y: plcRatioY, w: colW, h: plcRatioH, fill: { color: "FFFFFF" } });
    slide.addText("Remaining PLC Ratio", { x: colX + 0.15, y: plcRatioY + 0.08, w: colW - 0.3, h: 0.18, fontSize: 8.5 });
    slide.addText("4 / 69 (5.8%)", { x: colX + 0.15, y: plcRatioY + 0.3, w: colW - 0.3, h: 0.35, fontSize: 16 });

    // PLC Chart
    const plcChartY = 4.54;
    const plcChartH = 2.72;
    slide.addShape("rect", { x: colX, y: plcChartY, w: colW, h: plcChartH, fill: { color: "FFFFFF" } });
    slide.addText("Count of Remaining Jumper on PLC PP Area", { x: colX + 0.15, y: plcChartY + 0.08, w: colW - 0.3, h: 0.22, fontSize: 8.5 });

    const plcLabels = jumperPerPlc.map((p) => p.plc);
    const afiVals = jumperPerPlc.map((p) => p.byCategory["AFI"] ?? 0);
    const sbVals = jumperPerPlc.map((p) => p.byCategory["Shortbranches"] ?? 0);
    const forcVals = jumperPerPlc.map((p) => p.byCategory["Forces"] ?? 0);

    const plcChartData = [
      { name: "AFI", labels: plcLabels, values: afiVals },
      { name: "Shortbranches", labels: plcLabels, values: sbVals },
      { name: "Forces", labels: plcLabels, values: forcVals },
    ];
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

    await pptx.writeFile({ fileName: 'test_right_col.pptx' });
  }

  console.log('Done generating sides');
}

testSides().catch(console.error);
