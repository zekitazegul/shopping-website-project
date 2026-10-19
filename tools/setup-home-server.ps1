$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot '.server-config.json'
$existing = @{}
if (Test-Path -LiteralPath $configPath) { $existing = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json }
$adminEmail = Read-Host 'Administrator email (Enter: current setting)'
if (-not $adminEmail) { $adminEmail = $existing.adminEmail }
$smtpHost = 'smtp.mail.yahoo.com'
$smtpUser = Read-Host 'Yahoo email (Enter: administrator email)'
if (-not $smtpUser) { $smtpUser = $adminEmail }
if (-not $adminEmail -or -not $smtpUser) { throw 'An administrator and sender email are required.' }
$secret = Read-Host 'SMTP app password (hidden; never use your main password)' -AsSecureString
$memory = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $settings = @{ port=4180; adminEmail=$adminEmail; smtpHost=$smtpHost; smtpPort=465; smtpUser=$smtpUser; mailFrom=$smtpUser; smtpPassword=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($memory); allowedOrigins=@($existing.allowedOrigins); allowedHosts=@($existing.allowedHosts) }
  if (-not (Test-Path -LiteralPath $configPath)) { New-Item -ItemType File -Path $configPath | Out-Null }
  $ownerSid = '*' + [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  & icacls.exe $configPath /inheritance:r /grant:r "${ownerSid}:F" '*S-1-5-18:F' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Unable to protect configuration file.' }
  [IO.File]::WriteAllText($configPath,($settings | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
  Get-Content -LiteralPath $configPath -Raw | docker compose -f (Join-Path $projectRoot 'compose.yaml') exec -T marketplace node server/configure.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Saved locally; Docker configuration could not be applied.' }
  docker compose -f (Join-Path $projectRoot 'compose.yaml') restart marketplace
  if ($LASTEXITCODE -ne 0) { throw 'Configuration saved but service restart failed.' }
  Write-Host 'Private configuration saved and Docker service restarted.'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($memory)
  if ($settings) { $settings.smtpPassword=$null }
  $secret.Dispose()
}
