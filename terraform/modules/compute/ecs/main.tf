# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ECS on EC2 Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: "docker-compose up" starts all containers on one machine.
# ECS distributes containers across EC2 instances in multiple AZs.
#
# SA EXAM NOTE:
#   - ECS on EC2 vs Fargate: EC2 gives control over instance types (cost
#     optimization with Reserved/Spot). Fargate is simpler but ~20-30% more
#     expensive for sustained workloads.
#   - Task Definition = docker-compose service config (image, CPU, memory,
#     env vars, secrets, ports, health checks)
#   - Service = ensures N copies of a task are always running
#   - ASG = manages the EC2 instances that run ECS tasks
# ─────────────────────────────────────────────────────────────────────────────

# Get latest ECS-optimized AMI
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id"
}

# ── ECS CLUSTER ──────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${var.project}-cluster" }
}

# ── LAUNCH TEMPLATE (EC2 instance config) ────────────────────────────────────
resource "aws_launch_template" "ecs" {
  name_prefix   = "${var.project}-ecs-"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = var.instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.ecs_instance.arn
  }

  vpc_security_group_ids = [var.ecs_sg_id]

  # Tell the ECS agent which cluster to join
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project}-ecs-instance"
    }
  }
}

# EC2 instance profile + role (for the EC2 instances themselves)
resource "aws_iam_role" "ecs_instance" {
  name = "${var.project}-ecs-instance-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = { Name = "${var.project}-ecs-instance-role" }
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ecs_instance" {
  name = "${var.project}-ecs-instance-profile"
  role = aws_iam_role.ecs_instance.name
}

# ── AUTO SCALING GROUP ───────────────────────────────────────────────────────
resource "aws_autoscaling_group" "ecs" {
  name                = "${var.project}-ecs-asg"
  min_size            = var.asg_min
  max_size            = var.asg_max
  desired_capacity    = var.asg_desired
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project}-ecs-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }
}

# Capacity provider — links ASG to ECS cluster
resource "aws_ecs_capacity_provider" "main" {
  name = "${var.project}-capacity-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.ecs.arn

    managed_scaling {
      status          = "ENABLED"
      target_capacity = 80
    }
  }

  tags = { Name = "${var.project}-capacity-provider" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.main.name]

  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 1
  }
}
