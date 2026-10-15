import PptxGenJS from 'pptxgenjs';
import { WEEK_40_BASELINE } from './src/model/state.js';
import { AREA_ID_LIST, AREA_LABELS, CATEGORY_LIST } from './src/model/constants.js';
import { getAllChartSeries, getChartKey } from './src/logic/chartData.js';
import { calculateAreaSummariesFromWeeklyChart } from './src/logic/selectors.js';
import { CATEGORY_COLORS, ACTUAL_COLOR } from './src/preview/chartRenderer.js';

const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
const config = state.config;
const reportingYear = config.reportingYear;
const reportingWeek = config.reportingWeek;
const weekLabels = config.weekLabels || [];
const calculatedSummaries = calculateAreaSummariesFromWeeklyChart(state.weeklyChartData, reportingWeek, reportingYear);
const allChartSeries = getAllChartSeries(state.weeklyChartData, weekLabels);

async function testCombo12RealData() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();

  const colStartX = 0.3;
  const colStartY = 1.35;
  const colW = 1.95;
  const colGap = 0.12;
  const chartH = 0.95;
  const chartGap = 0.08;

  AREA_ID_LIST.forEach((areaId, areaIdx) => {
    const x = colStartX + areaIdx * (colW + colGap);
    CATEGORY_LIST.forEach((category, catIdx) => {
      const y = colStartY + 0.26 + catIdx * (chartH + chartGap);
      const key = getChartKey(areaId, category);
      const series = allChartSeries.get(key);

      const pData = (series?.planSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const aData = (series?.actualSeries || []).map((v) => (v === null || v === undefined ? 0 : v));
      const labels = series?.labels && series.labels.length > 0 ? series.labels : ["W38", "W39", "W40", "W41", "W42"];

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

      slide.addChart(chartDataTypes, null, {
        x, y: y + 0.15, w: colW, h: chartH - 0.15,
        showLegend: catIdx === 0,
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
    });
  });

  await pptx.writeFile({ fileName: 'test_12_real_charts.pptx' });
  console.log('Written test_12_real_charts.pptx');
}

testCombo12RealData().catch(console.error);
