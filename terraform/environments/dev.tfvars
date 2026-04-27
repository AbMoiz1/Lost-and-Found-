# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Dev Environment
# ─────────────────────────────────────────────────────────────────────────────
# Usage: terraform plan -var-file="environments/dev.tfvars"
# ─────────────────────────────────────────────────────────────────────────────

project        = "moiz-lost-and-found"
environment    = "dev"
primary_region = "us-east-1"
dr_region      = "us-west-2"
vpc_cidr       = "10.0.0.0/16"
domain_name    = ""
