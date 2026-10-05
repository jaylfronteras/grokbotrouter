Unicode true
Name "GrokBot External Inference Router"
OutFile "GrokBot_External_Inference_Router_Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\GrokBot External Inference Router"
RequestExecutionLevel user
Page directory
Page instfiles
Section "Router"
  SetOutPath "$INSTDIR"
  File /r "payload\*"
  CreateDirectory "$SMPROGRAMS\GrokBot External Inference Router"
  CreateShortcut "$SMPROGRAMS\GrokBot External Inference Router\Configure and Start.lnk" "$INSTDIR\configure.cmd"
  CreateShortcut "$SMPROGRAMS\GrokBot External Inference Router\Restore GrokBot.lnk" "$INSTDIR\restore.cmd"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GrokBotExternalInferenceRouter" "DisplayName" "GrokBot External Inference Router"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GrokBotExternalInferenceRouter" "UninstallString" '"$INSTDIR\Uninstall.exe"'
SectionEnd
Section "Uninstall"
  ExecWait '"$INSTDIR\restore.cmd" /quiet'
  Delete "$SMPROGRAMS\GrokBot External Inference Router\Configure and Start.lnk"
  Delete "$SMPROGRAMS\GrokBot External Inference Router\Restore GrokBot.lnk"
  RMDir "$SMPROGRAMS\GrokBot External Inference Router"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\GrokBotExternalInferenceRouter"
  RMDir /r "$INSTDIR"
SectionEnd
