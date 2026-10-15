import JSZip from 'jszip';
import fs from 'fs';

async function checkOvalDiff() {
  const zipBad = await JSZip.loadAsync(fs.readFileSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx'));
  const zipGood = await JSZip.loadAsync(fs.readFileSync('test_no_ovals.pptx'));

  const xmlBad = await zipBad.file('ppt/slides/slide1.xml').async('text');
  const xmlGood = await zipGood.file('ppt/slides/slide1.xml').async('text');

  console.log('Bad length:', xmlBad.length, 'Good length:', xmlGood.length);

  // Extract the oval shape xml in xmlBad
  const ovalMatches = xmlBad.match(/<p:sp>[\s\S]*?<a:prstGeom prst="ellipse">[\s\S]*?<\/p:sp>/g);
  console.log('Oval match sample:\n', ovalMatches ? ovalMatches[0] : 'None');
}

checkOvalDiff().catch(console.error);
