$nodeCandidates = Get-ChildItem -Path "C:\Users\HP\AppData\Local\OpenAI\Codex\runtimes\cua_node" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue
if ($nodeCandidates) {
    $nodeExe = ($nodeCandidates | Select-Object -First 1).FullName
} else {
    $nodeExe = "node"
}
$viteJs = ".\node_modules\vite\bin\vite.js"
$firebaseJs = ".\node_modules\firebase-tools\lib\bin\firebase.js"

Write-Host "=== [1/2] Building production bundle (Vite) ==="
& $nodeExe $viteJs build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "=== [2/2] Deploying to Firebase Hosting ==="
Remove-Item -Path .firebase -Recurse -Force -ErrorAction SilentlyContinue
& $nodeExe $firebaseJs deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "=== Deploy Complete! https://mirjaswork.web.app ==="
