import PptxGenJS from 'pptxgenjs';
import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';

// We will test removing one function call at a time from pptxExporter
// In pptxExporter:
// _buildHeader
// _buildAreaSummaryCards
// _build12Charts
// _buildBottomLeft
// _buildRightColumn

async function testExportExclusions() {
  const mod = await import('./src/export/pptxExporter.js');
  // Let's create variants of export by commenting out sections
}
