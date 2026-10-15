import JSZip from 'jszip';
import fs from 'fs';

async function checkAxId() {
  const zipBar = await JSZip.loadAsync(fs.readFileSync('test_bar_ax.pptx'));
  const xmlBar = await zipBar.file('ppt/charts/chart1.xml').async('text');
  const axBar = [...xmlBar.matchAll(/<c:axId val="([^"]+)"\/>/g)].map(m => m[1]);
  console.log('Single Bar chart axIds:', axBar);

  const zipCombo = await JSZip.loadAsync(fs.readFileSync('test_clean_combo.pptx'));
  const xmlCombo = await zipCombo.file('ppt/charts/chart1.xml').async('text');
  const axCombo = [...xmlCombo.matchAll(/<c:axId val="([^"]+)"\/>/g)].map(m => m[1]);
  console.log('Combo chart axIds in charts and axes:');
  console.log('In bar/line:', axCombo);
  const defAx = [...xmlCombo.matchAll(/<(?:c:catAx|c:valAx|c:serAx)>[\s\S]*?<c:axId val="([^"]+)"\/>/g)].map(m => m[1]);
  console.log('Defined axes:', defAx);
}

checkAxId().catch(console.error);
