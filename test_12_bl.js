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
const calculatedSummaries = calculateAreaSummariesFromWeeklyChart(state.weeklyChartData, reportingWeek, reportingYear);
const allChartSeries = getAllChartSeries(state.weeklyChartData, weekLabels);

// Let's create two files:
// 1. All sections EXCEPT _build12Charts (we know this was test_no_12 which succeeded)
// 2. All sections EXCEPT _buildBottomLeft
// 3. All sections EXCEPT _buildRightColumn
// Wait! Earlier:
// test_no_12 succeeded.
// test_12_real_charts succeeded.
// test_bottom_left succeeded.
// test_right_col succeeded.
// Why did test_all_13_charts succeed (12 charts + right col)?
// Let's test 12 charts + bottom left!

async function test12PlusBL() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();

  // 1. 12 charts
  AREA_ID_LIST.forEach((areaId, areaIdx) => {
    const x = 0.3 + areaIdx * 2.07;
    CATEGORY_LIST.forEach((category, catIdx) => {
      const y = 1.35 + 0.26 + catIdx * 1.03;
      const key = getChartKey(areaId, category);
      const series = allChartSeries.get(key);
      const pData = (series?.planSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const aData = (series?.actualSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const labels = series?.labels && series.labels.length > 0 ? series.labels : ["W38", "W39", "W40", "W41", "W42"];

      slide.addChart([
        { type: pptx.ChartType.bar, data: [{ name: "Plan", labels, values: pData }], options: { chartColors: ["BFBFBF"] } },
        { type: pptx.ChartType.line, data: [{ name: "Actual", labels, values: aData }], options: { chartColors: ["A52A98"] } }
      ], null, { x, y: y + 0.15, w: 1.95, h: 0.8 });
    });
  });

  // 2. Bottom left (table)
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
    x: 0.3, y: 5.5, w: 8.16, h: 1.7,
    colW: [0.9, 3.8, 1.2, 0.9, 1.36],
    border: { color: "CBD5E1", pt: 0.5 },
    fill: "FFFFFF",
    autoPage: false
  });

  await pptx.writeFile({ fileName: 'test_12_plus_bl.pptx' });
}

test12PlusBL().catch(console.error);
