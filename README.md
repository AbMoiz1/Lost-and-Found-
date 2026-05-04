# Lost & Found Portal — Fully Serverless AWS Deployment

A microservices-based web application migrated to a fully serverless architecture on AWS. Users report lost/found items, the system automatically matches them using a scoring algorithm, and notifies owners via email when a match is found.

## Live URLs

| Environment | URL |
|-------------|-----|
| Frontend (CloudFront) | `https://d1zjw94zgeibun.cloudfront.net` |
| API Gateway (Primary) | `https://7tyrsiyxhe.execute-api.us-east-1.amazonaws.com` |

## Architecture

```
Users → Route 53 → CloudFront
  ├── /* → S3 (React frontend, us-east-1)
  └── /api/* → WAF → API Gateway (HTTP API)
                        ├── /api/auth/*   → Auth Lambda    → Aurora Serverless v2
                        ├── /api/items/*  → Item Lambda    → Aurora + SNS
                        ├── /api/search/* → Search Lambda  → OpenSearch Serverless
                        ├── /api/images/* → Image Lambda   → S3 Images
                        └── /api/admin/*  → Admin Lambda   → Aurora Serverless v2

SNS Items Topic → SQS Search Queue    → Search Indexer Lambda → OpenSearch Serverless
                → SQS Matching Queue  → Matching Lambda (Python) → Aurora + ElastiCache Serverless
                                           └── SNS Matches Topic → SQS Notification Queue
                                                                      → Notification Lambda → SES

DR Region (us-west-2) — Warm Standby:
  Route 53 health check → failover → DR API Gateway → DR Lambda functions
  Aurora Global Database (continuous replication, RPO < 5 min)
  S3 Cross-Region Replication (images bucket)
```

## AWS Services

| Service | Purpose | Replaces (Local) |
|---------|---------|-----------------|
| Lambda (8 functions) | Compute — HTTP + event workers | ECS on EC2 containers |
| API Gateway HTTP API | Request routing + throttling | Public ALB + Nginx Gateway |
| Aurora Serverless v2 | PostgreSQL — auto-scales to zero | 4 RDS instances |
| Aurora Global Database | Cross-region replication for DR | RDS read replicas |
| OpenSearch Serverless | Full-text search | Provisioned OpenSearch |
| ElastiCache Serverless | Redis cache for matching scores | Provisioned Redis cluster |
| SNS + SQS | Event-driven messaging | RabbitMQ |
| S3 (+ CRR) | Frontend hosting + image storage | LocalStack + Nginx |
| CloudFront | CDN — 400+ edge locations | Frontend Nginx |
| WAF | SQL injection, XSS, rate limiting | Nginx rate limiting |
| SES | Email notifications | MailHog |
| Secrets Manager | Encrypted credentials | .env file |
| IAM | Per-Lambda least-privilege roles | No access control |
| CloudWatch | Logs + alarms | docker logs |
| CodePipeline + CodeBuild | CI/CD — auto-deploy on push | Manual docker build |
| Route 53 | DNS + health check failover | localhost |

## Terraform Modules (16)

```
terraform/modules/
├── state/                        # S3 + DynamoDB for Terraform state
├── compute/
│   └── lambda/                   # 8 Lambda functions + IAM roles + SQS triggers
├── data/
│   ├── aurora-serverless/        # Aurora Serverless v2 + Global DB + NAT
│   ├── elasticache-serverless/   # ElastiCache Serverless Redis
│   └── opensearch-serverless/    # OpenSearch Serverless collection
├── messaging/
│   └── sns-sqs/                  # 2 SNS topics, 3 SQS queues, 3 DLQs
├── storage/
│   ├── s3/                       # Images + frontend buckets + S3 CRR to DR
│   └── secrets/                  # Aurora, JWT, OpenSearch secrets
├── edge/
│   ├── api-gateway/              # HTTP API + routes + Lambda integrations
│   ├── cloudfront/               # CDN distribution
│   ├── waf/                      # Web Application Firewall
│   └── route53/                  # DNS + health check + failover routing
├── email/
│   └── ses/                      # Email delivery
├── monitoring/
│   └── cloudwatch/               # Lambda error alarms + API 5xx alarms + DLQ alarms
├── cicd/
│   └── codepipeline/             # CodePipeline + CodeBuild + GitHub connection
└── dr/                           # DR region: VPC, Aurora secondary, Lambda, API Gateway
```

## CI/CD Pipeline

Push to `serverless-deployment` branch → CodePipeline auto-triggers:

```
GitHub push
  └── CodePipeline
        ├── CodeBuild: node-services  → builds auth/item/search/image/admin → deploys to Lambda
        ├── CodeBuild: python-services → builds matching/notification → deploys to Lambda
        └── CodeBuild: frontend       → builds React → syncs to S3 → invalidates CloudFront
```

## Disaster Recovery

| Metric | Value |
|--------|-------|
| RPO (data loss) | < 5 minutes |
| RTO (recovery time) | < 30 minutes |
| Strategy | Warm standby in us-west-2 |

**Failover flow:**
1. Route 53 health check detects primary API Gateway failure
2. DNS automatically routes to DR API Gateway (us-west-2)
3. DR Lambda functions serve traffic using Aurora Global DB reader endpoint
4. Aurora Global DB secondary cluster promoted to primary (writable)
5. S3 images already replicated via Cross-Region Replication

## Deployment

### Prerequisites
- AWS CLI configured with admin access
- Terraform >= 1.5

### Deploy Infrastructure
```bash
cd terraform
terraform init
terraform apply -var="github_repo=AbMoiz1/Lost-and-Found-"
```

### First-time Setup
After deploy, approve the GitHub connection in AWS Console:
`CodePipeline → Settings → Connections → moiz-lost-and-found-github → Update pending connection`

### Promote User to Admin
```bash
curl -X POST https://7tyrsiyxhe.execute-api.us-east-1.amazonaws.com/api/auth/make-admin \
  -H "Content-Type: application/json" \
  -d @make-admin.json
```

## Cost Estimate (Dev)

| Resource | Monthly Cost |
|----------|-------------|
| Aurora Serverless v2 (0.5 ACU min) | ~$15 |
| Aurora Global Database (DR) | ~$30 |
| ElastiCache Serverless | ~$10 |
| OpenSearch Serverless | ~$25 |
| Lambda (pay per request) | ~$1 |
| API Gateway | ~$3 |
| NAT Gateways (2x) | ~$65 |
| S3 + CloudFront | ~$5 |
| **Total** | **~$154/month** |

Compared to ~$332/month for the previous ECS on EC2 architecture — roughly 54% cost reduction.

## Branches

- `main` — Application code + local docker-compose setup
- `ecs-deployment` — ECS on EC2 Terraform infrastructure
- `serverless-deployment` — Lambda + API Gateway serverless architecture (this branch)
