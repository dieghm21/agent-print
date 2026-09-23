# Script para probar impresión de recibo
# Uso: .\test-receipt.ps1

$ApiUrl = "http://localhost:3002/api/print/receipt"

# Datos del recibo
$receipt = @{
    printerId = "pos80c-usb001-fixed"
    header = @{
        title = "☕ CAFÉ AROMA"
        subtitle = "Calle 123, Centro - Tel: (555) 123-4567"
    }
    orderNumber = "00001"
    dateTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    items = @(
        @{
            name = "Café Espresso Grande"
            description = "Bebida caliente"
            quantity = 2
            price = 4.50
        },
        @{
            name = "Croissant de Chocolate"
            description = "Recién hecho"
            quantity = 1
            price = 3.99
        },
        @{
            name = "Jugo Natural"
            description = "Naranja fresca"
            quantity = 1
            price = 3.50
        },
        @{
            name = "Sándwich Premium"
            description = "Jamón, queso y tomate"
            quantity = 1
            price = 7.99
        }
    )
    subtotal = 24.48
    tax = 2.45
    total = 26.93
    paymentMethod = "Tarjeta de Crédito"
    footer = @(
        "===============================",
        "¡Gracias por su compra!",
        "Vuelva pronto a Café Aroma",
        "===============================",
        "Somos amigo del ambiente",
        "Recicla este comprobante"
    )
    cut = $true
}

# Convertir a JSON
$body = $receipt | ConvertTo-Json -Depth 10

Write-Host "📄 Enviando recibo a impresora..." -ForegroundColor Green
Write-Host "URL: $ApiUrl" -ForegroundColor Gray
Write-Host ""

# Realizar solicitud
try {
    $response = Invoke-WebRequest -Uri $ApiUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json

    if ($result.success) {
        Write-Host "✓ Recibo encolado exitosamente" -ForegroundColor Green
        Write-Host "ID de trabajo: $($result.jobId)" -ForegroundColor Cyan
        Write-Host "Estado: $($result.status)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Resumen del recibo:" -ForegroundColor Green
        Write-Host "  - Items: $($result.receipt.itemsCount)" -ForegroundColor Gray
        Write-Host "  - Total: `$$($result.receipt.total)" -ForegroundColor Gray
        Write-Host "  - Orden: $($result.receipt.orderNumber)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Error: $($result.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error en la solicitud: $_" -ForegroundColor Red
    Write-Host "Asegúrate de que el servidor está corriendo en puerto 3002" -ForegroundColor Yellow
}
