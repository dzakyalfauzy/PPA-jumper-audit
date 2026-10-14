$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\test_12_bl_rc.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "test_12_bl_rc.pptx : SUCCESS - Slides: $($pres.Slides.Count)"
    Write-Output "Shapes count: $($pres.Slides.Item(1).Shapes.Count)"
    $pres.Close()
} catch {
    Write-Output "test_12_bl_rc.pptx : FAILED ($($_.Exception.Message))"
}
$ppt.Quit()
