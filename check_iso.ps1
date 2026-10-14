$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\test_12_isolated_opts.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "test_12_isolated_opts.pptx : SUCCESS - Slides: $($pres.Slides.Count)"
    $pres.Close()
} catch {
    Write-Output "test_12_isolated_opts.pptx : FAILED ($($_.Exception.Message))"
}
$ppt.Quit()
