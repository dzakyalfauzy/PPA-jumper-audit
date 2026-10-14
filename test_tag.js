import JSZip from 'jszip';
import fs from 'fs';

async function testTagRemoval() {
  const data = fs.readFileSync('test_limit_1.pptx');
  const zip = await JSZip.loadAsync(data);

  let xml = await zip.file('ppt/charts/chart1.xml').async('text');
  // Remove <c:legend> block
  xml = xml.replace(/<c:legend>[\s\S]*?<\/c:legend>/, '');
  zip.file('ppt/charts/chart1.xml', xml);

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('test_nolegend.pptx', buf);
  console.log('Saved test_nolegend.pptx');
}

testTagRemoval().catch(console.error);
