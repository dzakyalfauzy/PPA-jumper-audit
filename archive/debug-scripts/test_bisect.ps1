$candidates = @(
  "dataLabelValue",
  "dataLabelPosition",
  "dataLabelFontColor",
  "dataLabelFontSize",
  "lineDataSymbol",
  "lineDataSymbolSize",
  "lineSize",
  "chartOpts_legendPos",
  "chartOpts_catAxisLabelPos",
  "chartOpts_fontSizes"
)

$ppt = New-Object -ComObject PowerPoint.Application
for ($i = 0; $i -lt $candidates.Length; $i++) {
    $f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\test_opt_$i.pptx"
    try {
        $pres = $ppt.Presentations.Open($f, 1, 0, 0)
        Write-Output "[$i] $($candidates[$i]) : SUCCESS"
        $pres.Close()
    } catch {
        Write-Output "[$i] $($candidates[$i]) : FAILED ($($_.Exception.Message))"
    }
}
$ppt.Quit()
