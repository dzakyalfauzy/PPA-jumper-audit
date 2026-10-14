$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\PPA_FULL_TEST_FIXED.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "SUCCESS: Opened slides count: $($pres.Slides.Count)"
    Write-Output "Slide 1 shapes count: $($pres.Slides.Item(1).Shapes.Count)"
    $pres.Close()
} catch {
    Write-Output "FAILED: $($_.Exception.Message)"
}
$ppt.Quit()
