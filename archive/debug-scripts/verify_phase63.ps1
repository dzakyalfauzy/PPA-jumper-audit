$f = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\PPA_JUMPER_AUDIT_WEEK-40__PHASE_6_3_REFINED__W40_2026.pptx"
$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($f, 1, 0, 0)
    Write-Output "VERIFICATION: File opened successfully in Microsoft PowerPoint!"
    Write-Output "Slides count: $($pres.Slides.Count)"
    Write-Output "Shapes/Charts/Tables count on Slide 1: $($pres.Slides.Item(1).Shapes.Count)"
    
    # Check chart category axis rotation directly
    $chartFound = 0
    foreach ($shape in $pres.Slides.Item(1).Shapes) {
        if ($shape.HasChart) {
            $catAxis = $shape.Chart.Axes(1)
            $chartFound++
            if ($chartFound -eq 1) {
                Write-Output "First Chart ($($shape.Name)) Category Axis Orientation: $($catAxis.TickLabels.Orientation)"
                Write-Output "First Chart Category Axis Font Size: $($catAxis.TickLabels.Font.Size)"
            }
        }
    }
    Write-Output "Total Charts verified on Slide 1: $chartFound"

    # Export rendered PNG
    $outPng = "C:\Users\ameli\OneDrive\Desktop\PPA-FMDS\slide1_phase63_rendered.png"
    $pres.Slides.Item(1).Export($outPng, "PNG", 1920, 1080)
    Write-Output "Exported slide rendering to: $outPng"
    
    $pres.Close()
} catch {
    Write-Output "FAILED: $($_.Exception.Message)"
}
$ppt.Quit()
