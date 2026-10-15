import fs from 'fs';
import JSZip from 'jszip';

async function checkSlideRels() {
  const data = fs.readFileSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx');
  const zip = await JSZip.loadAsync(data);
  const relsXml = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  console.log('slide1.xml.rels content:\n', relsXml);
}

checkSlideRels().catch(console.error);
