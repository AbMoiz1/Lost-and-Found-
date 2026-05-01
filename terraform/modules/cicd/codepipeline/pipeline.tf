# ─────────────────────────────────────────────────────────────────────────────
# CodePipeline — Orchestrates Source → Build → Deploy
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "codepipeline" {
  name = "${var.project}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project}-codepipeline-role" }
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "${var.project}-codepipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["codebuild:StartBuild", "codebuild:BatchGetBuilds"]
        Resource = [
          aws_codebuild_project.node_services.arn,
          aws_codebuild_project.python_services.arn,
          aws_codebuild_project.frontend.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["codestar-connections:UseConnection"]
        Resource = aws_codestarconnections_connection.github.arn
      }
    ]
  })
}

resource "aws_codepipeline" "main" {
  name     = "${var.project}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  # ── Stage 1: Source (GitHub) ───────────────────────────────────────────
  stage {
    name = "Source"

    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn        = aws_codestarconnections_connection.github.arn
        FullRepositoryId     = var.github_repo
        BranchName           = var.github_branch
        DetectChanges        = "true"
      }
    }
  }

  # ── Stage 2: Build + Deploy (all 3 CodeBuild projects in parallel) ────
  stage {
    name = "Build-Deploy"

    action {
      name            = "NodeServices"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]
      run_order       = 1

      configuration = {
        ProjectName = aws_codebuild_project.node_services.name
      }
    }

    action {
      name            = "PythonServices"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]
      run_order       = 1

      configuration = {
        ProjectName = aws_codebuild_project.python_services.name
      }
    }

    action {
      name            = "Frontend"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]
      run_order       = 1

      configuration = {
        ProjectName = aws_codebuild_project.frontend.name
      }
    }
  }

  tags = { Name = "${var.project}-pipeline" }
}

# Auto-trigger is handled by DetectChanges = true on the CodeStar source action above.
