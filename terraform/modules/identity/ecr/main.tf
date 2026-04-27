# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ECR Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: "docker build" creates images stored on your machine.
# No registry, no scanning, no lifecycle management.
#
# SA EXAM NOTE:
#   - Image scanning on push: catches CVEs before they reach production
#   - Lifecycle policies: auto-clean old images (prevent cost creep)
#   - ECS execution role has ecr:GetAuthorizationToken + ecr:BatchGetImage
#     to pull images without manual docker login
# ─────────────────────────────────────────────────────────────────────────────

locals {
  services = ["gateway", "auth", "item", "search", "image", "admin", "matching", "notification"]
}

resource "aws_ecr_repository" "services" {
  for_each = toset(local.services)

  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name    = "${var.project}/${each.key}"
    Service = each.key
  }
}

# Lifecycle policy — keep last 10 tagged images, expire untagged after 1 day
resource "aws_ecr_lifecycle_policy" "services" {
  for_each = toset(local.services)

  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep only last 10 tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v"]
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
