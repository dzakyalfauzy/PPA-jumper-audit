import JSZip from 'jszip';
import fs from 'fs';

async function checkPresentationRels() {
  const zip = await JSZip.loadAsync(fs.readFileSync('test_opt_1.pptx'));
  const ct = await zip.file('[Content_Types].xml').async('text');
  console.log('[Content_Types].xml in test_opt_1:\n', ct);
}

checkPresentationRels().catch(console.error);
