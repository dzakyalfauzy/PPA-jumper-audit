import PptxGenJS from 'pptxgenjs';

async function testBarVsCombo() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();
  
  // Try 1 single bar chart with options vs combo
  slide.addChart(pptx.ChartType.bar, [
    { name: 'Plan', labels: ['W1', 'W2'], values: [1, 2] },
    { name: 'Actual', labels: ['W1', 'W2'], values: [3, 4] }
  ], {
    x: 1, y: 1, w: 4, h: 2,
    chartColors: ['BFBFBF', 'A52A98'],
    dataLabelValue: true
  });

  await pptx.writeFile({ fileName: 'test_standard_barchart.pptx' });
}

testBarVsCombo().catch(console.error);
