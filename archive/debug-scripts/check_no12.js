import JSZip from 'jszip';
import fs from 'fs';

async function testInjectChart() {
  // test_no_12.pptx is SUCCESS. It has all shapes, tables, and the 13th chart (PLC Bar Chart)!
  const data = fs.readFileSync('test_no_12.pptx');
  const zip = await JSZip.loadAsync(data);

  // Check what charts test_no_12 has:
  console.log('Charts in test_no_12:', Object.keys(zip.files).filter(f => f.includes('chart')));
  const rels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  console.log('Rels in test_no_12:', rels);
}

testInjectChart().catch(console.error);
