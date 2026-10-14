import PptxGenJS from 'pptxgenjs';
import { exportToPowerPoint } from './src/export/pptxExporter.js';
import { WEEK_40_BASELINE } from './src/model/state.js';
import fs from 'fs';

async function testExporterFullExact() {
  const fileContent = fs.readFileSync('./src/export/pptxExporter.js', 'utf8');

  // Let's test removing just the oval shapes inside _build12Charts
  const noOvals = fileContent.replace('slide.addShape("oval", {', '/* slide.addShape("oval", { */ if (false) slide.addShape("oval", {');
  fs.writeFileSync('./src/export/pptx_no_ovals.js', noOvals);
  const modOvals = await import('./src/export/pptx_no_ovals.js');
  await modOvals.exportToPowerPoint(JSON.parse(JSON.stringify(WEEK_40_BASELINE)), PptxGenJS);
  fs.renameSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx', 'test_no_ovals.pptx');
  console.log('Saved test_no_ovals.pptx');
}

testExporterFullExact().catch(console.error);
