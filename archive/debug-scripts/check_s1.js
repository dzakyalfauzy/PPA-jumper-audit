import JSZip from 'jszip';
import fs from 'fs';

async function checkSlide1() {
  const zipBad = await JSZip.loadAsync(fs.readFileSync('test_limit_1.pptx'));
  const sBad = await zipBad.file('ppt/slides/slide1.xml').async('text');
  console.log('slide1.xml length in test_limit_1:', sBad.length);
  // Why is slide1.xml 93KB when it only has 1 chart? Because of all the shapes and tables!
  // In test_no_12.pptx, it has ALL shapes and tables EXCEPT charts, and it SUCCEEDED!
}

checkSlide1().catch(console.error);
