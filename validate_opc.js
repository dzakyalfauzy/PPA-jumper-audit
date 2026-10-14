import fs from 'fs';
import path from 'path';

async function inspectZip(filePath) {
  const JSZip = (await import('jszip')).default;
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  let errors = [];
  const files = Object.keys(zip.files);

  for (const f of files) {
    if (f.endsWith('.rels')) {
      const xml = await zip.file(f).async('text');
      const dir = path.dirname(f); // e.g. ppt/slides/_rels -> ppt/slides
      const parentDir = path.dirname(dir); // e.g. ppt

      const matches = [...xml.matchAll(/Target="([^"]+)"/g)].map(m => m[1]);
      for (const target of matches) {
        if (target.startsWith('http')) continue;
        let resolved;
        if (target.startsWith('/')) {
          errors.push({ relFile: f, target, issue: 'Absolute path target (starts with /), invalid in OpenXML package' });
          resolved = target.slice(1);
        } else {
          resolved = path.posix.normalize(path.posix.join(parentDir, target));
        }

        if (!zip.file(resolved)) {
          errors.push({ relFile: f, target, resolved, issue: 'Target file not found in package' });
        }
      }
    }
  }

  console.log(`Inspection of ${filePath}:`);
  console.log('Errors count:', errors.length);
  if (errors.length > 0) {
    console.log(errors);
  } else {
    console.log('ALL package internal relationships are 100% valid relative paths and targets exist!');
  }
}

inspectZip('PPA_FIXED_TEST.pptx').catch(console.error);
