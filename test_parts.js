import JSZip from 'jszip';
import fs from 'fs';

async function testExporterFullStepByStep() {
  const { exportToPowerPoint } = await import('./src/export/pptxExporter.js');
  const { WEEK_40_BASELINE } = await import('./src/model/state.js');
  const PptxGenJS = (await import('pptxgenjs')).default;
  const state = JSON.parse(JSON.stringify(WEEK_40_BASELINE));

  // Let's modify pptxExporter in memory or call its parts
}
