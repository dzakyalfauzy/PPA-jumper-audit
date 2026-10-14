$filePath = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\test_one_bar.pptx"
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($filePath, 1, 0, 0)
    Write-Output "SUCCESS: Opened slides count: $($pres.Slides.Count)"
    $pres.Close()
    $ppt.Quit()
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
