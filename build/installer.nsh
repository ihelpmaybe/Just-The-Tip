; Custom NSIS strings — clearer than electron-builder defaults.
; LCID 1033 = English (United States).
; package.json sets nsis.warningsAsErrors=false so redefining
; builder's LangString keys is allowed (last definition wins).

!macro customHeader
  LangString appRunning 1033 "Just The Tip is already open on this PC.$\r$\n$\r$\nSetup has to close it before it can update the program files.$\r$\n$\r$\nClick OK to close Just The Tip and continue.$\r$\nClick Cancel to stop Setup — quit the app yourself, then run this installer again."

  LangString appCannotBeClosed 1033 "Setup still cannot close Just The Tip.$\r$\n$\r$\nClose it from the taskbar, or open Task Manager and end $\"Just The Tip$\".$\r$\nThen click Retry to continue installing."

  LangString appClosing 1033 "Closing Just The Tip so Setup can update files..."
!macroend
