import fs from 'fs';
import JSZip from 'jszip';

async function inspectChartXml() {
  const data = fs.readFileSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx');
  const zip = await JSZip.loadAsync(data);
  const chart1Xml = await zip.file('ppt/charts/chart1.xml').async('text');
  console.log('chart1.xml length:', chart1Xml.length);
  console.log('chart1.xml snippet:\n', chart1Xml.slice(0, 800));
}

inspectChartXml().catch(console.error);
