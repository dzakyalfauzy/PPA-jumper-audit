$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\test_no_ovals.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "test_no_ovals.pptx : SUCCESS - Slides: $($pres.Slides.Count)"
    Write-Output "Slide 1 shapes count: $($pres.Slides.Item(1).Shapes.Count)"
    $pres.Close()
} catch {
    Write-Output "test_no_ovals.pptx : FAILED ($($_.Exception.Message))"
}
$ppt.Quit()
