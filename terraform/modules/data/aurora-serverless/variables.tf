variable "project" {
  type = string
}

variable "db_master_password" {
  type      = string
  sensitive = true
}
