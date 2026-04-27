# Lost & Found — Local Data Flow Diagram

## Overview
Everything runs on `localhost` via `docker compose up`. All 15 containers share a single Docker bridge network called `backend`.

---

## 1. User Request Flow (HTTP)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│                     http://localhost:3000                            │
└──────────────┬──────────────────────────────────┬───────────────────┘
               │                                  │
          GET /  (page load)              POST /api/items/lost
               │                                  │
               ▼                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  FRONTEND NGINX (:3000)                               │
│                                                                      │
│   location / {                        location /api/ {               │
│     try_files → index.html              proxy_pass →                 │
│     (serves React app)                  gateway:8080                 │
│   }                                   }                              │
└──────────────────────────────────────────┬───────────────────────────┘
                                           │
                                    /api/* requests
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  GATEWAY NGINX (:8080)                                │
│                  Rate Limit: 100 req/min per IP                      │
│                                                                      │
│   /api/auth/*   → proxy_pass http://auth:4001                        │
│   /api/items/*  → proxy_pass http://item:4002                        │
│   /api/search/* → proxy_pass http://search:4003                      │
│   /api/images/* → proxy_pass http://image:4004                       │
│   /api/admin/*  → proxy_pass http://admin:4005                       │
└───┬─────────┬──────────┬──────────┬──────────┬──────────────────────┘
    │         │          │          │          │
    ▼         ▼          ▼          ▼          ▼
┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│  Auth  ││  Item  ││ Search ││ Image  ││ Admin  │
│ :4001  ││ :4002  ││ :4003  ││ :4004  ││ :4005  │
│Node.js ││Node.js ││Node.js ││Node.js ││Node.js │
└───┬────┘└──┬──┬──┘└──┬──┬──┘└───┬────┘└───┬────┘
    │        │  │      │  │       │         │
    ▼        ▼  │      ▼  │       ▼         ▼
┌──────┐┌──────┐│ ┌────────┐ ┌────────┐┌──────────────────┐
│auth  ││item  ││ │Open-   │ │Local-  ││ All 4 DBs        │
│_db   ││_db   ││ │Search  │ │Stack   ││ (read-only)      │
│:5432 ││:5432 ││ │:9200   │ │S3:4566 ││ auth + item +    │
└──────┘└──────┘│ └────────┘ └────────┘│ matching + admin  │
                │                      └──────────────────┘
                │
           publishes
           event to
           RabbitMQ
```

---

## 2. Event-Driven Flow (RabbitMQ)

This is the async pipeline that runs AFTER a user reports an item.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         RABBITMQ (:5672)                             │
│                    Management UI → :15672                             │
│                                                                      │
│  ┌─────────────────────────┐      ┌──────────────────────────┐      │
│  │  "items" exchange       │      │  "matches" exchange      │      │
│  │  (fanout)               │      │  (fanout)                │      │
│  │                         │      │                          │      │
│  │  Broadcasts to ALL      │      │  Broadcasts to ALL       │      │
│  │  bound queues           │      │  bound queues            │      │
│  └────┬──────────┬─────────┘      └──────────┬───────────────┘      │
│       │          │                            │                      │
└───────┼──────────┼────────────────────────────┼──────────────────────┘
        │          │                            │
        ▼          ▼                            ▼
  ┌──────────┐ ┌──────────────┐         ┌────────────────┐
  │  Search  │ │  Matching    │         │  Notification  │
  │  Service │ │  Service     │         │  Service       │
  │  :4003   │ │  (Python)    │         │  (Python)      │
  └────┬─────┘ └──┬───┬───┬──┘         └──┬──────┬──────┘
       │          │   │   │                │      │
       ▼          │   │   │                │      ▼
  ┌──────────┐    │   │   │                │  ┌────────┐
  │OpenSearch│    │   │   │                │  │MailHog │
  │  :9200   │    │   │   │                │  │ :1025  │
  │ (index)  │    │   │   │                │  │ :8025  │
  └──────────┘    │   │   │                │  │ (SMTP) │
                  │   │   │                │  └────────┘
                  ▼   ▼   │                │
           ┌────────┐ ┌────────┐           │
           │item_db │ │match   │           │
           │(read)  │ │_db     │           ▼
           │:5432   │ │(write) │     ┌──────────┐
           └────────┘ │:5432   │     │Auth Svc  │
                      └────────┘     │:4001     │
                  │                  │(get user │
                  ▼                  │ email)   │
             ┌────────┐              └──────────┘
             │ Redis  │
             │ :6379  │
             │(cache) │
             └────────┘
```

---

## 3. Complete End-to-End: "Moiz Reports a Lost iPhone"

```
Step 1: PAGE LOAD
─────────────────
Browser → localhost:3000 → Frontend Nginx → serves React HTML/CSS/JS

Step 2: USER SUBMITS FORM
─────────────────────────
Browser sends: POST /api/items/lost
  { title: "iPhone 15", category: "Electronics", location: "Central Park" }
    │
    ▼
Frontend Nginx (:3000)
    │ location /api/ → proxy_pass http://gateway:8080
    ▼
Gateway Nginx (:8080)
    │ rate limit check ✓ (under 100 req/min)
    │ location /api/items/ → proxy_pass http://item:4002
    ▼
Item Service (:4002)
    │
    ├──→ INSERT into item_db (PostgreSQL :5432)
    │    { id: 42, type: "lost", title: "iPhone 15", ... }
    │
    └──→ Publish to RabbitMQ "items" exchange
         { event: "item.created", item_id: 42, type: "lost", ... }
    │
    └──→ Response: 201 { id: 42, status: "created" }
         (back through Gateway → Frontend Nginx → Browser)

Step 3: SEARCH INDEXING (async, ~100ms later)
─────────────────────────────────────────────
RabbitMQ "items" exchange (fanout)
    │
    ├──→ Search Service (:4003)
    │      │
    │      └──→ Index in OpenSearch (:9200)
    │           PUT /items/_doc/42
    │           { title: "iPhone 15", category: "Electronics", ... }
    │
    │    Now searchable via: GET /api/search/items?q=iPhone

Step 4: MATCHING (async, ~200ms later)
──────────────────────────────────────
    │
    └──→ Matching Service (Python worker)
           │
           ├──→ Check Redis (:6379) — already scored this pair? Skip.
           │
           ├──→ Query item_db — get all "found" items in "Electronics"
           │
           ├──→ Score each found item against the new lost item:
           │      Found: "iPhone found near Times Square"
           │      ┌─────────────────────────────────────────┐
           │      │ Category: Electronics = Electronics +0.4│
           │      │ Location: cosine("Central Park",        │
           │      │           "Times Square") = 0.15   +0.05│
           │      │ Date: |0 days| / 30 = 0.0          +0.3│
           │      │                            TOTAL = 0.75 │
           │      └─────────────────────────────────────────┘
           │
           ├──→ 0.75 ≥ 0.5 threshold → MATCH FOUND!
           │
           ├──→ INSERT into matching_db (:5432)
           │    { lost_id: 42, found_id: 17, score: 0.75 }
           │
           ├──→ Cache pair in Redis (:6379)
           │
           └──→ Publish to RabbitMQ "matches" exchange
                { event: "match.created", lost_id: 42, found_id: 17 }

Step 5: NOTIFICATION (async, ~300ms later)
──────────────────────────────────────────
RabbitMQ "matches" exchange (fanout)
    │
    └──→ Notification Service (Python worker)
           │
           ├──→ HTTP GET http://auth:4001/api/auth/users/7
           │    Response: { email: "[email]" }
           │
           └──→ SMTP → MailHog (:1025)
                To: [email]
                Subject: "Match Found for your lost iPhone 15!"
                Body: "A potential match (75% confidence) was found..."
                │
                └──→ Viewable at http://localhost:8025 (MailHog UI)
```

---

## 4. All Containers & Ports Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network: backend                       │
│                                                                 │
│  FRONTEND          GATEWAY           APPLICATION SERVICES       │
│  ┌───────────┐     ┌───────────┐     ┌──────────────────────┐  │
│  │ Frontend  │     │ Gateway   │     │ Auth    :4001        │  │
│  │ Nginx     │────▶│ Nginx     │────▶│ Item    :4002        │  │
│  │ :3000     │     │ :8080     │     │ Search  :4003        │  │
│  └───────────┘     └───────────┘     │ Image   :4004        │  │
│                                      │ Admin   :4005        │  │
│  INFRASTRUCTURE                      │ Matching (no port)   │  │
│  ┌──────────────────────────────┐    │ Notification (no port)│  │
│  │ postgres-auth    :5432       │    └──────────────────────┘  │
│  │ postgres-item    :5432       │                               │
│  │ postgres-matching :5432      │    MESSAGE BROKER             │
│  │ postgres-admin   :5432       │    ┌──────────────────────┐  │
│  │ OpenSearch       :9200       │    │ RabbitMQ  :5672      │  │
│  │ Redis            :6379       │    │ Mgmt UI   :15672     │  │
│  │ LocalStack S3    :4566       │    └──────────────────────┘  │
│  │ MailHog SMTP     :1025       │                               │
│  │ MailHog UI       :8025       │    TOTAL: 15 containers      │
│  └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘

Exposed to host machine:
  localhost:3000  → Frontend (user access)
  localhost:8025  → MailHog UI (view emails)
  localhost:8081  → Gateway (direct API access)
  localhost:15672 → RabbitMQ Management
```
