import PptxGenJS from 'pptxgenjs';
import fs from 'fs';

// Let's copy pptxExporter functions and test subsets
import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST } from './src/model/constants.js';
import {
  remainingJumperList,
  authorizedMocCount,
  removedJumperCount,
  remainingPlcRatio,
  jumperCountPerPlc,
  calculateAreaSummariesFromWeeklyChart,
} from './src/logic/selectors.js';
import { getAllChartSeries, getChartKey } from './src/logic/chartData.js';
import { CATEGORY_COLORS, ACTUAL_COLOR } from './src/preview/chartRenderer.js';
import { WEEK_40_BASELINE } from './src/model/state.js';

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

async function runCombinations() {
  // Let's test calling the exact functions from pptxExporter
  const exporter = await import('./src/export/pptxExporter.js');
  // Since functions are internal, let's test building full slide except one section
}
