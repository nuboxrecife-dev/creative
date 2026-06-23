$git = "C:\Users\josep\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"

Write-Host "--- Inicializando Git ---"
& $git init

# Check user config
$hasEmail = & $git config --global user.email
if ([string]::IsNullOrEmpty($hasEmail)) {
    Write-Host "Configurando email local..."
    & $git config user.email "josep@example.com"
}
$hasName = & $git config --global user.name
if ([string]::IsNullOrEmpty($hasName)) {
    Write-Host "Configurando nome local..."
    & $git config user.name "Joseph"
}

Write-Host "--- Adicionando arquivos ---"
& $git add .

Write-Host "--- Criando Commit ---"
& $git commit -m "feat: add interactive seat map to landing page"

Write-Host "--- Configurando Repositório Remoto ---"
& $git remote remove origin 2>$null
& $git remote add origin https://github.com/nuboxrecife-dev/creative.git

Write-Host "--- Renomeando branch para main ---"
& $git branch -M main

Write-Host "--- Subindo para o GitHub (Push) ---"
& $git push -u origin main
