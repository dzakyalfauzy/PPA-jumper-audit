import JSZip from 'jszip';
import fs from 'fs';

async function diffXml() {
  const zipBad = await JSZip.loadAsync(fs.readFileSync('test_opt_1.pptx'));
  const s1Rels = await zipBad.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  console.log('slide1.xml.rels in test_opt_1:\n', s1Rels);
}

diffXml().catch(console.error);
