# ─────────────────────────────────────────────────────────────────────────────
# OpenSearch Serverless — Replaces provisioned OpenSearch domain
# ─────────────────────────────────────────────────────────────────────────────
# No cluster management. Auto-scales compute and storage independently.
# Uses collections instead of domains.
# ─────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}

resource "aws_opensearchserverless_security_policy" "encryption" {
  name = "${var.project}-encryption"
  type = "encryption"
  policy = jsonencode({
    Rules = [{
      ResourceType = "collection"
      Resource     = ["collection/${var.project}-items"]
    }]
    AWSOwnedKey = true
  })
}

resource "aws_opensearchserverless_security_policy" "network" {
  name = "${var.project}-network"
  type = "network"
  policy = jsonencode([{
    Rules = [{
      ResourceType = "collection"
      Resource     = ["collection/${var.project}-items"]
    }]
    AllowFromPublic = true
  }])
}

resource "aws_opensearchserverless_collection" "items" {
  name = "${var.project}-items"
  type = "SEARCH"

  depends_on = [
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network
  ]

  tags = { Name = "${var.project}-items" }
}

resource "aws_opensearchserverless_access_policy" "data" {
  name = "${var.project}-data-access"
  type = "data"
  policy = jsonencode([{
    Rules = [
      {
        ResourceType = "index"
        Resource     = ["index/${var.project}-items/*"]
        Permission   = ["aoss:CreateIndex", "aoss:UpdateIndex", "aoss:DescribeIndex", "aoss:ReadDocument", "aoss:WriteDocument"]
      },
      {
        ResourceType = "collection"
        Resource     = ["collection/${var.project}-items"]
        Permission   = ["aoss:CreateCollectionItems", "aoss:DescribeCollectionItems", "aoss:UpdateCollectionItems"]
      }
    ]
    Principal = [var.lambda_role_arn, "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
  }])
}
