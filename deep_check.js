import JSZip from 'jszip';
import fs from 'fs';

async function deepCheck() {
  const data = fs.readFileSync('PPA_FIXED_TEST.pptx');
  const zip = await JSZip.loadAsync(data);

  // Check content types
  const ct = await zip.file('[Content_Types].xml').async('text');
  console.log('[Content_Types].xml contains chart?:', ct.includes('chart+xml'));
  console.log('[Content_Types].xml contains spreadsheet?:', ct.includes('spreadsheetml'));

  // Check chart1.xml and its workbook
  const c1Xml = await zip.file('ppt/charts/chart1.xml').async('text');
  const c1Rels = await zip.file('ppt/charts/_rels/chart1.xml.rels').async('text');
  console.log('chart1.xml.rels:', c1Rels);

  // Check if embedded workbook is valid
  const wbMatch = c1Rels.match(/Target="([^"]+)"/);
  if (wbMatch) {
    const wbPath = 'ppt/charts/' + wbMatch[1];
    const normWb = wbMatch[1].startsWith('../') ? 'ppt/' + wbMatch[1].slice(3) : wbPath;
    console.log('Workbook path:', normWb, 'exists:', !!zip.file(normWb));
  }
}

deepCheck().catch(console.error);
