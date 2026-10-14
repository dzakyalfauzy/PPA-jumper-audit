import fs from 'fs';

// Let's modify pptxExporter so that the 12 charts use a single chartType:
// Either combo with clean options or let's test why _build12Charts failed in test_limit_1.
// Notice in test_limit_1:
// slide.addShape("oval", { ... }) was called before addChart, or is it catAxisLabelPos: "low"?
async function testChartOpts() {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();

  // Test what was inside _build12Charts:
  const chartDataTypes = [
    {
      type: pptx.ChartType.bar,
      data: [{ name: "Plan", labels: ["W38", "W39", "W40"], values: [2, 2, 2] }],
      options: { chartColors: ["BFBFBF"], dataLabelValue: true }
    },
    {
      type: pptx.ChartType.line,
      data: [{ name: "Actual", labels: ["W38", "W39", "W40"], values: [2, 2, 2] }],
      options: { chartColors: ["A52A98"], dataLabelValue: true, lineDataSymbol: "square" }
    }
  ];

  // Options in _build12Charts:
  slide.addChart(chartDataTypes, null, {
    x: 0.5, y: 1.5, w: 2, h: 1,
    showLegend: true,
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

  await pptx.writeFile({ fileName: 'test_12_isolated_opts.pptx' });
}

testChartOpts().catch(console.error);
