import JSZip from 'jszip';
import fs from 'fs';

async function testPositions() {
  const pptxMod = await import('pptxgenjs');
  const PptxGenJS = pptxMod.default;

  // Test 1: without dataLabelPosition
  const p1 = new PptxGenJS();
  const s1 = p1.addSlide();
  s1.addChart([
    { type: p1.ChartType.bar, data: [{ name: 'P', labels: ['W1', 'W2'], values: [1, 2] }], options: { dataLabelValue: true } },
    { type: p1.ChartType.line, data: [{ name: 'A', labels: ['W1', 'W2'], values: [1, 2] }], options: { dataLabelValue: true } }
  ], null, { x: 1, y: 1, w: 5, h: 3 });
  await p1.writeFile({ fileName: 'test_no_pos.pptx' });

  // Test 2: only bar with inEnd
  const p2 = new PptxGenJS();
  const s2 = p2.addSlide();
  s2.addChart([
    { type: p2.ChartType.bar, data: [{ name: 'P', labels: ['W1', 'W2'], values: [1, 2] }], options: { dataLabelValue: true, dataLabelPosition: 'inEnd' } },
    { type: p2.ChartType.line, data: [{ name: 'A', labels: ['W1', 'W2'], values: [1, 2] }], options: { dataLabelValue: true } }
  ], null, { x: 1, y: 1, w: 5, h: 3 });
  await p2.writeFile({ fileName: 'test_bar_inend.pptx' });

  // Test 3: only line with top
  const p3 = new PptxGenJS();
  const s3 = p3.addSlide();
  s3.addChart([
    { type: p3.ChartType.bar, data: [{ name: 'P', labels: ['W1', 'W2'], values: [1, 2] }], options: { dataLabelValue: true } },
    { type: p3.ChartType.line, data: [{ name: 'A', labels: ['W1', 'W2'], values: [1, 2] }], options: { dataLabelValue: true, dataLabelPosition: 't' } }
  ], null, { x: 1, y: 1, w: 5, h: 3 });
  await p3.writeFile({ fileName: 'test_line_top.pptx' });
  console.log('Done generating position tests');
}

testPositions().catch(console.error);
