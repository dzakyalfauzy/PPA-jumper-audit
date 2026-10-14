import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';
import PptxGenJS from 'pptxgenjs';

async function testExporterComponents() {
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));
  
  // We will build incrementally in separate files:
  // 1. Header + AreaSummary + 12 charts
  // 2. Header + AreaSummary + 12 charts + BottomLeft
  // 3. Header + AreaSummary + 12 charts + BottomLeft + RightColumn
}
