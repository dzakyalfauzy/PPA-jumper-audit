$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "SUCCESS: PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx opened successfully in Microsoft PowerPoint!"
    Write-Output "Slides count: $($pres.Slides.Count)"
    Write-Output "Shapes/Charts/Tables count on Slide 1: $($pres.Slides.Item(1).Shapes.Count)"
    $pres.Close()
} catch {
    Write-Output "FAILED: $($_.Exception.Message)"
}
$ppt.Quit()
