# ─────────────────────────────────────────────────────────────────────────────
# Lost and Found — Fully Serverless Root Module
# ─────────────────────────────────────────────────────────────────────────────

# ── Module 1: Terraform State ────────────────────────────────────────────────
module "state" {
  source  = "./modules/state"
  project = var.project
}

# ── Module 2: S3 Buckets (frontend + images) ────────────────────────────────
module "s3" {
  source      = "./modules/storage/s3"
  project     = var.project
  environment = var.environment
}

# ── Module 3: SNS + SQS Messaging ───────────────────────────────────────────
module "messaging" {
  source  = "./modules/messaging/sns-sqs"
  project = var.project
}

# ── Module 4: Aurora Serverless v2 ───────────────────────────────────────────
module "aurora" {
  source             = "./modules/data/aurora-serverless"
  project            = var.project
  db_master_password = var.db_master_password
}

# ── Module 5: ElastiCache Serverless ─────────────────────────────────────────
module "elasticache" {
  source  = "./modules/data/elasticache-serverless"
  project = var.project
}

# ── Module 6: Secrets Manager ────────────────────────────────────────────────
module "secrets" {
  source              = "./modules/storage/secrets"
  project             = var.project
  aurora_endpoint     = module.aurora.cluster_endpoint
  db_master_password  = var.db_master_password
  opensearch_endpoint = module.opensearch.collection_endpoint
}

# ── Module 7: Lambda Functions ───────────────────────────────────────────────
module "lambda" {
  source                    = "./modules/compute/lambda"
  project                   = var.project
  all_secret_arns           = module.secrets.all_secret_arns
  aurora_endpoint           = module.aurora.cluster_endpoint
  aurora_secret_arn         = module.secrets.aurora_secret_arn
  jwt_secret_arn            = module.secrets.jwt_secret_arn
  items_topic_arn           = module.messaging.items_topic_arn
  matches_topic_arn         = module.messaging.matches_topic_arn
  search_queue_arn          = module.messaging.search_items_queue_arn
  matching_queue_arn        = module.messaging.matching_items_queue_arn
  notification_queue_arn    = module.messaging.notification_matches_queue_arn
  images_bucket_arn         = module.s3.images_bucket_arn
  images_bucket_name        = module.s3.images_bucket_name
  opensearch_endpoint       = module.opensearch.collection_endpoint
  opensearch_collection_arn = module.opensearch.collection_arn
  redis_endpoint            = module.elasticache.endpoint
  db_username               = "dbadmin"
  db_password               = var.db_master_password
  jwt_secret                = module.secrets.jwt_secret_value
  aurora_vpc_id             = module.aurora.vpc_id
  aurora_subnet_ids         = module.aurora.subnet_ids
  aurora_security_group_id  = module.aurora.security_group_id
}

# ── Module 8: OpenSearch Serverless ──────────────────────────────────────────
module "opensearch" {
  source          = "./modules/data/opensearch-serverless"
  project         = var.project
  lambda_role_arn = module.lambda.execution_role_arn
}

# ── Module 9: API Gateway ───────────────────────────────────────────────────
module "api_gateway" {
  source                = "./modules/edge/api-gateway"
  project               = var.project
  lambda_invoke_arns    = module.lambda.lambda_invoke_arns
  lambda_function_names = module.lambda.lambda_function_names
}

# ── Module 10: CloudFront ────────────────────────────────────────────────────
module "cloudfront" {
  source                          = "./modules/edge/cloudfront"
  project                         = var.project
  frontend_bucket_regional_domain = module.s3.frontend_bucket_regional_domain
  cloudfront_oai_path             = module.s3.cloudfront_oai_path
  api_gateway_endpoint            = module.api_gateway.api_endpoint
}

# ── Module 11: WAF ───────────────────────────────────────────────────────────
module "waf" {
  source  = "./modules/edge/waf"
  project = var.project
}

# ── Module 12: SES ───────────────────────────────────────────────────────────
module "ses" {
  source       = "./modules/email/ses"
  project      = var.project
  sender_email = var.sender_email
}

# ── Module 13: CloudWatch ────────────────────────────────────────────────────
module "cloudwatch" {
  source = "./modules/monitoring/cloudwatch"
  project = var.project
  lambda_function_names = values(module.lambda.lambda_function_names)
  api_gateway_id        = module.api_gateway.api_id
}

# ── Module 14: Route 53 ─────────────────────────────────────────────────────
module "route53" {
  source                    = "./modules/edge/route53"
  project                   = var.project
  domain_name               = var.domain_name
  cloudfront_domain_name    = module.cloudfront.distribution_domain_name
  cloudfront_hosted_zone_id = module.cloudfront.distribution_hosted_zone_id
  api_gateway_endpoint      = module.api_gateway.api_endpoint
}

# ── Module 15: CI/CD Pipeline ────────────────────────────────────────────
module "cicd" {
  source        = "./modules/cicd/codepipeline"
  project       = var.project
  environment   = var.environment
  github_repo   = var.github_repo
  github_branch = "serverless-deployment"
}
