@echo off
setlocal
set "ROOT=%~dp0"
if not exist "%ROOT%router.env.cmd" (
  >"%ROOT%router.env.cmd" echo @echo off
  >>"%ROOT%router.env.cmd" echo set "SAND_OPENAI_COMPATIBLE_BASE_URL=https://your-provider.example/v1"
  >>"%ROOT%router.env.cmd" echo set "SAND_OPENAI_COMPATIBLE_MODEL=your-model-id"
  >>"%ROOT%router.env.cmd" echo set "SAND_OPENAI_COMPATIBLE_API_KEY="
  echo Edit %ROOT%router.env.cmd with your endpoint, model and API key, then run this shortcut again.
  notepad "%ROOT%router.env.cmd"
  exit /b 1
)
call "%ROOT%router.env.cmd"
if "%SAND_OPENAI_COMPATIBLE_BASE_URL%"=="https://your-provider.example/v1" (echo Configure router.env.cmd first.& exit /b 1)
for /f "delims=" %%F in ('powershell -NoProfile -Command "$roots=@($env:LOCALAPPDATA+'\Programs',$env:LOCALAPPDATA,$env:PROGRAMFILES); foreach($r in $roots){$f=Get-ChildItem -LiteralPath $r -Filter host-main.cjs -File -Recurse -ErrorAction SilentlyContinue ^| Where-Object {$_.FullName -match 'sand-host'} ^| Select-Object -First 1; if($f){$f.FullName;break}}"') do set "SAND_HOST_MAIN=%%F"
if not defined SAND_HOST_MAIN (echo Could not locate GrokBot host-main.cjs automatically.& echo Set SAND_HOST_MAIN in router.env.cmd and retry.& pause& exit /b 1)
"%ROOT%node.exe" "%ROOT%patch-official-host.mjs" "%SAND_HOST_MAIN%" || exit /b 1
start "GrokBot External Inference Router" /min "%ROOT%node.exe" "%ROOT%official-host-router.mjs"
echo Router started. Audit: %ROOT%.grokbot-router-audit.jsonl
pause
