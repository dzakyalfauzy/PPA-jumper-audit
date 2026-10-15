$files = @("sec_1_header.pptx", "sec_2_tables.pptx", "sec_3_12charts.pptx")
$ppt = New-Object -ComObject PowerPoint.Application
foreach ($f in $files) {
    $full = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\$f"
    try {
        $pres = $ppt.Presentations.Open($full, 1, 0, 0)
        Write-Output "$f : SUCCESS"
        $pres.Close()
    } catch {
        Write-Output "$f : FAILED ($($_.Exception.Message))"
    }
}
$ppt.Quit()
