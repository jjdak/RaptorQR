param(
  [int]$Port = 4173,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$WebRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "web"))
$IndexPath = Join-Path $WebRoot "index.html"

if (-not (Test-Path -LiteralPath $IndexPath -PathType Leaf)) {
  throw "Offline web files are missing: $WebRoot"
}

function Send-Response($Stream, [int]$Status, [string]$ContentType, [byte[]]$Body, [bool]$HeadOnly) {
  $Reason = switch ($Status) {
    200 { "OK" }
    400 { "Bad Request" }
    403 { "Forbidden" }
    404 { "Not Found" }
    default { "Error" }
  }
  $Headers = "HTTP/1.1 $Status $Reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [Text.Encoding]::ASCII.GetBytes($Headers)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  if (-not $HeadOnly) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

$Listener = $null
for ($Candidate = $Port; $Candidate -lt ($Port + 20); $Candidate++) {
  try {
    $Listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Candidate)
    $Listener.Start()
    $Port = $Candidate
    break
  } catch {
    if ($Listener) { $Listener.Stop() }
    $Listener = $null
  }
}

if (-not $Listener) {
  throw "No free port found in range $Port-$($Port + 19)"
}

$Url = "http://localhost:$Port/"
Write-Host "RaptorQR is available on this computer at $Url"
Write-Host "Press Ctrl-C to stop."
if (-not $NoBrowser) {
  Start-Process $Url
}

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".mjs" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".wasm" = "application/wasm"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".gif" = "image/gif"
  ".ico" = "image/x-icon"
}

try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Reader = New-Object IO.StreamReader($Stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $RequestLine = $Reader.ReadLine()
      do { $HeaderLine = $Reader.ReadLine() } while ($null -ne $HeaderLine -and $HeaderLine -ne "")

      if ($RequestLine -notmatch "^(GET|HEAD) ([^ ]+) HTTP/") {
        Send-Response $Stream 400 "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("Bad request")) $false
        continue
      }

      $Method = $Matches[1]
      $Target = $Matches[2].Split("?")[0]
      $DecodedPath = [Uri]::UnescapeDataString($Target).TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
      $FilePath = [IO.Path]::GetFullPath((Join-Path $WebRoot $DecodedPath))
      $RootPrefix = $WebRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

      if ($FilePath -ne $WebRoot -and -not $FilePath.StartsWith($RootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $Stream 403 "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("Forbidden")) ($Method -eq "HEAD")
        continue
      }

      if (Test-Path -LiteralPath $FilePath -PathType Container) {
        $FilePath = Join-Path $FilePath "index.html"
      }
      if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf) -and -not [IO.Path]::GetExtension($DecodedPath)) {
        $FilePath = $IndexPath
      }
      if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        Send-Response $Stream 404 "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("Not found")) ($Method -eq "HEAD")
        continue
      }

      $Body = [IO.File]::ReadAllBytes($FilePath)
      $Extension = [IO.Path]::GetExtension($FilePath).ToLowerInvariant()
      $ContentType = $MimeTypes[$Extension]
      if (-not $ContentType) { $ContentType = "application/octet-stream" }
      Send-Response $Stream 200 $ContentType $Body ($Method -eq "HEAD")
    } catch {
      Write-Warning $_.Exception.Message
    } finally {
      $Client.Close()
    }
  }
} finally {
  $Listener.Stop()
}
