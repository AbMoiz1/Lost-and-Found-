
resource "aws_ecs_service" "gateway" {
  name            = "${var.project}-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gateway.arn
  desired_count   = 1
  health_check_grace_period_seconds = 120

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = var.gateway_target_group_arn
    container_name   = "gateway"
    container_port   = 8080
  }

  tags = { Name = "${var.project}-gateway-service" }
}

# â”€â”€ AUTH (registered with Internal ALB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
resource "aws_ecs_service" "auth" {
  name            = "${var.project}-auth"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.auth.arn
  desired_count   = 1
  health_check_grace_period_seconds = 120

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = var.auth_target_group_arn
    container_name   = "auth"
    container_port   = 4001
  }

  tags = { Name = "${var.project}-auth-service" }
}

# â”€â”€ ITEM (registered with Internal ALB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
resource "aws_ecs_service" "item" {
  name            = "${var.project}-item"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.item.arn
  desired_count   = 1
  health_check_grace_period_seconds = 120

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = var.item_target_group_arn
    container_name   = "item"
    container_port   = 4002
  }

  tags = { Name = "${var.project}-item-service" }
}

# â”€â”€ SEARCH (registered with Internal ALB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
resource "aws_ecs_service" "search" {
  name            = "${var.project}-search"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.search.arn
  desired_count   = 1
  health_check_grace_period_seconds = 120

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = var.search_target_group_arn
    container_name   = "search"
    container_port   = 4003
  }

  tags = { Name = "${var.project}-search-service" }
}

# â”€â”€ IMAGE (registered with Internal ALB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
resource "aws_ecs_service" "image_svc" {
  name            = "${var.project}-image"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.image_svc.arn
  desired_count   = 1
  health_check_grace_period_seconds = 120

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = var.image_target_group_arn
    container_name   = "image"
    container_port   = 4004
  }

  tags = { Name = "${var.project}-image-service" }
}

# â”€â”€ ADMIN (registered with Internal ALB) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
resource "aws_ecs_service" "admin" {
  name            = "${var.project}-admin"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.admin.arn
  desired_count   = 1
  health_check_grace_period_seconds = 120

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = var.admin_target_group_arn
    container_name   = "admin"
    container_port   = 4005
  }

  tags = { Name = "${var.project}-admin-service" }
}

# â”€â”€ WORKERS (no ALB â€” they poll SQS queues) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

resource "aws_ecs_service" "matching" {
  name            = "${var.project}-matching"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.matching.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  tags = { Name = "${var.project}-matching-service" }
}

resource "aws_ecs_service" "notification" {
  name            = "${var.project}-notification"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.notification.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }

  tags = { Name = "${var.project}-notification-service" }
}

