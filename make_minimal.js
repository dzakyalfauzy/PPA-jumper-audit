import PptxGenJS from 'pptxgenjs';

async function makeMinimal() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();
  slide.addText("Hello World", { x: 1, y: 1, fontSize: 20 });
  await pptx.writeFile({ fileName: "C:\\Users\\ameli\\OneDrive\\Desktop\\PPA-FMDS\\test_minimal.pptx" });
  console.log("Minimal file written");
}

makeMinimal().catch(console.error);
