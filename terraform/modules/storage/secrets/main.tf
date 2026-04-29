# ─────────────────────────────────────────────────────────────────────────────
# Secrets Manager — Updated for Aurora Serverless v2
# ─────────────────────────────────────────────────────────────────────────────

# Aurora cluster credentials
resource "aws_secretsmanager_secret" "aurora_credentials" {
  name                    = "${var.project}/aurora-credentials"
  description             = "Aurora Serverless v2 master credentials"
  recovery_window_in_days = 0
  tags                    = { Name = "${var.project}/aurora-credentials" }
}

resource "aws_secretsmanager_secret_version" "aurora_credentials" {
  secret_id = aws_secretsmanager_secret.aurora_credentials.id
  secret_string = jsonencode({
    host     = var.aurora_endpoint
    username = "dbadmin"
    password = var.db_master_password
    port     = 5432
  })
}

# JWT Secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project}/jwt-secret"
  description             = "JWT signing secret"
  recovery_window_in_days = 0
  tags                    = { Name = "${var.project}/jwt-secret" }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# OpenSearch credentials
resource "aws_secretsmanager_secret" "opensearch_credentials" {
  name                    = "${var.project}/opensearch-credentials"
  description             = "OpenSearch Serverless credentials"
  recovery_window_in_days = 0
  tags                    = { Name = "${var.project}/opensearch-credentials" }
}

resource "aws_secretsmanager_secret_version" "opensearch_credentials" {
  secret_id = aws_secretsmanager_secret.opensearch_credentials.id
  secret_string = jsonencode({
    endpoint = var.opensearch_endpoint
  })
}
