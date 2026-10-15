import JSZip from 'jszip';
import fs from 'fs';

async function testSectionBySection() {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const { WEEK_40_BASELINE } = await import('./src/model/state.js');
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));

  // Test Section 1: Header + Area Summary Cards
  {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };
    
    // Header
    slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.65, fill: { color: '1E3A8A' } });
    slide.addText('PPA JUMPER AUDIT', { x: 0.3, y: 0.08, w: 7.5, h: 0.48, color: 'FFFFFF' });
    
    // Area cards
    for (let i = 0; i < 4; i++) {
      slide.addShape('rect', { x: 0.3 + i * 2, y: 0.72, w: 1.95, h: 0.58, fill: { color: 'FFFFFF' } });
    }
    await pptx.writeFile({ fileName: 'sec_1_header.pptx' });
  }

  // Test Section 2: Header + Tables
  {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();
    slide.addTable([[{ text: 'Col 1' }, { text: 'Col 2' }]], { x: 0.5, y: 0.5, w: 5, h: 2 });
    await pptx.writeFile({ fileName: 'sec_2_tables.pptx' });
  }

  // Test Section 3: 13 charts (combo) without dLblPos
  {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    const slide = pptx.addSlide();
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      slide.addChart([
        { type: pptx.ChartType.bar, data: [{ name: 'P', labels: ['W1', 'W2'], values: [1, 2] }], options: { chartColors: ['BFBFBF'] } },
        { type: pptx.ChartType.line, data: [{ name: 'A', labels: ['W1', 'W2'], values: [1, 2] }], options: { chartColors: ['A52A98'] } }
      ], null, { x: 0.5 + col * 2, y: 0.5 + row * 2, w: 1.8, h: 1.8 });
    }
    await pptx.writeFile({ fileName: 'sec_3_12charts.pptx' });
  }

  console.log('Generated sections');
}

testSectionBySection().catch(console.error);
