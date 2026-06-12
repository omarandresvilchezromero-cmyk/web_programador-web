# Pruebas básicas del flujo de ventas (PowerShell, Windows)
# Requiere curl.exe en PATH
# Uso: .\flow-tests.ps1

$cookieFile = "$PSScriptRoot\cookies.txt"
if (Test-Path $cookieFile) { Remove-Item $cookieFile -Force }

$base = 'http://localhost:3000'

Write-Host "1) Registrando usuario de prueba..."
$regBody = '{"nombre_usuario":"test_auto","correoUsuario":"test_auto@example.com","contrasenia":"Test1234"}'
Invoke-Expression "curl.exe -s -X POST $base/api/register -H \"Content-Type: application/json\" -d '$regBody' -c $cookieFile | Out-Host"

Start-Sleep -Milliseconds 300

Write-Host "2) Haciendo login (reusa la sesión guardada)"
$loginBody = '{"correoUsuario":"test_auto@example.com","contrasenia":"Test1234"}'
Invoke-Expression "curl.exe -s -X POST $base/api/login -H \"Content-Type: application/json\" -d '$loginBody' -c $cookieFile -b $cookieFile | Out-Host"

Start-Sleep -Milliseconds 300

Write-Host "3) Obteniendo catálogo de productos"
Invoke-Expression "curl.exe -s -X GET $base/api/productos -b $cookieFile | Out-Host"

Start-Sleep -Milliseconds 300

Write-Host "4) Intentando crear una venta de ejemplo (este test puede fallar si no hay productos en la BD)"
$items = '{"items":[{"type":"producto","id":1,"cantidad":1}]}'
Invoke-Expression "curl.exe -s -X POST $base/api/ventas -H \"Content-Type: application/json\" -d '$items' -b $cookieFile | Out-Host"

Start-Sleep -Milliseconds 300

Write-Host "5) Listando compras del usuario"
Invoke-Expression "curl.exe -s -X GET $base/api/ventas -b $cookieFile | Out-Host"

Write-Host "Pruebas finalizadas. Revisa la salida para fallos o errores."