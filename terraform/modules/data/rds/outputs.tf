# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — RDS Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# These outputs are used by:
#   - ECS module (task definitions need DATABASE_URL)
#   - Secrets Manager module (stores credentials)
#   - IAM module (restricts access per service)
# ─────────────────────────────────────────────────────────────────────────────

output "db_endpoints" {
  description = "Map of database endpoints (service_name → endpoint:port)"
  value = {
    for key, db in aws_db_instance.databases :
    key => "${db.endpoint}"
  }
}

output "db_arns" {
  description = "Map of database ARNs (for IAM policies)"
  value = {
    for key, db in aws_db_instance.databases :
    key => db.arn
  }
}

output "db_connection_strings" {
  description = "Map of PostgreSQL connection strings (service_name → connection URL)"
  sensitive   = true
  value = {
    for key, db in aws_db_instance.databases :
    key => "postgresql://${local.databases[key].username}:${random_password.db_passwords[key].result}@${db.endpoint}/${local.databases[key].name}?sslmode=require"
  }
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}
