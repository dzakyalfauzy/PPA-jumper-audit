import JSZip from 'jszip';
import fs from 'fs';

async function testSingleInstances() {
  const pptxMod = await import('pptxgenjs');
  const PptxGenJS = pptxMod.default;

  // Generate test with dataLabelPosition alone
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  const chartTypes = [
    {
      type: pptx.ChartType.bar,
      data: [{ name: 'Plan', labels: ['W1', 'W2'], values: [1, 2] }],
      options: { dataLabelValue: true, dataLabelPosition: 'inEnd' }
    },
    {
      type: pptx.ChartType.line,
      data: [{ name: 'Actual', labels: ['W1', 'W2'], values: [1, 2] }],
      options: { dataLabelValue: true, dataLabelPosition: 'top' }
    }
  ];
  slide.addChart(chartTypes, null, { x: 1, y: 1, w: 5, h: 3 });
  await pptx.writeFile({ fileName: 'test_clean_combo.pptx' });
  console.log('Written test_clean_combo.pptx with new PptxGenJS instance');
}

testSingleInstances().catch(console.error);
