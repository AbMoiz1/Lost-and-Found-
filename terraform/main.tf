# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Root Module
# ─────────────────────────────────────────────────────────────────────────────
# This is the root module that composes all child modules together.
# Each module is added here as we build it, passing outputs from one
# module as inputs to the next.
# ─────────────────────────────────────────────────────────────────────────────

# ── Module 1: State ──────────────────────────────────────────────────────────
module "state" {
  source  = "./modules/state"
  project = var.project
}

# ── Module 2: VPC ───────────────────────────────────────────────────────────
module "vpc" {
  source   = "./modules/networking/vpc"
  project  = var.project
  vpc_cidr = var.vpc_cidr
}

# ── Module 3: Security Groups ──────────────────────────────────────────────
module "security_groups" {
  source  = "./modules/networking/security-groups"
  project = var.project
  vpc_id  = module.vpc.vpc_id
}

# ── Module 4: RDS PostgreSQL ───────────────────────────────────────────────
module "rds" {
  source             = "./modules/data/rds"
  project            = var.project
  private_subnet_ids = module.vpc.private_subnet_ids
  rds_sg_id          = module.security_groups.rds_sg_id
  instance_class     = "db.t3.micro"
  multi_az           = true
}

# ── Module 5: ElastiCache Redis ────────────────────────────────────────────
module "elasticache" {
  source             = "./modules/data/elasticache"
  project            = var.project
  private_subnet_ids = module.vpc.private_subnet_ids
  redis_sg_id        = module.security_groups.redis_sg_id
  node_type          = "cache.t3.micro"
}

# ── Module 6: OpenSearch ───────────────────────────────────────────────────
module "opensearch" {
  source             = "./modules/data/opensearch"
  project            = var.project
  private_subnet_ids = module.vpc.private_subnet_ids
  opensearch_sg_id   = module.security_groups.opensearch_sg_id
  instance_type      = "t3.small.search"
  master_password    = var.opensearch_master_password
}

# ── Module 7: SNS + SQS Messaging ─────────────────────────────────────────
module "messaging" {
  source  = "./modules/messaging/sns-sqs"
  project = var.project
}

# ── Module 8: S3 Buckets ──────────────────────────────────────────────────
module "s3" {
  source      = "./modules/storage/s3"
  project     = var.project
  environment = var.environment
}

# ── Module 9: Secrets Manager ─────────────────────────────────────────────
module "secrets" {
  source                     = "./modules/storage/secrets"
  project                    = var.project
  db_connection_strings      = module.rds.db_connection_strings
  opensearch_master_password = var.opensearch_master_password
}

# ── Module 10: IAM Roles ──────────────────────────────────────────────────
module "iam" {
  source                        = "./modules/identity/iam"
  project                       = var.project
  all_secret_arns               = module.secrets.all_secret_arns
  db_secret_arns                = module.secrets.db_secret_arns
  jwt_secret_arn                = module.secrets.jwt_secret_arn
  opensearch_secret_arn         = module.secrets.opensearch_secret_arn
  items_topic_arn               = module.messaging.items_topic_arn
  matches_topic_arn             = module.messaging.matches_topic_arn
  search_items_queue_arn        = module.messaging.search_items_queue_arn
  matching_items_queue_arn      = module.messaging.matching_items_queue_arn
  notification_matches_queue_arn = module.messaging.notification_matches_queue_arn
  opensearch_domain_arn         = module.opensearch.domain_arn
  images_bucket_arn             = module.s3.images_bucket_arn
}

# ── Module 11: ECR ────────────────────────────────────────────────────────
module "ecr" {
  source  = "./modules/identity/ecr"
  project = var.project
}

# ── Module 12: ECS on EC2 ─────────────────────────────────────────────────
module "ecs" {
  source                         = "./modules/compute/ecs"
  project                        = var.project
  region                         = var.primary_region
  private_subnet_ids             = module.vpc.private_subnet_ids
  ecs_sg_id                      = module.security_groups.ecs_sg_id
  execution_role_arn             = module.iam.execution_role_arn
  task_role_arns                 = module.iam.task_role_arns
  ecr_urls                       = module.ecr.repository_urls
  db_secret_arns                 = module.secrets.db_secret_arns
  jwt_secret_arn                 = module.secrets.jwt_secret_arn
  opensearch_secret_arn          = module.secrets.opensearch_secret_arn
  opensearch_endpoint            = module.opensearch.domain_endpoint
  redis_endpoint                 = module.elasticache.primary_endpoint
  items_topic_arn                = module.messaging.items_topic_arn
  matches_topic_arn              = module.messaging.matches_topic_arn
  search_items_queue_url         = module.messaging.search_items_queue_url
  matching_items_queue_url       = module.messaging.matching_items_queue_url
  notification_matches_queue_url = module.messaging.notification_matches_queue_url
  images_bucket_name             = module.s3.images_bucket_name
  internal_alb_dns               = module.alb.internal_alb_dns
  instance_type                  = "t3.medium"
  asg_min                        = 1
  asg_max                        = 3
  asg_desired                    = 2
  gateway_target_group_arn       = module.alb.target_group_arns["gateway"]
  auth_target_group_arn          = module.alb.target_group_arns["auth"]
  item_target_group_arn          = module.alb.target_group_arns["item"]
  search_target_group_arn        = module.alb.target_group_arns["search"]
  image_target_group_arn         = module.alb.target_group_arns["image"]
  admin_target_group_arn         = module.alb.target_group_arns["admin"]
}

# ── Module 13: ALB ────────────────────────────────────────────────────────
module "alb" {
  source             = "./modules/edge/alb"
  project            = var.project
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  public_alb_sg_id   = module.security_groups.public_alb_sg_id
  internal_alb_sg_id = module.security_groups.internal_alb_sg_id
}

# ── Module 14: CloudFront ─────────────────────────────────────────────────
module "cloudfront" {
  source                          = "./modules/edge/cloudfront"
  project                         = var.project
  frontend_bucket_regional_domain = module.s3.frontend_bucket_regional_domain
  cloudfront_oai_path             = module.s3.cloudfront_oai_path
  public_alb_dns                  = module.alb.public_alb_dns
}

# ── Module 15: WAF ────────────────────────────────────────────────────────
module "waf" {
  source         = "./modules/edge/waf"
  project        = var.project
  public_alb_arn = module.alb.public_alb_arn
}

# ── Module 16: SES ────────────────────────────────────────────────────────
module "ses" {
  source       = "./modules/email/ses"
  project      = var.project
  sender_email = var.sender_email
}

# ── Module 17: CloudWatch ─────────────────────────────────────────────────
module "cloudwatch" {
  source                = "./modules/monitoring/cloudwatch"
  project               = var.project
  ecs_cluster_name      = module.ecs.cluster_name
  public_alb_arn_suffix = module.alb.public_alb_arn_suffix
}

# ── Module 18: Route 53 ──────────────────────────────────────────────────
module "route53" {
  source                    = "./modules/edge/route53"
  project                   = var.project
  domain_name               = var.domain_name
  cloudfront_domain_name    = module.cloudfront.distribution_domain_name
  cloudfront_hosted_zone_id = module.cloudfront.distribution_hosted_zone_id
  public_alb_dns            = module.alb.public_alb_dns
}
