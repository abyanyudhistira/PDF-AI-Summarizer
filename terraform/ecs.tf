# ECS - Elastic Container Service
# Container orchestration untuk Frontend, Backend, AI Service

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project_name}-cluster"
    Project     = var.project_name
    Environment = var.environment
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}/frontend"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-frontend-logs"
    Project     = var.project_name
    Environment = var.environment
    Service     = "frontend"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}/backend"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-backend-logs"
    Project     = var.project_name
    Environment = var.environment
    Service     = "backend"
  }
}

resource "aws_cloudwatch_log_group" "ai_service" {
  name              = "/ecs/${var.project_name}/ai-service"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-ai-service-logs"
    Project     = var.project_name
    Environment = var.environment
    Service     = "ai-service"
  }
}

# ECS Task Definition - Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${aws_ecr_repository.frontend.repository_url}:latest"

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NEXT_PUBLIC_API_URL"
          value = "http://${aws_lb.main.dns_name}/api"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${var.project_name}-frontend-task"
    Project     = var.project_name
    Environment = var.environment
    Service     = "frontend"
  }
}

# ECS Task Definition - Backend
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${aws_ecr_repository.backend.repository_url}:latest"

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "PORT"
          value = "8080"
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.postgres.address
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.postgres.port)
        },
        {
          name  = "DB_NAME"
          value = var.db_name
        },
        {
          name  = "DB_SSLMODE"
          value = "require"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.pdf_files.id
        },
        {
          name  = "SQS_QUEUE_URL"
          value = aws_sqs_queue.pdf_jobs.url
        },
        {
          name  = "AI_SERVICE_URL"
          value = "http://${aws_lb.main.dns_name}/ai"
        }
      ]

      secrets = [
        {
          name      = "DB_USER"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:password::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${var.project_name}-backend-task"
    Project     = var.project_name
    Environment = var.environment
    Service     = "backend"
  }
}

# ECS Task Definition - AI Service
resource "aws_ecs_task_definition" "ai_service" {
  family                   = "${var.project_name}-ai-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ai_service_cpu
  memory                   = var.ai_service_memory
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name  = "ai-service"
      image = "${aws_ecr_repository.ai_service.repository_url}:latest"

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      secrets = [
        {
          name      = "GEMINI_API_KEY"
          valueFrom = aws_secretsmanager_secret.gemini_api_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ai_service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${var.project_name}-ai-service-task"
    Project     = var.project_name
    Environment = var.environment
    Service     = "ai-service"
  }
}
# Backend akan akses AI Service via Load Balancer internal URL


# ECS Service - Frontend
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name        = "${var.project_name}-frontend-service"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ECS Service - Backend
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name        = "${var.project_name}-backend-service"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ECS Service - AI Service
resource "aws_ecs_service" "ai_service" {
  name            = "${var.project_name}-ai-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ai_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  tags = {
    Name        = "${var.project_name}-ai-service"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
