import PptxGenJS from 'pptxgenjs';

async function testSingleChartWith3AxId() {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  // bar chart alone has 2 axId: <c:axId val="..."/> <c:axId val="..."/>
  slide.addChart(pptx.ChartType.bar, [{ name: 'P', labels: ['W1', 'W2'], values: [1, 2] }], { x: 1, y: 1, w: 5, h: 3 });
  await pptx.writeFile({ fileName: 'test_bar_ax.pptx' });
}

testSingleChartWith3AxId().catch(console.error);
