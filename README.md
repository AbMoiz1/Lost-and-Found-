# Lost & Found Portal

A microservices-based web application for reporting lost and found items. Users report what they've lost or found, and the system automatically matches them using a scoring algorithm based on category, location, and date proximity. When a match is found, the owner gets an email notification.

## Architecture Overview

```
Browser (:3000)
  │
  ▼
Frontend Nginx ── serves React app
  │                proxies /api/* ▼
  │
Gateway Nginx (:8080) ── rate limiting (100 req/min)
  │
  ├── /api/auth/*   → Auth Service (:4001)     → PostgreSQL (auth_db)
  ├── /api/items/*  → Item Service (:4002)     → PostgreSQL (item_db) + RabbitMQ
  ├── /api/search/* → Search Service (:4003)   → OpenSearch
  ├── /api/images/* → Image Service (:4004)    → S3 (LocalStack)
  └── /api/admin/*  → Admin Service (:4005)    → All 4 PostgreSQL DBs
```

### Event-Driven Flow (RabbitMQ)

```
Item Service ──publishes "item.created"──→ RabbitMQ "items" exchange (fanout)
                                              ├──→ Search Service (indexes in OpenSearch)
                                              └──→ Matching Service (scores against opposite items)
                                                      │
                                                      ▼ match found (score ≥ 0.5)
                                              RabbitMQ "matches" exchange (fanout)
                                                      │
                                                      ▼
                                              Notification Service
                                                      ├── HTTP → Auth Service (get user email)
                                                      └── SMTP → MailHog (send email)
```

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (client-side routing)
- React Query (server state management)
- Zustand (client state management)
- Zod (form validation)
- Axios (HTTP client)

### Backend — TypeScript Services
- Node.js 20 with TypeScript
- Express.js (web framework)
- PostgreSQL via `pg` (database)
- amqplib (RabbitMQ client)
- jsonwebtoken + bcrypt (auth)
- Zod (request validation)
- AWS SDK v3 (S3 client for image uploads)

### Backend — Python Services
- Python 3.12
- FastAPI + Uvicorn (Matching Service)
- aio-pika (async RabbitMQ client)
- scikit-learn (TF-IDF + cosine similarity for matching)
- psycopg2 (PostgreSQL)
- redis (score caching)
- aiosmtplib (async email sending)

### Infrastructure (Local)
- Docker & Docker Compose
- Nginx (frontend serving + API gateway)
- PostgreSQL 16 (4 separate databases)
- RabbitMQ 3.13 (message broker)
- OpenSearch 2.13 (full-text search)
- Redis 7 (in-memory cache)
- LocalStack (fake S3)
- MailHog (fake SMTP server)

## Services

| Service | Language | Port | Description |
|---------|----------|------|-------------|
| Frontend | TypeScript/React | 3000 | SPA served by nginx, proxies API calls |
| Gateway | Nginx config | 8080 | Rate limiting + path-based routing to services |
| Auth | TypeScript/Express | 4001 | Registration, login, JWT tokens, password reset |
| Item | TypeScript/Express | 4002 | CRUD for lost/found items, claims, publishes events |
| Search | TypeScript/Express | 4003 | Full-text search via OpenSearch, consumes item events |
| Image | TypeScript/Express | 4004 | Image upload/resize/storage via S3 |
| Admin | TypeScript/Express | 4005 | Dashboard stats, user management, claim approval |
| Matching | Python/FastAPI | 8000 | Scores items using TF-IDF, publishes match events |
| Notification | Python | — | Consumes match events, sends emails via SMTP |

## Matching Algorithm

The Matching Service scores item pairs on a 0.0–1.0 scale:

- **Category match** (+0.4) — same category (e.g., both "Electronics")
- **Location similarity** (+0.3) — TF-IDF cosine similarity of location strings
- **Date proximity** (+0.3) — `max(0, 1 - |days_diff| / 30)`

If the score is ≥ 0.5, a match is created and the owner is notified.

## Prerequisites

- Docker & Docker Compose
- Git

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd lost-and-found
```

2. Create the environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker compose up
```

