$cities = @(
  "kobe", "hiroshima", "kagoshima", "sendai",
  "hakodate", "nagasaki", "kumamoto", "takamatsu",
  "ishigaki", "oita", "kanazawa", "okayama"
)

Set-Location "C:\dev\tripgak"

foreach ($city in $cities) {
    Write-Output "--- STARTING $city ---"
    $success = $false
    while (-not $success) {
        npm run collect:city -- $city
        if ($LASTEXITCODE -eq 0) {
            $success = $true
            Write-Output "--- FINISHED $city ---"
            Start-Sleep -Seconds 10
        } else {
            Write-Output "--- FAILED $city, RETRYING IN 2 MINUTES ---"
            Start-Sleep -Seconds 120
        }
    }
}
