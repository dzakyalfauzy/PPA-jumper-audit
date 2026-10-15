$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\PPA_JUMPER_AUDIT_WEEK-40__REDESIGNED__W40_2026.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "VERIFICATION: File opened successfully in Microsoft PowerPoint!"
    Write-Output "Slides count: $($pres.Slides.Count)"
    Write-Output "Shapes/Charts/Tables count on Slide 1: $($pres.Slides.Item(1).Shapes.Count)"
    
    # Export slide 1 to PNG image for visual inspection
    $outPng = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\slide1_redesigned_rendered.png"
    $pres.Slides.Item(1).Export($outPng, "PNG", 1920, 1080)
    Write-Output "Exported slide rendering to: $outPng"
    
    $pres.Close()
} catch {
    Write-Output "FAILED: $($_.Exception.Message)"
}
$ppt.Quit()
