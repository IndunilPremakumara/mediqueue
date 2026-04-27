# MediQueue

A microservices-based medical appointment management system built with Node.js, React, and Docker.

## Features

- **User Management**: Registration and authentication for doctors, patients, and admins
- **Appointment Scheduling**: Book, manage, and track medical appointments
- **Queue Management**: Real-time queue handling with Redis
- **Notifications**: Automated notifications via RabbitMQ
- **Admin Dashboard**: System administration and monitoring
- **Real-time Updates**: WebSocket integration for live updates

## Architecture

MediQueue follows a microservices architecture with the following components:

- **Frontend**: React application served via Vite
- **API Gateway**: Central entry point for all API requests
- **User Service**: Handles user authentication and profiles (MongoDB)
- **Appointment Service**: Manages appointments and schedules (PostgreSQL)
- **Queue Service**: Real-time queue operations (Redis)
- **Notification Service**: Sends notifications via message queues (RabbitMQ)
- **Message Broker**: RabbitMQ for inter-service communication

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: React, Vite
- **Databases**: MongoDB, PostgreSQL, Redis
- **Message Queue**: RabbitMQ
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **Real-time Communication**: Socket.io

## Quick Start

```bash
git clone https://github.com/IndunilPremakumara/mediqueue.git
cd mediqueue
docker-compose up --build
```

Then in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in with the demo accounts below.

## Demo Accounts

These accounts are available immediately after startup:

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Doctor  | doctor@test.com     | password123 |
| Patient | patient@test.com    | password123 |
| Admin   | admin@test.com      | password123 |

## Prerequisites

- Docker (version 20.10 or later)
- Docker Compose (version 2.0 or later)
- Node.js (version 18 or later) — for running the frontend locally

## Environment Variables

For local development or custom deployments, create `.env` files in the respective service directories with the following variables:

### User Service (`services/user-service/.env`)
```
MONGO_URI=mongodb://localhost:27017/mediqueue-users
JWT_SECRET=your-super-secret-jwt-key
```

### Appointment Service (`services/appointment-service/.env`)
```
DB_URI=postgresql://postgres:password@localhost:5432/mediqueue
RABBITMQ_URL=amqp://localhost
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
```

### Queue Service (`services/queue-service/.env`)
```
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost
JWT_SECRET=your-super-secret-jwt-key
```

**Note**: When using Docker Compose, these variables are set with default values. For production, use strong, unique secrets for `JWT_SECRET` and configure database URLs accordingly. The notification service and gateway use default configurations and do not require `.env` files for basic operation.

Once running, services are available at:

| Service               | URL                              |
|-----------------------|----------------------------------|
| Frontend              | http://localhost:5173            |
| API Gateway           | http://localhost:8081            |
| User Service          | http://localhost:3001            |
| Appointment Service   | http://localhost:3002            |
| Queue Service         | http://localhost:3003            |
| RabbitMQ Management   | http://localhost:15672           |

## Kubernetes Deployment

For production deployment using Kubernetes:

1. Apply the secrets:
   ```bash
   kubectl apply -f k8s/secrets.yaml
   ```

2. Deploy the services:
   ```bash
   kubectl apply -f k8s/
   ```

3. Check the ingress for external access.

## Security

This project uses Snyk for vulnerability scanning of dependencies. To run security scans locally:

1. Install Snyk CLI:
   ```bash
   npm install -g snyk
   ```

2. Authenticate with your Snyk account:
   ```bash
   snyk auth
   ```

3. Run security tests:
   ```bash
   cd frontend
   snyk test
   ```

Security scans are also automatically run in the CI/CD pipeline on every push and pull request.
| MongoDB               | localhost:27017                  |
| PostgreSQL            | localhost:5432                   |
| Redis                 | localhost:6379                   |

> **Note:** RabbitMQ Management UI uses `guest/guest` credentials. These are development defaults only. In production, credentials are managed via Kubernetes Secrets.

## Creating Additional Test Accounts

### Option 1: Via Frontend
1. Open http://localhost:5173
2. Click "Register" and create accounts with different roles (doctor, patient, admin)

### Option 2: Via API

**Register a Doctor:**
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Test",
    "email": "doctor@test.com",
    "password": "password123",
    "role": "doctor"
  }'
```

**Register a Patient:**
```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Patient Test",
    "email": "patient@test.com",
    "password": "password123",
    "role": "patient"
  }'
```

**Login and get a JWT token:**
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "password123"
  }'
```

**Use the token on a protected endpoint:**
```bash
curl -X GET http://localhost:8081/api/appointments \
  -H "Authorization: Bearer <your_token_here>"
```

## Kubernetes Deployment (Production)

Kubernetes manifests are available in the `k8s/` folder for production-grade deployment with autoscaling.

```bash
# 1. Apply secrets first
kubectl apply -f k8s/secret.yaml

# 2. Apply all remaining manifests
kubectl apply -f k8s/

# 3. Verify pods are running
kubectl get pods

# 4. Check autoscalers
kubectl get hpa
```

To scale a service manually:
```bash
kubectl scale deployment appointment-service --replicas=3
```

To scale using Docker Compose locally:
```bash
docker-compose up --scale appointment-service=3
```

## Services Overview

| Service                | Directory                        | Port  | Database   | Description                                      |
|------------------------|----------------------------------|-------|------------|--------------------------------------------------|
| Frontend               | `frontend/`                      | 5173  | —          | React SPA with Socket.IO for real-time updates   |
| API Gateway            | `gateway/`                       | 8081  | —          | JWT validation and request routing               |
| User Service           | `services/user-service/`         | 3001  | MongoDB    | Registration, login, and user profiles           |
| Appointment Service    | `services/appointment-service/`  | 3002  | PostgreSQL | Booking, cancellation, and scheduling            |
| Queue Service          | `services/queue-service/`        | 3003  | Redis      | Real-time queue positions via WebSocket          |
| Notification Service   | `services/notification-service/` | —     | —          | Async email/SMS notifications via RabbitMQ       |

## Architecture

The system follows a microservices pattern with three communication methods:

- **Synchronous (REST):** Client → API Gateway → individual services
- **Asynchronous (RabbitMQ):** Appointment Service publishes events → Queue and Notification services consume them
- **Real-time (WebSocket):** Queue Service pushes live position updates to the frontend via Socket.IO

Each service uses the database best suited to its data:
- **MongoDB** — flexible document storage for user profiles
- **PostgreSQL** — relational data for appointments and scheduling
- **Redis** — fast in-memory storage for real-time queue state

Security is enforced at the API Gateway using JWT tokens. All protected routes require a valid `Authorization: Bearer <token>` header. Kubernetes HPA automatically scales the Appointment and Queue services under load.

For detailed database schemas, sequence diagrams, and implementation notes see the project report.
