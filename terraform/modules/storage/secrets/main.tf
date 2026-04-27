# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Secrets Manager Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: The .env file containing plaintext credentials like
# AUTH_DATABASE_URL=postgresql://auth_user:auth_pass@postgres-auth:5432/auth_db
# Every container reads the same .env — no access control, no encryption.
#
# SA EXAM NOTE:
#   - Secrets Manager encrypts with KMS, provides CloudTrail audit trails
#   - Costs $0.40/secret/month. Parameter Store SecureString is free but
#     lacks native rotation.
#   - ECS task definitions use "valueFrom" to inject secrets as env vars
#     at container startup. The secret value never appears in the task def.
#   - Secret versioning: AWSCURRENT + AWSPREVIOUS both work during rotation
# ─────────────────────────────────────────────────────────────────────────────

# ── DATABASE CREDENTIALS ─────────────────────────────────────────────────────
# One secret per database, storing the full connection string.
# ECS tasks reference these by ARN in their task definitions.

resource "aws_secretsmanager_secret" "db_credentials" {
  for_each = toset(var.db_names)

  name        = "${var.project}/${each.key}-db-credentials"
  description = "Database credentials for ${each.key} service"

  recovery_window_in_days = 0

  tags = {
    Name    = "${var.project}/${each.key}-db-credentials"
    Service = each.key
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  for_each = toset(var.db_names)

  secret_id     = aws_secretsmanager_secret.db_credentials[each.key].id
  secret_string = var.db_connection_strings[each.key]
}

# ── JWT SECRET ───────────────────────────────────────────────────────────────
# Used by Auth, Item, and Admin services to sign/verify JWT tokens.
# Locally this is JWT_SECRET in .env — same value shared across services.

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project}/jwt-secret"
  description             = "JWT signing secret for Auth, Item, Admin services"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.project}/jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# ── OPENSEARCH CREDENTIALS ───────────────────────────────────────────────────
# Master user credentials for the OpenSearch domain.
# Locally OpenSearch has DISABLE_SECURITY_PLUGIN=true — no auth needed.

resource "aws_secretsmanager_secret" "opensearch_credentials" {
  name                    = "${var.project}/opensearch-credentials"
  description             = "OpenSearch admin credentials for Search Service"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.project}/opensearch-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "opensearch_credentials" {
  secret_id = aws_secretsmanager_secret.opensearch_credentials.id
  secret_string = jsonencode({
    username = "admin"
    password = var.opensearch_master_password
  })
}
