import fs from 'fs';

async function test12ChartsBisect() {
  const fileContent = fs.readFileSync('./src/export/pptxExporter.js', 'utf8');

  // Let's test with 1 chart, 2 charts, 4 charts, 6 charts, 12 charts
  const PptxGenJS = (await import('pptxgenjs')).default;
  const { WEEK_40_BASELINE } = await import('./src/model/state.js');

  for (const maxCharts of [1, 2, 4, 8, 12]) {
    let count = 0;
    // Replace inside _build12Charts
    const modifiedCode = fileContent.replace(
      'CATEGORY_LIST.forEach((category, catIdx) => {',
      `CATEGORY_LIST.forEach((category, catIdx) => { if (count++ >= ${maxCharts}) return;`
    ).replace('function _build12Charts(slide, pptx, allChartSeries, calculatedSummaries, weekLabels) {',
      'function _build12Charts(slide, pptx, allChartSeries, calculatedSummaries, weekLabels) { let count = 0;'
    );

    const fName = `./src/export/pptx_limit_${maxCharts}.js`;
    fs.writeFileSync(fName, modifiedCode);
    const mod = await import(fName);
    await mod.exportToPowerPoint(JSON.parse(JSON.stringify(WEEK_40_BASELINE)), PptxGenJS);
    fs.renameSync('PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx', `test_limit_${maxCharts}.pptx`);
  }

  console.log('Done generating chart limits');
}

test12ChartsBisect().catch(console.error);
