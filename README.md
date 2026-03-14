# 🚖 HeyTaxi — Full Stack Ride Booking App

> Built with Java Spring Boot Microservices + React + Redux Toolkit  
> Similar to Rapido/Uber | ₹2 commission per ride | Bike, Auto & Car

---

## 📁 Project Structure

```
heytaxiApplication/
├── backend/
│   ├── eureka-server/        🔍 Port 8761 — Service Discovery
│   ├── api-gateway/          🔀 Port 8080 — Single Entry Point
│   ├── auth-service/         🔐 Port 8081 — OTP Login + JWT + Roles
│   ├── user-service/         👤 Port 8082 — Rider Profiles
│   ├── driver-service/       🚖 Port 8083 — Driver + Vehicles
│   ├── ride-service/         🗺️  Port 8084 — Booking + ₹2 Commission
│   ├── fare-service/         💰 Port 8085 — Fare Calculation
│   ├── notification-service/ 📧 Port 8086 — Email OTP (FREE via Gmail)
│   └── payment-service/      💳 Port 8087 — Payment Records
├── frontend/                 ⚛️  Port 3000 — React + Redux + Tailwind
├── scripts/
│   └── init-databases.sh     🗃️  Auto-creates all 6 PostgreSQL databases
├── docker-compose.yml        🐳 One command to run everything
└── .env.example              🔑 Copy this to .env and fill in secrets
```

---

## ⚡ QUICK START (Docker — Recommended)

### Step 1 — Set up Gmail OTP (FREE, takes 2 minutes)

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** → **2-Step Verification** → Enable if not already
3. Scroll down → **App Passwords**
4. Select app: **Mail** → Generate
5. Copy the **16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 2 — Create your `.env` file

In `E:\heytaxiApplication`, run:
```powershell
copy .env.example .env
```

Open `.env` and fill in:
```env
GMAIL_USERNAME=your-actual-gmail@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
JWT_SECRET=heytaxi-super-secret-jwt-key-2024-production-ready-key
POSTGRES_USER=heytaxi
POSTGRES_PASSWORD=Korra@2026
```

### Step 3 — Start everything

```powershell
# Open PowerShell in E:\heytaxiApplication
docker-compose up --build
```

⏳ First run takes ~5 minutes (downloads images, compiles all services)

### Step 4 — Open the app

| What | URL |
|------|-----|
| 🌐 **HeyTaxi App** | http://localhost:3000 |
| 📡 **Eureka Dashboard** | http://localhost:8761 |
| 🔀 **API Gateway** | http://localhost:8080 |

---

## 💻 LOCAL DEVELOPMENT (IntelliJ IDEA — No Docker)

### Prerequisites already installed on your PC:
- ✅ Java JDK 21+
- ✅ Maven
- ✅ Node.js
- ✅ PostgreSQL (password: `Korra@2026`)
- ✅ IntelliJ IDEA
- ✅ Docker Desktop (for Redis only)

### Step 1 — Start PostgreSQL databases

Open pgAdmin or psql and run:
```sql
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE driver_db;
CREATE DATABASE ride_db;
CREATE DATABASE fare_db;
CREATE DATABASE payment_db;
```

### Step 2 — Start Redis (only needs Docker for this)
```powershell
docker run -d -p 6379:6379 --name heytaxi-redis redis:7-alpine
```

### Step 3 — Open each service in IntelliJ IDEA

Open IntelliJ → File → Open → Select `E:\heytaxiApplication\backend\eureka-server`

Or open all at once: File → Open → `E:\heytaxiApplication\backend` (as Maven project)

Run in this order:
1. `eureka-server` → Run `EurekaServerApplication`
2. `api-gateway` → Run `ApiGatewayApplication`  
3. `auth-service` → Run `AuthServiceApplication`
4. `notification-service` → Run `NotificationServiceApplication`
5. `driver-service` → Run `DriverServiceApplication`
6. `ride-service` → Run `RideServiceApplication`

### Step 4 — Start Frontend

```powershell
cd E:\heytaxiApplication\frontend
npm install
npm run dev
```

Open http://localhost:3000 ✅

---

## 🚀 DEPLOY TO RAILWAY (Free Hosting)

Railway gives you **$5 free credit** per month — enough for development/testing.

