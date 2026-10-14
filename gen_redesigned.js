import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';
import PptxGenJS from 'pptxgenjs';
import fs from 'fs';

async function generateRedesignedPptx() {
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  // Change title slightly to differentiate output file
  state.config.title = "PPA JUMPER AUDIT WEEK-40 (REDESIGNED)";
  const res = await exportToPowerPoint(state, PptxGenJS);
  console.log("SUCCESS generated:", res.filename);
}

generateRedesignedPptx().catch(console.error);
