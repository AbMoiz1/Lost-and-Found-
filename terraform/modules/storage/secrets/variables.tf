variable "project" { type = string }
variable "aurora_endpoint" { type = string }
variable "db_master_password" {
  type      = string
  sensitive = true
}
variable "opensearch_endpoint" { type = string }