### Step 1 — Create Railway account
Go to [railway.app](https://railway.app) → Sign up with GitHub

### Step 2 — Install Railway CLI
```powershell
npm install -g @railway/cli
railway login
```

### Step 3 — Deploy PostgreSQL & Redis on Railway
```
Railway Dashboard → New Project → Add PostgreSQL
Railway Dashboard → New Project → Add Redis
```
Copy the connection URLs from Railway dashboard.

### Step 4 — Deploy each service

For each backend service (start with eureka-server):
```powershell
cd E:\heytaxiApplication\backend\eureka-server
railway up
```

Set environment variables in Railway dashboard for each service:
```
SPRING_DATASOURCE_URL=<Railway PostgreSQL URL>
SPRING_DATASOURCE_USERNAME=<Railway PG user>
SPRING_DATASOURCE_PASSWORD=<Railway PG password>
SPRING_DATA_REDIS_HOST=<Railway Redis host>
SPRING_DATA_REDIS_PORT=<Railway Redis port>
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=https://<your-eureka-railway-url>/eureka/
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-16-char-app-password
JWT_SECRET=heytaxi-super-secret-jwt-key-2024-production-ready-key
```

### Step 5 — Deploy Frontend
```powershell
cd E:\heytaxiApplication\frontend
railway up
```

Set in Railway: `VITE_API_BASE_URL=https://<your-api-gateway-railway-url>`

---

## 🏍️ HOW THE APP WORKS

### Roles
| Role | What they do |
|------|-------------|
| 🧑 **RIDER** | Register → Book rides → Track → Pay → Rate |
| 🚖 **DRIVER** | Register → Add vehicle → Go Online → Accept rides → Earn |
| ⚙️ **ADMIN** | Verify drivers → View stats → Monitor commission |

### Ride Flow
```
Rider requests ride
      ↓
System calculates fare (Haversine formula)
      ↓
Nearest available driver gets notified
      ↓
Driver accepts → arrives → starts ride
      ↓
Ride completed → Fare charged
      ↓
₹2 commission deducted automatically
      ↓
Driver receives: Fare - ₹2
Platform receives: ₹2
```

### 💰 Fare Structure

| Vehicle | Base | Per KM | Example (5km) |
|---------|------|--------|---------------|
| 🏍️ Bike | ₹20 | ₹8/km | ₹60 |
| 🛺 Auto | ₹25 | ₹12/km | ₹85 |
| 🚗 Car | ₹40 | ₹18/km | ₹130 |

**Platform earns ₹2 from every completed ride.**

---

## 🔑 KEY API ENDPOINTS

All go through API Gateway at `http://localhost:8080`

### Auth (Public — no token needed)
```http
POST /api/auth/register      → Register new user
POST /api/auth/send-otp      → Send OTP to email
POST /api/auth/verify-otp    → Verify OTP → returns JWT token
POST /api/auth/refresh-token → Get new access token
POST /api/auth/logout        → Logout
```

### Rides (Requires JWT Bearer token)
```http
POST /api/rides/request          → Book a ride
POST /api/rides/{id}/accept      → Driver accepts (DRIVER role)
POST /api/rides/{id}/start       → Start ride (DRIVER)
POST /api/rides/{id}/complete    → Complete ride + ₹2 commission (DRIVER)
POST /api/rides/{id}/cancel      → Cancel ride
POST /api/rides/{id}/rate        → Rate ride (RIDER)
GET  /api/rides/my-rides         → Rider history
GET  /api/rides/driver-rides     → Driver history
GET  /api/rides/current          → Current active ride
GET  /api/rides/admin/stats      → Platform stats (ADMIN)
```

### Drivers
```http
POST  /api/drivers/register       → Register vehicle
GET   /api/drivers/profile        → Get driver profile
PATCH /api/drivers/status         → Go Online/Offline
PATCH /api/drivers/location       → Update GPS location
GET   /api/drivers/nearby         → Find nearby drivers
GET   /api/drivers/admin/all      → All drivers (ADMIN)
PATCH /api/drivers/admin/{id}/verify → Verify driver (ADMIN)
```

---

## 🏗️ Tech Stack Details

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | Java 21 | Modern, fast, production-proven |
| Framework | Spring Boot 3.2 | Industry standard for microservices |
| Service Discovery | Netflix Eureka | Auto-registers/discovers services |
| API Gateway | Spring Cloud Gateway | Routing + JWT validation |
| Auth | JWT + Redis | Stateless tokens, OTP storage |
| OTP Email | Gmail SMTP | **Free**, reliable, no setup cost |
| Database | PostgreSQL | Reliable, production-grade |
| Cache | Redis | OTP storage, session management |
| Frontend | React 18 + Redux Toolkit | Modern, fast state management |
| Styling | Tailwind CSS | Utility-first, responsive |
| Routing | React Router v6 | Declarative routing |
| HTTP Client | Axios + interceptors | Auto JWT attachment + refresh |
| Containers | Docker + Docker Compose | One-command deployment |
| Prod Server | Nginx | Serve React + proxy API |

---

## 🔒 Security Features

- ✅ JWT Access Tokens (24h expiry)
- ✅ JWT Refresh Tokens (7 days, stored in Redis)
- ✅ OTP is one-time use (deleted from Redis after use)
- ✅ OTP expires in 10 minutes
- ✅ Rate limiting on auth endpoints
- ✅ Role-based access (RIDER / DRIVER / ADMIN)
- ✅ API Gateway validates ALL tokens before forwarding
- ✅ Non-root Docker containers
- ✅ Secrets via environment variables (never hardcoded)

---

## 📞 Support

Built from scratch for production deployment.  
For issues, check service logs: `docker-compose logs auth-service`
