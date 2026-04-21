# Lost & Found — AWS Architecture Flow

## Global Layer (Blue Box at Top)

### Route 53
DNS service. User types `lostandfound.com`, Route 53 resolves it. Has health checks on the primary region. If primary dies, automatically routes traffic to DR region.
- Connects to: CloudFront + Public ALB

### CloudFront
CDN. Serves the React frontend (HTML/CSS/JS) from S3 to users worldwide with low latency. Caches static files at edge locations.
- Connects to: S3 (frontend bucket) + Public ALB (for API calls)

### WAF
Web Application Firewall. Sits in front of the Public ALB. Blocks SQL injection, XSS attacks, bot traffic. Rate limits abusive IPs.
- Connects to: Public ALB

### ACM
Certificate Manager. Provides free TLS/SSL certificates. Makes everything HTTPS. Attached to both ALBs.
- Connects to: Public ALB + Internal ALB

### ECR
Elastic Container Registry. Stores Docker images for all 8 services. When you push code, CodeBuild builds a Docker image and pushes it here. ECS pulls images from here to run containers.
- Connects to: CodeBuild (push) + ECS (pull)

### CloudWatch
Monitoring. Collects logs from all services, CPU/memory metrics from ECS, error rates from ALB. Sets alarms that trigger auto-scaling or rollback.
- Connects to: Every service (logs) + ECS (metrics) + CodeDeploy (rollback trigger)

### X-Ray
Distributed tracing. When a request goes through Auth → Item → SQS → Matching → Notification, X-Ray traces the entire chain so you can see where slowdowns happen.
- Connects to: All ECS services

### SES
Simple Email Service. Sends actual emails. When the Notification Service finds a match, it calls SES to send "Match Found!" email to the user.
- Connects to: Notification Service

---

## Primary Region VPC (Pink Box)

### Public Subnets (Blue Inner Box)

#### Internet Gateway
The door between the internet and your VPC. All incoming traffic enters through here.
- Connects to: Internet ↔ Public Subnets

#### NAT Gateways (3x — one per AZ)
Allow services in private subnets to reach the internet (pull Docker images, call SES) without being directly exposed. One per AZ for high availability.
- Connects to: Private Subnets → Internet (outbound only)

#### Public ALB
Application Load Balancer. The only thing exposed to the internet. Receives all API requests from users on port 443 (HTTPS). Distributes traffic across 3 AZs.
- Connects to: WAF (inbound) → Nginx API Gateway (outbound)

---

### Private Subnets — Compute (All 8 Services)

#### ECS Cluster on EC2
Runs all your Docker containers on EC2 instances. Auto Scaling Group spans 3 AZs. NOT Fargate — actual EC2 machines that you control.

#### Nginx API Gateway
First service that receives requests from Public ALB. Routes by URL path to the correct backend service via Internal ALB. Also does rate limiting (100 req/min per IP).
- Receives from: Public ALB
- Sends to: Internal ALB

#### Internal ALB
Private load balancer. Only accessible inside the VPC. Routes requests from Nginx to the correct service based on path rules.
- Receives from: Nginx Gateway
- Sends to: Auth, Item, Search, Image, Admin services

#### Auth Service (Node.js)
Handles registration, login, JWT tokens, password reset. When a user registers, it hashes the password with bcrypt and stores in RDS. Returns a JWT token that all other services validate.
- Connects to: RDS auth_db (read/write users)
- Called by: Internal ALB, Notification Service (to fetch user email)

#### Item Service (Node.js)
CRUD for lost and found items. When a user reports a lost/found item, it saves to RDS and publishes an event to SQS. Also handles the claim workflow (create claim, admin approve/reject).
- Connects to: RDS item_db (read/write items + claims)
- Publishes to: SQS Items Queue ("item.created" events)

#### Search Service (Node.js)
Full-text search. Consumes "item.created" events from SQS and indexes items in OpenSearch. When a user searches "iPhone Electronics Central Park", it queries OpenSearch and returns matching results.
- Connects to: OpenSearch (read/write index)
- Consumes from: SQS Items Queue

#### Image Service (Node.js)
Handles image uploads. User uploads a photo of their lost item, this service resizes it to a thumbnail (300x300) using Sharp, stores both original and thumbnail in S3, returns URLs.
- Connects to: S3 Images Bucket (upload/delete)

#### Admin Service (Node.js)
Admin dashboard backend. Returns stats (total users, items, matches, claims). Lets admin search users, deactivate accounts, delete items, approve/reject claims.
- Connects to: All RDS databases (read-only for stats)

