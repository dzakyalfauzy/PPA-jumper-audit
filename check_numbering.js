import JSZip from 'jszip';
import fs from 'fs';

async function checkChartNumbering() {
  for (let i = 0; i < 10; i++) {
    const zip = await JSZip.loadAsync(fs.readFileSync(`test_opt_${i}.pptx`));
    const charts = Object.keys(zip.files).filter(f => f.match(/^ppt\/charts\/chart\d+\.xml$/));
    const rels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
    console.log(`test_opt_${i}: charts in zip:`, charts, 'rels target:', rels.match(/Target="[^"]+"/)[0]);
  }
}

checkChartNumbering().catch(console.error);
