import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';
import PptxGenJS from 'pptxgenjs';

async function testCurrent() {
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  await exportToPowerPoint(state, PptxGenJS);
  console.log('Export finished');
}

testCurrent().catch(console.error);
