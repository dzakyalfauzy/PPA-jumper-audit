import JSZip from 'jszip';
import fs from 'fs';

async function testReplaceChart1() {
  const zipGood = await JSZip.loadAsync(fs.readFileSync('test_12charts_and_table.pptx'));
  const zipBad = await JSZip.loadAsync(fs.readFileSync('test_limit_1.pptx'));

  // Let's replace chart1.xml in zipBad with chart14.xml from zipGood!
  const goodXml = await zipGood.file('ppt/charts/chart14.xml').async('text');
  zipBad.file('ppt/charts/chart1.xml', goodXml);

  const buf = await zipBad.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('test_replaced_c1.pptx', buf);
  console.log('Saved test_replaced_c1.pptx');
}

testReplaceChart1().catch(console.error);
