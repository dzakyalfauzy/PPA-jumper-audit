import fs from 'fs';
import path from 'path';
import jszip from 'jszip'; // let's see if jszip is in node_modules

const filePath = 'PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx';

async function inspectPptx() {
  const data = fs.readFileSync(filePath);
  console.log('File size (bytes):', data.length);
  
  let zip;
  try {
    const JSZip = (await import('jszip')).default;
    zip = await JSZip.loadAsync(data);
    console.log('1. ZIP readable: YES');
  } catch (err) {
    console.error('1. ZIP readable: NO -', err.message);
    return;
  }

  const fileNames = Object.keys(zip.files);
  console.log('Total files inside ZIP:', fileNames.length);

  // Check [Content_Types].xml
  const ctFile = zip.file('[Content_Types].xml');
  console.log('2. [Content_Types].xml exists:', !!ctFile);
  if (ctFile) {
    const ctXml = await ctFile.async('text');
    console.log('   [Content_Types].xml length:', ctXml.length);
  }

  // Check presentation.xml
  const presFile = zip.file('ppt/presentation.xml');
  console.log('3. ppt/presentation.xml exists:', !!presFile);

  // Check slide1.xml
  const s1File = zip.file('ppt/slides/slide1.xml');
  console.log('4. ppt/slides/slide1.xml exists:', !!s1File);

  // Check slide1 rels
  const s1RelsFile = zip.file('ppt/slides/_rels/slide1.xml.rels');
  console.log('5. ppt/slides/_rels/slide1.xml.rels exists:', !!s1RelsFile);
  if (s1RelsFile) {
    const relsXml = await s1RelsFile.async('text');
    // Check targets
    const targetMatches = [...relsXml.matchAll(/Target="([^"]+)"/g)].map(m => m[1]);
    console.log('   Targets count in slide1.xml.rels:', targetMatches.length);
    let missingTargets = [];
    for (const target of targetMatches) {
      // normalize target path relative to ppt/slides/
      let normalized = target.startsWith('../') ? 'ppt/' + target.slice(3) : 'ppt/slides/' + target;
      if (!zip.file(normalized)) {
        missingTargets.push({ target, normalized });
      }
    }
    if (missingTargets.length > 0) {
      console.error('   MISSING TARGETS:', missingTargets);
    } else {
      console.log('   All targets exist in ZIP: YES');
    }
  }

  // Check charts and embeddings
  const chartFiles = fileNames.filter(f => f.startsWith('ppt/charts/chart'));
  console.log('6. Chart files count:', chartFiles.length);

  const embeddingFiles = fileNames.filter(f => f.startsWith('ppt/embeddings/'));
  console.log('7. Embedding (workbooks) count:', embeddingFiles.length);

  // Check each chart's rels
  let brokenChartRels = [];
  for (const cf of chartFiles) {
    const baseName = path.basename(cf);
    const relPath = `ppt/charts/_rels/${baseName}.rels`;
    const relFile = zip.file(relPath);
    if (!relFile) {
      brokenChartRels.push({ chart: cf, missingRel: relPath });
    } else {
      const relXml = await relFile.async('text');
      const targets = [...relXml.matchAll(/Target="([^"]+)"/g)].map(m => m[1]);
      for (const target of targets) {
        let norm = target.startsWith('../') ? 'ppt/' + target.slice(3) : 'ppt/charts/' + target;
        if (!zip.file(norm)) {
          brokenChartRels.push({ chart: cf, target, norm });
        }
      }
    }
  }
  if (brokenChartRels.length > 0) {
    console.error('   Broken chart rels:', brokenChartRels);
  } else {
    console.log('   All chart rels valid: YES');
  }
}

inspectPptx().catch(console.error);
