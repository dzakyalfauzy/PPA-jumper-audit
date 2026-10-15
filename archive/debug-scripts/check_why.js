import fs from 'fs';

async function testWhyLimit1Failed() {
  const code = fs.readFileSync('./src/export/pptx_limit_1.js', 'utf8');
  // Look at how limit_1 was generated in test_12_bisect.js:
  // count was incremented inside CATEGORY_LIST.forEach((category, catIdx) => { if (count++ >= 1) return;
  // That means AREA_ID_LIST (4 areas) STILL RAN!
  // In areaIdx 0: 1 chart was added.
  // In areaIdx 1, 2, 3: count >= 1 returned immediately, so NO charts were added for those areas!
  // BUT the header shapes and text FOR ALL 4 AREAS were still added!
  console.log('Inspecting test_12_real_charts.pptx which had all 12 charts: THAT PASSED with SUCCESS!');
}

testWhyLimit1Failed().catch(console.error);
