# HeyTaxi - Windows Local Development Startup Script
# Run this from E:\heytaxiApplication in PowerShell

Write-Host "🚖 Starting HeyTaxi Application..." -ForegroundColor Yellow

# Check if Docker is running (needed for Redis)
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Start Redis via Docker
Write-Host "🔴 Starting Redis..." -ForegroundColor Cyan
docker run -d -p 6379:6379 --name heytaxi-redis redis:7-alpine 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Redis container already exists, starting it..." -ForegroundColor Gray
    docker start heytaxi-redis 2>$null
}
Write-Host "✅ Redis started on port 6379" -ForegroundColor Green

# Wait for Redis
Start-Sleep -Seconds 2

# Function to start a Spring Boot service in a new terminal
function Start-Service {
    param($ServiceName, $Path)
    Write-Host "🚀 Starting $ServiceName..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; Write-Host '🚖 $ServiceName' -ForegroundColor Yellow; mvn spring-boot:run"
    Start-Sleep -Seconds 3
}

$BASE = $PSScriptRoot

# Start services in order
Start-Service "Eureka Server" "$BASE\backend\eureka-server"
Write-Host "⏳ Waiting 15s for Eureka to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Start-Service "API Gateway" "$BASE\backend\api-gateway"
Start-Sleep -Seconds 5

Start-Service "Auth Service" "$BASE\backend\auth-service"
Start-Sleep -Seconds 3

Start-Service "Notification Service" "$BASE\backend\notification-service"
Start-Sleep -Seconds 3

Start-Service "Driver Service" "$BASE\backend\driver-service"
Start-Sleep -Seconds 3

Start-Service "Ride Service" "$BASE\backend\ride-service"
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "⚛️  Starting React Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BASE\frontend'; Write-Host '⚛️ HeyTaxi Frontend' -ForegroundColor Yellow; npm run dev"

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  🚖 HeyTaxi is starting up!" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  🌐 Frontend:     http://localhost:3000" -ForegroundColor Green
Write-Host "  🔀 API Gateway:  http://localhost:8080" -ForegroundColor Green
Write-Host "  📡 Eureka:       http://localhost:8761" -ForegroundColor Green
Write-Host ""
Write-Host "  Wait 60-90 seconds for all services to be ready." -ForegroundColor Gray
Write-Host "  Check Eureka dashboard to see all services registered." -ForegroundColor Gray
Write-Host ""
