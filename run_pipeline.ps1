$ErrorActionPreference = "Continue"

Set-Location "C:\dev\tripgak"

$cities = @(
  "kobe", "hiroshima", "kagoshima", "sendai",
  "hakodate", "nagasaki", "kumamoto", "takamatsu",
  "ishigaki", "oita", "kanazawa", "okayama"
)

$iatas = @{
  "kobe" = "UKB"; "hiroshima" = "HIJ"; "kagoshima" = "KOJ";
  "sendai" = "SDJ"; "hakodate" = "HKD"; "nagasaki" = "NGS";
  "kumamoto" = "KMJ"; "takamatsu" = "TAK"; "ishigaki" = "ISG";
  "oita" = "OIT"; "kanazawa" = "KMQ"; "okayama" = "OKJ"
}

Write-Output "=== 3. COLLECTION ==="
foreach ($city in $cities) {
    Write-Output "--- STARTING $city ---"
    $success = $false
    while (-not $success) {
        # Redirect output so we can capture Total Places if needed, or just let it print
        npx tsx scripts/collect-city.ts $city
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Output "--- FINISHED $city ---"
        } else {
            Write-Output "--- FAILED $city, RETRYING IN 10s ---"
            Start-Sleep -Seconds 10
        }
    }
}

Write-Output "=== 4. IATA SETTINGS ==="
foreach ($city in $cities) {
    $code = $iatas[$city]
    npx tsx scripts/set-city-meta.ts $city --iata=$code
}

Write-Output "=== 5. UNSPLASH IMAGES ==="
npm run unsplash:fetch
npm run unsplash:apply
npm run unsplash:track

Write-Output "=== 6. VALIDATION ==="
npm run validate:curation:images
npm run blog:coverage
npx tsc --noEmit
npm run build

Write-Output "=== PIPELINE COMPLETE ==="
