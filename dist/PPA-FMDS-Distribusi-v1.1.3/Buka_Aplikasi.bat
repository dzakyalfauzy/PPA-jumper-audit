@echo off
:: ============================================================================
:: PPA Jumper Audit Automation — One-Click Windows Launcher
:: ============================================================================
:: Launcher lokal mandiri berbasis Windows PowerShell bawaan.
:: Tidak membutuhkan Node.js, Python, atau instalasi software tambahan.
:: ============================================================================

setlocal
cd /d "%~dp0"
title PPA Jumper Audit Automation

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$lines = Get-Content -LiteralPath '%~f0'; $start = $false; $sb = New-Object System.Text.StringBuilder; foreach ($l in $lines) { if ($start) { [void]$sb.AppendLine($l) } elseif ($l -match '^# ===POWERSHELL_START===') { $start = $true } }; Invoke-Expression $sb.ToString()"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ============================================================================
    echo [ERROR] Terjadi kesalahan saat menjalankan aplikasi.
    echo Pastikan Windows PowerShell 5.1 aktif dan tidak diblokir oleh kebijakan sistem.
    echo ============================================================================
    echo.
    pause
)
exit /b %ERRORLEVEL%

# ===POWERSHELL_START===
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = (Get-Location).Path
$baseDirClean = [System.IO.Path]::GetFullPath($baseDir)
if (-not $baseDirClean.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString())) {
    $baseDirClean += [System.IO.Path]::DirectorySeparatorChar
}

# 1. Cari port lokal yang tersedia (mulai dari 8080)
function Get-AvailablePort([int]$startPort = 8080, [int]$maxAttempts = 30) {
    for ($p = $startPort; $p -lt ($startPort + $maxAttempts); $p++) {
        $testListener = New-Object System.Net.HttpListener
        try {
            $testListener.Prefixes.Add("http://localhost:$p/")
            $testListener.Start()
            $testListener.Stop()
            $testListener.Close()
            return $p
        } catch {
            try { $testListener.Close() } catch {}
        }
    }
    throw "Tidak dapat menemukan port lokal yang tersedia antara $startPort dan $($startPort + $maxAttempts - 1)."
}

try {
    $port = Get-AvailablePort -startPort 8080
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Inisialisasi HTTP Listener (hanya bind ke loopback interface / localhost)
$listener = New-Object System.Net.HttpListener
$appUrl = "http://localhost:$port/"
$listener.Prefixes.Add($appUrl)
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "[ERROR] Gagal memulai web server lokal pada $appUrl" -ForegroundColor Red
    Write-Host "Rincian: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

# 3. Tampilkan informasi status di terminal
Clear-Host
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "                 PPA JUMPER AUDIT AUTOMATION (LOCAL)                        " -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [OK] Server lokal berhasil aktif!" -ForegroundColor Green
Write-Host "  [URL] $appUrl" -ForegroundColor White
Write-Host "  [INFO] Keamanan: Server hanya dapat diakses dari laptop ini (Loopback)." -ForegroundColor Gray
Write-Host ""
Write-Host "  PETUNJUK PENGGUNAAN:" -ForegroundColor Yellow
Write-Host "  1. Browser bawaan Anda akan terbuka secara otomatis." -ForegroundColor White
Write-Host "  2. Pastikan laptop tetap terhubung ke INTERNET (agar grafik dan export aktif)." -ForegroundColor White
Write-Host "  3. Jendela ini HARUS TETAP DIBUKA selama Anda menggunakan aplikasi." -ForegroundColor White
Write-Host ""
Write-Host "  UNTUK BERHENTI:" -ForegroundColor Yellow
Write-Host "  Tutup jendela ini atau tekan [Ctrl + C]." -ForegroundColor Gray
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# 4. Buka aplikasi di browser default pengguna
try {
    Start-Process $appUrl
} catch {
    Write-Host "[PERINGATAN] Tidak dapat membuka browser otomatis. Buka manual di: $appUrl" -ForegroundColor Yellow
}

# 5. Request-handling loop
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $urlPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
        if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "/index.html"
        }

        # Normalisasi path dan cegah Directory Traversal
        $relPath = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($baseDirClean, $relPath))

        if (-not $fullPath.StartsWith($baseDirClean, [System.StringComparison]::OrdinalIgnoreCase) -and ($fullPath -ne [System.IO.Path]::GetFullPath($baseDir))) {
            $res.StatusCode = 403
            $msg = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
            $res.ContentType = "text/plain; charset=utf-8"
            $res.ContentLength64 = $msg.Length
            $res.OutputStream.Write($msg, 0, $msg.Length)
            $res.OutputStream.Close()
            continue
        }

        if ([System.IO.File]::Exists($fullPath)) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".htm"  { "text/html; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".mjs"  { "application/javascript; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                ".woff" { "font/woff" }
                ".woff2"{ "font/woff2" }
                ".ttf"  { "font/ttf" }
                default { "application/octet-stream" }
            }

            try {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $res.StatusCode = 200
                $res.ContentType = $mime
                $res.ContentLength64 = $bytes.Length
                $res.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $res.StatusCode = 500
            } finally {
                $res.OutputStream.Close()
            }
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found: $urlPath")
            $res.ContentType = "text/plain; charset=utf-8"
            $res.ContentLength64 = $msg.Length
            try {
                $res.OutputStream.Write($msg, 0, $msg.Length)
            } catch {} finally {
                $res.OutputStream.Close()
            }
        }
    }
} catch {
    # Server dihentikan (Ctrl+C atau process exit)
} finally {
    if ($listener -ne $null) {
        try { $listener.Stop() } catch {}
        try { $listener.Close() } catch {}
    }
}
