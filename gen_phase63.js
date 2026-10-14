import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';
import PptxGenJS from 'pptxgenjs';

async function generatePhase63Pptx() {
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  state.config.title = "PPA JUMPER AUDIT WEEK-40 (PHASE 6.3 REFINED)";
  const res = await exportToPowerPoint(state, PptxGenJS);
  console.log("SUCCESS generated:", res.filename);
}

generatePhase63Pptx().catch(console.error);
