import JSZip from 'jszip';
import fs from 'fs';

async function diffGoodVsBad() {
  const zipGood = await JSZip.loadAsync(fs.readFileSync('test_12charts_and_table.pptx'));
  const zipBad = await JSZip.loadAsync(fs.readFileSync('test_limit_1.pptx'));

  const cGood = await zipGood.file('ppt/charts/chart14.xml').async('text');
  const cBad = await zipBad.file('ppt/charts/chart1.xml').async('text');

  fs.writeFileSync('cGood.xml', cGood);
  fs.writeFileSync('cBad.xml', cBad);
  console.log('Wrote cGood.xml and cBad.xml');
}

diffGoodVsBad().catch(console.error);
