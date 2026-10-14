import PptxGenJS from 'pptxgenjs';

async function makeOneCombo() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();
  
  const chartTypes = [
    {
      type: pptx.ChartType.bar,
      data: [{ name: 'Plan', labels: ['W1', 'W2', 'W3'], values: [1, 2, 3] }],
      options: { chartColors: ['BFBFBF'] }
    },
    {
      type: pptx.ChartType.line,
      data: [{ name: 'Actual', labels: ['W1', 'W2', 'W3'], values: [1, 2, 3] }],
      options: { chartColors: ['A52A98'] }
    }
  ];

  slide.addChart(chartTypes, null, { x: 1, y: 1, w: 5, h: 3 });

  await pptx.writeFile({ fileName: "C:\\Users\\ameli\\OneDrive\\Desktop\\PPA-FMDS\\test_one_combo.pptx" });
  console.log("One combo chart written");
}

makeOneCombo().catch(console.error);
