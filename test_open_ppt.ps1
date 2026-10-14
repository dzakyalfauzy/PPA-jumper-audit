$filePath = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\PPA_FIXED_TEST.pptx"
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($filePath, 1, 0, 0) # ReadOnly=1, Untitled=0, WithWindow=0
    Write-Output "SUCCESS: Opened slides count: $($pres.Slides.Count)"
    $pres.Close()
    $ppt.Quit()
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
