import JSZip from 'jszip';
import fs from 'fs';

async function testWhyLimit1Failed() {
  const zip = await JSZip.loadAsync(fs.readFileSync('test_limit_1.pptx'));
  const chartsInZip = Object.keys(zip.files).filter(f => f.match(/^ppt\/charts\/chart\d+\.xml$/));
  const relsXml = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  const relTargets = [...relsXml.matchAll(/Target="([^"]+)"/g)].map(m => m[1]);
  console.log('Charts in ZIP:', chartsInZip);
  console.log('Chart targets in rels:', relTargets.filter(t => t.includes('chart')));
}

testWhyLimit1Failed().catch(console.error);
