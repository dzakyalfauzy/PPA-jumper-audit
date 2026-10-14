$files = @("test_all_13_charts.pptx", "test_12charts_and_table.pptx")
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