#### Matching Service (Python)
The brain. Consumes "item.created" events from SQS. When a new found item is reported, it scores it against all existing lost items using category match (+0.4), location similarity (+0.3), and date proximity (+0.3). If score ≥ 0.5, creates a match record and publishes "match.created" to SQS.
- Connects to: RDS matching_db (write matches) + RDS item_db (read items)
- Connects to: ElastiCache Redis (cache scored pairs)
- Consumes from: SQS Items Queue
- Publishes to: SQS Matches Queue

#### Notification Service (Python)
Sends alerts. Consumes "match.created" events from SQS. Fetches the lost item owner's email from Auth Service. Sends "Potential Match Found!" email via SES. Retries 3 times with exponential backoff on failure.
- Connects to: Auth Service (fetch user email via HTTP)
- Connects to: SES (send email)
- Consumes from: SQS Matches Queue

---

### Messaging (Yellow Box)

#### SQS Items Queue
Carries "item.created" and "item.updated" events. Item Service publishes here. Matching Service and Search Service both consume from here.
- Producer: Item Service
- Consumers: Matching Service + Search Service

#### SQS Matches Queue
Carries "match.created" events. Matching Service publishes here. Notification Service consumes from here.
- Producer: Matching Service
- Consumer: Notification Service

#### SNS
Fan-out notifications. Can broadcast to multiple subscribers (email, SMS, other queues).
- Connects to: SQS queues + SES

---

### Data Layer (Green/Teal Boxes)

#### RDS PostgreSQL Multi-AZ
4 separate databases, all Multi-AZ (automatic failover if one AZ dies):
- `auth_db` — users, passwords, reset tokens
- `item_db` — items, claims
- `matching_db` — match records
- `admin_db` — admin aggregated views
- Cross-region replica to DR region for disaster recovery

#### OpenSearch
Search engine. Stores a searchable index of all items. Supports full-text search, category filters, location filters, date range filters.
- Connected to: Search Service

#### ElastiCache Redis Multi-AZ
In-memory cache. Matching Service caches scored item pairs here so it doesn't re-score the same pairs. Also used for session management.
- Connected to: Matching Service

#### S3 Buckets
Two buckets:
- **Frontend bucket**: stores the built React app (HTML/CSS/JS) → served by CloudFront
- **Images bucket**: stores uploaded item photos (original + thumbnail) → Cross-Region Replication to DR
- Connected to: CloudFront (frontend) + Image Service (images)

---

### Security (Pink Box at Bottom)

#### IAM Roles
Each ECS service gets its own IAM role with only the permissions it needs. Auth Service can only access auth_db. Image Service can only access S3. Least privilege.
- Attached to: Each ECS task definition

#### Secrets Manager
Stores all sensitive values: database passwords, JWT secret, SES credentials. Services read secrets at startup instead of hardcoding them.
- Connected to: All services (read secrets)

---

## DR Region (Red Box on Right)

### Warm Standby
Runs at reduced capacity. If primary region dies:

1. Route 53 health check detects failure
2. Automatically routes traffic to DR region
3. RDS read replica gets promoted to primary (writable)
4. ECS scales up from reduced to full capacity
5. S3 already has all images via Cross-Region Replication

**RPO < 5 minutes** (max 5 min of data loss)
**RTO < 30 minutes** (back online within 30 min)

---

## CI/CD Pipeline (Yellow Box, Bottom-Left)

### GitHub
Source code repository. Developer pushes code here.

### CodePipeline
Orchestrates the entire pipeline.

### CodeBuild
Builds and tests:
1. Lint + static analysis
2. Run unit tests
3. Security scan
4. Docker build
5. Push image to ECR

### CodeDeploy
Deploys to ECS using blue/green strategy:
1. Spins up new containers (green) alongside old ones (blue)
2. Shifts ALB traffic from blue to green
3. Runs smoke tests
4. If tests fail → auto-rollback to blue

### Terraform
Manages all infrastructure as code. State stored in S3 with DynamoDB locking so two people can't modify infra at the same time.

---

## Complete End-to-End Example

**Moiz reports a lost iPhone:**

```
Moiz's browser → Route 53 → CloudFront (loads React app)
    → Moiz fills form, clicks "Report Lost"
    → API call: POST /api/items/lost
    → WAF checks request → Public ALB
    → Nginx Gateway → Internal ALB → Item Service
    → Item Service saves to RDS item_db
    → Item Service publishes "item.created" → SQS Items Queue
    → Search Service indexes it in OpenSearch
    → Matching Service scores against found items
    → Match found (score 0.85)! Saves to RDS matching_db
    → Publishes "match.created" → SQS Matches Queue
    → Notification Service fetches Moiz's email from Auth Service
    → Sends email via SES → Moiz gets "Match Found!" email
```
