import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';
import PptxGenJS from 'pptxgenjs';
import fs from 'fs';

// Let's test combinations by creating custom exporter functions
async function run() {
  const fileContent = fs.readFileSync('./src/export/pptxExporter.js', 'utf8');

  // Case A: Without _buildBottomLeft
  // Put temp files inside src/export/
  const codeNoBL = fileContent.replace('_buildBottomLeft(slide,', '// _buildBottomLeft(slide,');
  fs.writeFileSync('./src/export/pptx_no_bl.js', codeNoBL);
  const modBL = await import('./src/export/pptx_no_bl.js');
  await modBL.exportToPowerPoint(JSON.parse(JSON.stringify(WEEK_40_BASELINE)), PptxGenJS);
  fs.renameSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx', 'test_no_bl.pptx');

  // Case B: Without _buildRightColumn
  const codeNoRC = fileContent.replace('_buildRightColumn(slide,', '// _buildRightColumn(slide,');
  fs.writeFileSync('./src/export/pptx_no_rc.js', codeNoRC);
  const modRC = await import('./src/export/pptx_no_rc.js');
  await modRC.exportToPowerPoint(JSON.parse(JSON.stringify(WEEK_40_BASELINE)), PptxGenJS);
  fs.renameSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx', 'test_no_rc.pptx');

  // Case C: Without _build12Charts
  const codeNo12 = fileContent.replace('_build12Charts(slide,', '// _build12Charts(slide,');
  fs.writeFileSync('./src/export/pptx_no_12.js', codeNo12);
  const mod12 = await import('./src/export/pptx_no_12.js');
  await mod12.exportToPowerPoint(JSON.parse(JSON.stringify(WEEK_40_BASELINE)), PptxGenJS);
  fs.renameSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx', 'test_no_12.pptx');

  console.log('Generated combinations A, B, C');
}

run().catch(console.error);
