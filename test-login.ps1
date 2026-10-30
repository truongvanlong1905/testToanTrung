param(
  [string]$BaseUrl = 'http://localhost:3001',
  [string]$Email = 'admin@toantrung.vn',
  [string]$Password = 'Password123@'
)

$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress

function Show-RequestError($step, $failure) {
  $response = $failure.Exception.Response
  $status = if ($response) { [int]$response.StatusCode } else { 'no response' }
  $details = $failure.ErrorDetails.Message
  if (-not $details -and $response) {
    try {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $details = $reader.ReadToEnd()
    } catch { }
  }
  Write-Host "$step : HTTP $status" -ForegroundColor Red
  if ($details) { Write-Host "Body: $details" }
  else { Write-Host $failure.Exception.Message }
}

try {
  $login = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST `
    -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing
  Write-Host "POST /api/auth/login : HTTP $($login.StatusCode)" -ForegroundColor Green
  $result = $login.Content | ConvertFrom-Json
  Write-Host "success: $($result.success); user: $($result.data.user.email)"
} catch {
  Show-RequestError 'POST /api/auth/login' $_
  exit 1
}

try {
  $me = Invoke-WebRequest -Uri "$BaseUrl/api/auth/me" -Method GET `
    -WebSession $session -UseBasicParsing
  Write-Host "GET /api/auth/me : HTTP $($me.StatusCode)" -ForegroundColor Green
} catch {
  Show-RequestError 'GET /api/auth/me' $_
  exit 1
}

try {
  $dashboardResponse = Invoke-WebRequest -Uri "$BaseUrl/" -Method GET `
    -WebSession $session -UseBasicParsing -MaximumRedirection 0
  Write-Host "GET / : HTTP $($dashboardResponse.StatusCode)" -ForegroundColor Green
} catch {
  Show-RequestError 'GET /' $_
  exit 1
}
