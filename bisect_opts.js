import PptxGenJS from 'pptxgenjs';

const optCandidates = [
  { name: 'dataLabelValue', val: { dataLabelValue: true } },
  { name: 'dataLabelPosition', val: { dataLabelPosition: 'top' } },
  { name: 'dataLabelFontColor', val: { dataLabelFontColor: 'A52A98' } },
  { name: 'dataLabelFontSize', val: { dataLabelFontSize: 7 } },
  { name: 'lineDataSymbol', val: { lineDataSymbol: 'square' } },
  { name: 'lineDataSymbolSize', val: { lineDataSymbolSize: 5 } },
  { name: 'lineSize', val: { lineSize: 2 } },
  { name: 'chartOpts_legendPos', chartVal: { legendPos: 't' } },
  { name: 'chartOpts_catAxisLabelPos', chartVal: { catAxisLabelPos: 'low' } },
  { name: 'chartOpts_fontSizes', chartVal: { valAxisFontSize: 6.5, catAxisFontSize: 6.5 } }
];

async function testEach() {
  for (let i = 0; i < optCandidates.length; i++) {
    const c = optCandidates[i];
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();

    const chartTypes = [
      {
        type: pptx.ChartType.bar,
        data: [{ name: 'Plan', labels: ['W1', 'W2'], values: [1, 2] }],
        options: { chartColors: ['BFBFBF'], ...(c.val || {}) }
      },
      {
        type: pptx.ChartType.line,
        data: [{ name: 'Actual', labels: ['W1', 'W2'], values: [1, 2] }],
        options: { chartColors: ['A52A98'], ...(c.val || {}) }
      }
    ];

    slide.addChart(chartTypes, null, { x: 1, y: 1, w: 5, h: 3, ...(c.chartVal || {}) });
    await pptx.writeFile({ fileName: `C:\\Users\\ameli\\OneDrive\\Desktop\\PPA-FMDS\\test_opt_${i}.pptx` });
  }
  console.log('All candidate files generated');
}

testEach().catch(console.error);
