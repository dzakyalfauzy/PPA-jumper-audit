import fs from 'fs';
import JSZip from 'jszip';

async function testFixRels() {
  const data = fs.readFileSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx');
  const zip = await JSZip.loadAsync(data);

  let relsXml = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  // Replace Target="/ppt/charts/ with Target="../charts/
  const fixedRelsXml = relsXml.replaceAll('Target="/ppt/charts/', 'Target="../charts/');
  zip.file('ppt/slides/_rels/slide1.xml.rels', fixedRelsXml);

  const fixedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('PPA_FIXED_TEST.pptx', fixedBuffer);
  console.log('Saved PPA_FIXED_TEST.pptx with relative targets');
}

testFixRels().catch(console.error);
