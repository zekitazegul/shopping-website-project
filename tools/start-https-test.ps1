param([switch]$Publish)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$composePath=Join-Path $projectRoot 'compose.yaml'
docker compose -f $composePath --profile https-test up -d https-test
if($LASTEXITCODE -ne 0){throw 'Unable to start temporary HTTPS tunnel.'}
$publicUrl=$null
for($attempt=0;$attempt -lt 40;$attempt++){
  $tunnelLogs=(docker compose -f $composePath logs --no-color --tail 100 https-test 2>&1 | Out-String)
  $urls=[regex]::Matches($tunnelLogs,'https://[a-z0-9-]+\.trycloudflare\.com')
  if($urls.Count){$publicUrl=$urls[$urls.Count-1].Value;break}
  Start-Sleep -Seconds 1
}
if(-not $publicUrl){throw 'The tunnel did not return an HTTPS address. Check its service logs.'}
$configPath=Join-Path $projectRoot '.server-config.json'
$settings=Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$approvedOrigins=@($settings.allowedOrigins | Where-Object { $_ -and $_ -notmatch '^https://[a-z0-9-]+\.trycloudflare\.com$' })
$settings.allowedOrigins=@($approvedOrigins + 'https://zekitazegul.github.io' + $publicUrl | Select-Object -Unique)
[IO.File]::WriteAllText($configPath,($settings | ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
Get-Content -LiteralPath $configPath -Raw | docker compose -f $composePath exec -T marketplace node server/configure.mjs
if($LASTEXITCODE -ne 0){throw 'Unable to apply approved browser origins.'}
docker compose -f $composePath restart marketplace
if($LASTEXITCODE -ne 0){throw 'Unable to restart local API.'}
$state=@{url=$publicUrl;apiUrl=($publicUrl+'/api');createdAt=[DateTime]::UtcNow.ToString('o')}
[IO.File]::WriteAllText((Join-Path $projectRoot '.https-test.json'),($state | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
Write-Host "Temporary HTTPS address: $publicUrl"
Write-Host 'The address changes when this tunnel is recreated. Keep this PC and Docker running.'
if($Publish){
  gh variable set HOME_AUTH_API_URL --repo zekitazegul/shopping-website-project --body $state.apiUrl
  if($LASTEXITCODE -ne 0){throw 'Tunnel is running, but the GitHub API URL could not be updated.'}
  gh workflow run pages.yml --repo zekitazegul/shopping-website-project --ref main
  if($LASTEXITCODE -ne 0){throw 'GitHub API URL updated, but Pages publication could not be started.'}
  Write-Host 'GitHub Pages publication requested with the temporary HTTPS API.'
}
