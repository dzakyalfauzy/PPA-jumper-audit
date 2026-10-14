import JSZip from 'jszip';
import fs from 'fs';

async function diffXml() {
  const zipGood = await JSZip.loadAsync(fs.readFileSync('test_opt_0.pptx'));
  const zipBad = await JSZip.loadAsync(fs.readFileSync('test_opt_1.pptx'));

  console.log('Good files:', Object.keys(zipGood.files).filter(f => f.includes('chart')));
  console.log('Bad files:', Object.keys(zipBad.files).filter(f => f.includes('chart')));

  const xmlGood = await zipGood.file('ppt/charts/chart1.xml').async('text');
  const xmlBad = await zipBad.file('ppt/charts/chart1.xml').async('text');

  const dLblGood = xmlGood.match(/<c:dLbls>[\s\S]*?<\/c:dLbls>/g);
  console.log('dLblGood:', dLblGood);

  const dLblBad = xmlBad.match(/<c:dLbls>[\s\S]*?<\/c:dLbls>/g);
  console.log('dLblBad:', dLblBad);
}

diffXml().catch(console.error);
