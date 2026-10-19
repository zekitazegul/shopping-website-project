$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$composePath=Join-Path $projectRoot 'compose.yaml'
$result=docker compose -f $composePath exec -T marketplace node server/backup.mjs
if($LASTEXITCODE -ne 0){throw 'Backup failed.'}
$snapshot=$result | ConvertFrom-Json
if($snapshot.directory -notmatch '^/app/backups/[0-9TZ.-]+$'){throw 'Unexpected backup path.'}
$target=Join-Path (Join-Path $projectRoot 'backups') (Split-Path -Leaf $snapshot.directory)
New-Item -ItemType Directory -Path $target -Force | Out-Null
$ownerSid='*'+[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $target /inheritance:r /grant:r "${ownerSid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
if($LASTEXITCODE -ne 0){throw 'Unable to protect backup directory.'}
$container=docker compose -f $composePath ps -q marketplace
docker cp "${container}:$($snapshot.directory)/." $target
if($LASTEXITCODE -ne 0){throw 'Backup created in Docker, but host export failed.'}
Write-Host "Private backup exported to $target"
