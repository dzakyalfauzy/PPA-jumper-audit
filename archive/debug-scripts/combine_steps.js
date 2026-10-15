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

async function combineSteps() {
  // Step 1: 12 charts + Right Column (including 13th chart)
  {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();

    // 12 combo charts
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

    // 13th chart (PLC Bar chart)
    const plcLabels = jumperPerPlc.map((p) => p.plc);
    const afiVals = jumperPerPlc.map((p) => p.byCategory["AFI"] ?? 0);
    const sbVals = jumperPerPlc.map((p) => p.byCategory["Shortbranches"] ?? 0);
    const forcVals = jumperPerPlc.map((p) => p.byCategory["Forces"] ?? 0);

    slide.addChart(pptx.ChartType.bar, [
      { name: "AFI", labels: plcLabels, values: afiVals },
      { name: "Shortbranches", labels: plcLabels, values: sbVals },
      { name: "Forces", labels: plcLabels, values: forcVals }
    ], { x: 8.7, y: 4.54, w: 4.1, h: 2.3 });

    await pptx.writeFile({ fileName: 'test_all_13_charts.pptx' });
  }

  // Step 2: 12 charts + Tables
  {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();

    AREA_ID_LIST.forEach((areaId, areaIdx) => {
      const x = 0.3 + areaIdx * 2.07;
      CATEGORY_LIST.forEach((category, catIdx) => {
        const y = 1.35 + 0.26 + catIdx * 1.03;
        slide.addChart([
          { type: pptx.ChartType.bar, data: [{ name: "P", labels: ["W1"], values: [1] }] },
          { type: pptx.ChartType.line, data: [{ name: "A", labels: ["W1"], values: [1] }] }
        ], null, { x, y, w: 1.95, h: 0.8 });
      });
    });

    // Add table
    slide.addTable([[{ text: 'A' }, { text: 'B' }]], { x: 0.3, y: 5.0, w: 8, h: 2 });
    await pptx.writeFile({ fileName: 'test_12charts_and_table.pptx' });
  }
}

combineSteps().catch(console.error);
