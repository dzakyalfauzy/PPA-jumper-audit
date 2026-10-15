import PptxGenJS from 'pptxgenjs';

async function makeOneChart() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();
  
  const data = [
    { name: 'Series 1', labels: ['W1', 'W2', 'W3'], values: [1, 2, 3] }
  ];
  slide.addChart(pptx.ChartType.bar, data, { x: 1, y: 1, w: 5, h: 3 });

  await pptx.writeFile({ fileName: "C:\\Users\\ameli\\OneDrive\\Desktop\\PPA-FMDS\\test_one_bar.pptx" });
  console.log("One bar chart written");
}

makeOneChart().catch(console.error);
