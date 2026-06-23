# Simple PowerShell Static File Server
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:3000/")
try {
    $listener.Start()
    Write-Host "Servidor ativo em http://localhost:3000/"
} catch {
    Write-Host "Erro ao iniciar o servidor: $_"
    exit 1
}

$script:running = $true

# Set up clean exit on ctrl+c
[Console]::CancelKeyPress += {
    $script:running = $false
    $listener.Stop()
    Write-Host "Servidor finalizado."
}

while ($listener.IsListening -and $script:running) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        
        # Get relative path and resolve file location
        $relPath = $url.TrimStart("/")
        if ([string]::IsNullOrEmpty($relPath)) {
            $relPath = "index.html"
        }
        
        $filePath = Join-Path $PSScriptRoot $relPath
        
        # Resolve full paths to prevent path traversal
        $fullPath = [System.IO.Path]::GetFullPath($filePath)
        $rootPath = [System.IO.Path]::GetFullPath($PSScriptRoot)
        
        if (-not $fullPath.StartsWith($rootPath)) {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Acesso Negado")
            $response.ContentType = "text/plain"
            $response.StatusCode = 403
        } elseif (Test-Path $filePath -PathType Leaf) {
            # Determine content type based on file extension
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".htm"  { "text/html; charset=utf-8" }
                ".css"  { "text/css" }
                ".js"   { "application/javascript" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".gif"  { "image/gif" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.StatusCode = 200
        } else {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Nao Encontrado")
            $response.ContentType = "text/plain"
            $response.StatusCode = 404
        }
        
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.OutputStream.Close()
    } catch {
        # Catch transient connection drops
    }
}
