import JSZip from 'jszip';
import fs from 'fs';

async function diffBarAndCombo() {
  const zipBar = await JSZip.loadAsync(fs.readFileSync('test_one_bar.pptx'));
  const zipCombo = await JSZip.loadAsync(fs.readFileSync('test_one_combo_opts.pptx'));

  const xmlBar = await zipBar.file('ppt/charts/chart1.xml').async('text');
  const xmlCombo = await zipCombo.file('ppt/charts/chart1.xml').async('text');

  fs.writeFileSync('xml_bar.xml', xmlBar);
  fs.writeFileSync('xml_combo.xml', xmlCombo);
  console.log('Wrote xml_bar.xml and xml_combo.xml');
}

diffBarAndCombo().catch(console.error);
