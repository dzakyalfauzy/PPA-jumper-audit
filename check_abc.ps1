$files = @("test_no_bl.pptx", "test_no_rc.pptx", "test_no_12.pptx")
$ppt = New-Object -ComObject PowerPoint.Application
foreach ($f in $files) {
    $full = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\$f"
    try {
        $pres = $ppt.Presentations.Open($full, 1, 0, 0)
        Write-Output "$f : SUCCESS - Shapes count: $($pres.Slides.Item(1).Shapes.Count)"
        $pres.Close()
    } catch {
        Write-Output "$f : FAILED ($($_.Exception.Message))"
    }
}
$ppt.Quit()
