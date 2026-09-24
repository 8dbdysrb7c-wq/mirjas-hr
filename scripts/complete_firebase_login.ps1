$ErrorActionPreference = 'Stop'
$loginCode = Read-Host 'Enter the Firebase authorization code shown in your browser' -AsSecureString
$codePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($loginCode)
try {
  $codeText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($codePointer)
  & 'C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' (Join-Path $PSScriptRoot '../access-server/node_modules/firebase-tools/lib/bin/firebase.js') login $codeText
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($codePointer)
  $codeText = $null
}
