@echo off
setlocal
set "ROOT=%~dp0"
if exist "%ROOT%router.env.cmd" call "%ROOT%router.env.cmd"
if not defined SAND_HOST_MAIN for /f "delims=" %%F in ('powershell -NoProfile -Command "$roots=@($env:LOCALAPPDATA+'\Programs',$env:LOCALAPPDATA,$env:PROGRAMFILES); foreach($r in $roots){$f=Get-ChildItem -LiteralPath $r -Filter host-main.cjs -File -Recurse -ErrorAction SilentlyContinue ^| Where-Object {$_.FullName -match 'sand-host'} ^| Select-Object -First 1; if($f){$f.FullName;break}}"') do set "SAND_HOST_MAIN=%%F"
if defined SAND_HOST_MAIN "%ROOT%node.exe" "%ROOT%restore-official-host.mjs" "%SAND_HOST_MAIN%"
