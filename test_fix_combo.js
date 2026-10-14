import JSZip from 'jszip';
import fs from 'fs';

async function testFixCombo() {
  const data = fs.readFileSync('test_one_combo_opts.pptx');
  const zip = await JSZip.loadAsync(data);
  let xml = await zip.file('ppt/charts/chart1.xml').async('text');

  // Fix dLblPos: inEnd is valid only for bar, but PptxGenJS put it in lineChart if not careful,
  // or maybe <c:dLblPos val="top"/> inside <c:dLbls> is invalid according to DrawingML schema order!
  // In DrawingML:
  // <c:dLbls> sequence:
  // (dNumFmt?, spPr?, txPr?, dLblPos?, showLegendKey?, showVal?, showCatName?, showSerName?, showPercent?, showBubbleSize?, separator?, showLeaderLines?, leaderLines?, extLst?)
  
  // Let's remove dataLabelPosition completely:
  xml = xml.replaceAll('<c:dLblPos val="inEnd"/>', '');
  xml = xml.replaceAll('<c:dLblPos val="top"/>', '');

  zip.file('ppt/charts/chart1.xml', xml);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('test_combo_no_dlblpos.pptx', buf);
  console.log('Saved test_combo_no_dlblpos.pptx');
}

testFixCombo().catch(console.error);
