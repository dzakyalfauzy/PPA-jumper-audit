$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\test_clean_combo.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "SUCCESS: Opened slides count: $($pres.Slides.Count)"
    $pres.Close()
} catch {
    Write-Output "FAILED: $($_.Exception.Message)"
}
$ppt.Quit()
