# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Remote State Backend
# ─────────────────────────────────────────────────────────────────────────────
# SA EXAM NOTE: This is the "chicken and egg" problem of Terraform.
# You need the S3 bucket and DynamoDB table to EXIST before you can use them
# as a backend. So the workflow is:
#
#   1. First run: comment out this block, run "terraform apply" to create
#      the S3 bucket and DynamoDB table (state stored locally)
#   2. Then uncomment this block and run "terraform init" — Terraform will
#      ask "do you want to migrate local state to S3?" → say yes
#   3. From now on, state lives in S3 with locking via DynamoDB
#
# IMPORTANT: Values here cannot use variables — they must be hardcoded
# or passed via -backend-config flags during "terraform init".
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  backend "s3" {
    bucket         = "moiz-lost-and-found-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "moiz-lost-and-found-terraform-locks"
    encrypt        = true
  }
}
