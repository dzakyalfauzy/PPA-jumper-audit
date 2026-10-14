import fs from 'fs';
import PptxGenJS from 'pptxgenjs';
import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';

// Let's run exportToPowerPoint on the actual baseline
async function testFull() {
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  await exportToPowerPoint(state, PptxGenJS);
  // Rename to test_full_final.pptx
  fs.copyFileSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx', 'test_full_final.pptx');
  console.log('Copied to test_full_final.pptx');
}

testFull().catch(console.error);
