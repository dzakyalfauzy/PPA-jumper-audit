import PptxGenJS from 'pptxgenjs';

async function makeOneComboWithOptions() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const slide = pptx.addSlide();
  
  const planColorHex = "BFBFBF";
  const actualColorHex = "A52A98";

  const chartDataTypes = [
    {
      type: pptx.ChartType.bar,
      data: [{ name: "Plan", labels: ["W38", "W39", "W40"], values: [2, 2, 2] }],
      options: {
        chartColors: [planColorHex],
        dataLabelValue: true,
        dataLabelPosition: "inEnd",
        dataLabelFontColor: "1E293B",
        dataLabelFontSize: 7,
      }
    },
    {
      type: pptx.ChartType.line,
      data: [{ name: "Actual", labels: ["W38", "W39", "W40"], values: [2, 2, 2] }],
      options: {
        chartColors: [actualColorHex],
        dataLabelValue: true,
        dataLabelPosition: "top",
        dataLabelFontColor: actualColorHex,
        dataLabelFontSize: 7.5,
        lineDataSymbol: "square",
        lineDataSymbolSize: 5,
        lineSize: 1.8
      }
    }
  ];

  slide.addChart(chartDataTypes, null, {
    x: 0.5, y: 0.5, w: 4, h: 2,
    showLegend: true,
    legendPos: "t",
    legendFontSize: 6.5,
    showValAxisTitle: false,
    showCatAxisTitle: false,
    valAxisHidden: false,
    catAxisHidden: false,
    valAxisFontSize: 6.5,
    catAxisFontSize: 6.5,
    catAxisLabelPos: "low"
  });

  await pptx.writeFile({ fileName: "C:\\Users\\ameli\\OneDrive\\Desktop\\PPA-FMDS\\test_one_combo_opts.pptx" });
  console.log("Combo with options written");
}

makeOneComboWithOptions().catch(console.error);
