# ─────────────────────────────────────────────────────────────────────────────
# CodeBuild Projects — one per build type
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_codebuild_project" "node_services" {
  name         = "${var.project}-node-services"
  description  = "Build and deploy Node.js Lambda services"
  service_role = aws_iam_role.codebuild.arn

  artifacts { type = "CODEPIPELINE" }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false

    environment_variable {
      name  = "PROJECT"
      value = var.project
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-node-services.yml"
  }

  tags = { Name = "${var.project}-node-services-build" }
}

resource "aws_codebuild_project" "python_services" {
  name         = "${var.project}-python-services"
  description  = "Build and deploy Python Lambda services"
  service_role = aws_iam_role.codebuild.arn

  artifacts { type = "CODEPIPELINE" }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false

    environment_variable {
      name  = "PROJECT"
      value = var.project
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-python-services.yml"
  }

  tags = { Name = "${var.project}-python-services-build" }
}

resource "aws_codebuild_project" "frontend" {
  name         = "${var.project}-frontend"
  description  = "Build and deploy React frontend to S3"
  service_role = aws_iam_role.codebuild.arn

  artifacts { type = "CODEPIPELINE" }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false

    environment_variable {
      name  = "PROJECT"
      value = var.project
    }
    environment_variable {
      name  = "FRONTEND_BUCKET"
      value = "${var.project}-frontend-${var.environment}"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec-frontend.yml"
  }

  tags = { Name = "${var.project}-frontend-build" }
}
