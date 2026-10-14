$filePath = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\PPA_JUMPER_AUDIT_WEEK-40_W40_2026.pptx"
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($filePath, 1, 0, 0)
    Write-Output "SUCCESS: Opened slides count: $($pres.Slides.Count)"
    Write-Output "SUCCESS: Slide 1 shapes count: $($pres.Slides.Item(1).Shapes.Count)"
    $pres.Close()
    $ppt.Quit()
} catch {
    Write-Output "FAILED: $($_.Exception.Message)"
}
