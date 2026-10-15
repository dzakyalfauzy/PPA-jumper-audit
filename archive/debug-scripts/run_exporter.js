import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';
import PptxGenJS from 'pptxgenjs';

async function runExporter() {
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  const res = await exportToPowerPoint(state, PptxGenJS);
  console.log('Exported file:', res.filename);
}

runExporter().catch(console.error);
