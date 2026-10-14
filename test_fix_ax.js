import JSZip from 'jszip';
import fs from 'fs';

async function testFixAxId() {
  const data = fs.readFileSync('test_clean_combo.pptx');
  const zip = await JSZip.loadAsync(data);
  let xml = await zip.file('ppt/charts/chart1.xml').async('text');
  
  // Remove <c:axId val="2094734556"/>
  xml = xml.replaceAll('<c:axId val="2094734556"/>', '');
  zip.file('ppt/charts/chart1.xml', xml);

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('test_fixed_ax.pptx', buf);
  console.log('Saved test_fixed_ax.pptx without dummy axId');
}

testFixAxId().catch(console.error);
