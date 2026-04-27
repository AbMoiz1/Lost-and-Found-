# Lost & Found Portal — ECS on EC2 Deployment

A microservices-based web application deployed on AWS using ECS on EC2, Terraform, and 18 infrastructure modules. Users report lost/found items, and the system automatically matches them using a scoring algorithm. When a match is found, the owner gets an email via SES.

## Live URL

`https://d1zjw94zgeibun.cloudfront.net`

## Screenshots

## ECS Cluster Running
<img width="1896" height="858" alt="image" src="https://github.com/user-attachments/assets/a29b0c62-2b49-49c7-8e15-9e73f3084eef" />

## Registration
<img width="1896" height="1025" alt="image" src="https://github.com/user-attachments/assets/7bbd0a8b-68fb-4d03-9ce3-f439ec8806ee" />

## Login
<img width="1919" height="1028" alt="image" src="https://github.com/user-attachments/assets/87deda36-c27d-48e1-aeed-e05efd6989e9" />

## Home Page
<img width="1897" height="1042" alt="image" src="https://github.com/user-attachments/assets/80b9626c-c875-4235-907c-69214ab3a746" />

## Dashboard
<img width="1903" height="1021" alt="image" src="https://github.com/user-attachments/assets/cb5384cf-6880-40f8-a18c-1986d1b2ee17" />

## Report Lost Item 
<img width="1898" height="1032" alt="image" src="https://github.com/user-attachments/assets/9d074b74-a63f-43f4-a6ab-b57f8a50a8e5" />

## Report Found Item
<img width="1900" height="1024" alt="image" src="https://github.com/user-attachments/assets/07a6d4ff-7afc-4791-98e7-e76bf045586c" />





## Architecture

```
CloudFront (CDN)
  ├── /* → S3 (React frontend)
  └── /api/* → Public ALB → Nginx Gateway (ECS) → Internal ALB
                                                      ├── Auth Service (ECS)     → RDS auth_db
                                                      ├── Item Service (ECS)     → RDS item_db → SNS
                                                      ├── Search Service (ECS)   → OpenSearch
                                                      ├── Image Service (ECS)    → S3 images
                                                      └── Admin Service (ECS)    → All RDS DBs

SNS items-topic → SQS → Search Service (indexes in OpenSearch)
                → SQS → Matching Service (ECS, Python) → RDS + Redis
                           └── SNS matches-topic → SQS → Notification Service (ECS) → SES email
```

## AWS Services Used

| Service | Replaces (Local) | Purpose |
|---------|-----------------|---------|
| VPC + 3 AZs | Docker bridge network | Network isolation, HA |
| ECS on EC2 | docker-compose up | Container orchestration |
| Public ALB | Gateway Nginx (:8080) | Internet entry point |
| Internal ALB | Docker DNS | Service-to-service routing |
| RDS PostgreSQL Multi-AZ | 4 PostgreSQL containers | Managed databases with failover |
| ElastiCache Redis | redis:7-alpine | Managed cache with Multi-AZ |
| OpenSearch Service | opensearch:2.13.0 | Managed search engine |
| SNS + SQS | RabbitMQ fanout exchanges | Serverless messaging |
| S3 | LocalStack S3 + Nginx | Frontend hosting + image storage |
| CloudFront | Frontend Nginx (:3000) | CDN with 400+ edge locations |
| WAF | Nginx rate limiting | SQL injection, XSS, rate limiting |
| SES | MailHog | Real email delivery |
| Secrets Manager | .env file | Encrypted secrets with rotation |
| IAM | No access control | Per-service least-privilege roles |
| ECR | Local docker build | Container image registry |
| CloudWatch | docker logs | Centralized logging + alarms |
| Route 53 | localhost | DNS (ready for custom domain) |

## Terraform Modules (18)

```
terraform/modules/
├── state/                    # S3 + DynamoDB for Terraform state
├── networking/
│   ├── vpc/                  # VPC, 6 subnets, IGW, 3 NATs, route tables
│   └── security-groups/      # 6 SGs with chaining rules
├── data/
│   ├── rds/                  # 4 PostgreSQL databases (Multi-AZ)
│   ├── elasticache/          # Redis replication group
│   └── opensearch/           # OpenSearch domain (2 nodes)
├── messaging/
│   └── sns-sqs/              # 2 SNS topics, 3 SQS queues, 3 DLQs
├── storage/
│   ├── s3/                   # Images bucket + frontend bucket
│   └── secrets/              # 6 secrets in Secrets Manager
├── identity/
│   ├── iam/                  # 9 IAM roles (execution + 8 task roles)
│   └── ecr/                  # 8 Docker image repositories
├── compute/
│   └── ecs/                  # ECS cluster, ASG, 8 task defs, 8 services
├── edge/
│   ├── alb/                  # Public + Internal ALBs, target groups
│   ├── cloudfront/           # CDN distribution
│   ├── waf/                  # Web Application Firewall
│   └── route53/              # DNS (conditional on domain)
├── email/
│   └── ses/                  # Email delivery
└── monitoring/
    └── cloudwatch/           # 9 alarms (CPU, 5xx, DLQ, RDS)
```

## Deployment

### Prerequisites
- AWS CLI configured with admin access
- Terraform >= 1.5
- Docker

### Deploy Infrastructure
```bash
cd terraform
terraform init
terraform apply -var-file="environments/dev.tfvars"
```

### Build and Push Docker Images
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push all services
for svc in gateway auth item search image admin matching notification; do
  docker build -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/moiz-lost-and-found/$svc:latest -f services/$svc/Dockerfile services/
  docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/moiz-lost-and-found/$svc:latest
done
```

### Upload Frontend
```bash
cd frontend && npm run build
aws s3 sync dist/ s3://moiz-lost-and-found-frontend-dev --delete
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

## Cost Estimate (Dev)

| Resource | Monthly Cost |
|----------|-------------|
| NAT Gateways (3x) | ~$100 |
| RDS Multi-AZ (4x db.t3.micro) | ~$60 |
| OpenSearch (2x t3.small.search) | ~$54 |
| ALBs (2x) | ~$32 |
| ElastiCache Redis (2x cache.t3.micro) | ~$26 |
| EC2 instances (2x t3.medium) | ~$60 |
| **Total** | **~$332/month** |

## Branches

- `main` — Application code + local docker-compose setup
- `ecs-deployment` — ECS on EC2 Terraform infrastructure (this branch)
- `serverless` — Lambda + API Gateway (coming next)
