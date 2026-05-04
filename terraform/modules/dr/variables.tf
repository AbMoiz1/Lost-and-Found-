variable "project" { type = string }
variable "aurora_global_cluster_id" { type = string }
variable "db_master_password" {
  type      = string
  sensitive = true
}
variable "jwt_secret" {
  type      = string
  sensitive = true
}
