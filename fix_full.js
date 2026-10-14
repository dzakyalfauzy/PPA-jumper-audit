import JSZip from 'jszip';
import fs from 'fs';

async function testFullExportWithoutDlblPos() {
  const data = fs.readFileSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx');
  const zip = await JSZip.loadAsync(data);

  // In all chart xmls, remove dLblPos
  const chartFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/charts\/chart\d+\.xml$/));
  for (const cf of chartFiles) {
    let xml = await zip.file(cf).async('text');
    xml = xml.replaceAll('<c:dLblPos val="inEnd"/>', '');
    xml = xml.replaceAll('<c:dLblPos val="top"/>', '');
    zip.file(cf, xml);
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('PPA_FULL_TEST_FIXED.pptx', buf);
  console.log('Saved PPA_FULL_TEST_FIXED.pptx with all 13 charts cleaned');
}

testFullExportWithoutDlblPos().catch(console.error);