4. Wait for all health checks to pass, then open:
- **App**: http://localhost:3000
- **MailHog** (email viewer): http://localhost:8025
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

## Project Structure

```
├── frontend/                  # React SPA (TypeScript)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route pages
│   │   ├── services/api.ts    # API client (axios)
│   │   ├── store/             # Zustand state
│   │   ├── hooks/             # Custom React hooks
│   │   └── types/             # TypeScript types
│   ├── nginx.conf             # Frontend nginx config
│   └── Dockerfile
│
├── gateway/
│   └── nginx.conf             # API gateway routing + rate limiting
│
├── services/
│   ├── auth/                  # Auth Service (Node.js)
│   ├── item/                  # Item Service (Node.js)
│   ├── search/                # Search Service (Node.js)
│   ├── image/                 # Image Service (Node.js)
│   ├── admin/                 # Admin Service (Node.js)
│   ├── matching/              # Matching Service (Python)
│   ├── notification/          # Notification Service (Python)
│   └── shared/                # Shared message broker abstractions
│
├── localstack-init/           # S3 bucket creation script
├── docs/                      # Architecture documentation
├── tests/                     # End-to-end tests
├── docker-compose.yml         # Local orchestration
└── .env.example               # Environment variables template
```

## Environment Variables

All configuration is in `.env`. Key variables:

| Variable | Used By | Description |
|----------|---------|-------------|
| `JWT_SECRET` | Auth, Item, Admin | Secret key for signing JWT tokens |
| `AUTH_DATABASE_URL` | Auth | PostgreSQL connection string |
| `ITEM_DATABASE_URL` | Item, Admin, Matching | PostgreSQL connection string |
| `MATCHING_DATABASE_URL` | Matching, Admin | PostgreSQL connection string |
| `ADMIN_DATABASE_URL` | Admin | PostgreSQL connection string |
| `RABBITMQ_URL` | Item, Search, Matching, Notification | AMQP connection string |
| `REDIS_URL` | Matching | Redis connection string |
| `OPENSEARCH_URL` | Search | OpenSearch endpoint |
| `S3_ENDPOINT` | Image | S3-compatible endpoint (LocalStack locally) |
| `S3_BUCKET` | Image | Bucket name for image storage |
| `SMTP_HOST/PORT` | Auth, Notification | SMTP server for sending emails |
| `AUTH_SERVICE_URL` | Notification | Internal URL to fetch user details |
| `MATCH_THRESHOLD` | Matching | Minimum score to create a match (default: 0.5) |

## API Endpoints

### Auth (`/api/auth`)
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login, returns JWT
- `POST /api/auth/password-reset/request` — Request password reset
- `POST /api/auth/password-reset/confirm` — Confirm password reset

### Items (`/api/items`)
- `POST /api/items/lost` — Report a lost item
- `POST /api/items/found` — Report a found item
- `GET /api/items/:id` — Get item details + matches
- `PUT /api/items/:id` — Update an item
- `DELETE /api/items/:id` — Delete an item
- `GET /api/items/my` — Get current user's items
- `POST /api/items/:id/claim` — Claim an item
- `GET /api/items/claims/my` — Get current user's claims
- `GET /api/items/claims/pending` — Get pending claims
- `PUT /api/items/claims/:id` — Approve/reject a claim

### Search (`/api/search`)
- `GET /api/search/items` — Full-text search with filters

### Images (`/api/images`)
- `POST /api/images/upload` — Upload an image (multipart)
- `DELETE /api/images/:id` — Delete an image

### Admin (`/api/admin`)
- `GET /api/admin/dashboard` — Stats (users, items, matches, claims)
- `GET /api/admin/users` — Search users
- `PUT /api/admin/users/:id/deactivate` — Deactivate a user
- `DELETE /api/admin/items/:id` — Delete any item
- `GET /api/admin/claims` — Get all pending claims

## Testing

```bash
# Node.js services (from each service directory)
npm test

# Python services (from each service directory)
pytest

# Frontend
cd frontend && npm run test:run
```

## Stopping

```bash
# Stop all services
docker compose down

# Stop and remove all data (databases, search index, etc.)
docker compose down -v
```
