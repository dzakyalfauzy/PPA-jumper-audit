$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\test_fixed_ax.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "test_fixed_ax.pptx : SUCCESS - Slides count: $($pres.Slides.Count)"
    $pres.Close()
} catch {
    Write-Output "test_fixed_ax.pptx : FAILED ($($_.Exception.Message))"
}
$ppt.Quit()
/