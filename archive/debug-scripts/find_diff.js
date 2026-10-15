import JSZip from 'jszip';
import fs from 'fs';

async function findDifference() {
  const zipGood = await JSZip.loadAsync(fs.readFileSync('test_12charts_and_table.pptx'));
  const zipBad = await JSZip.loadAsync(fs.readFileSync('test_replaced_c1.pptx'));

  // Compare every file in zipBad with zipGood if it exists
  const filesBad = Object.keys(zipBad.files).filter(f => !zipBad.files[f].dir);
  for (const f of filesBad) {
    if (f.includes('chart') || f.includes('embedding')) continue;
    const txtBad = await zipBad.file(f).async('text');
    const fGood = zipGood.file(f);
    if (!fGood) {
      console.log('File only in Bad:', f);
      continue;
    }
    const txtGood = await fGood.async('text');
    if (txtBad !== txtGood) {
      console.log('File differs between Good and Bad:', f);
      console.log('  Length Good:', txtGood.length, 'Length Bad:', txtBad.length);
    }
  }
}

findDifference().catch(console.error);
