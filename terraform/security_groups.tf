# Security Groups - Firewall Rules

# Security Group untuk Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group untuk Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.project_name}-alb-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Security Group untuk ECS Tasks (Frontend, Backend, AI Service)
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-ecs-tasks-sg"
  description = "Security group untuk ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic from ALB"
  }

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
    description = "Allow internal communication"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.project_name}-ecs-tasks-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Security Group untuk RDS Database
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group untuk RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "Allow PostgreSQL from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.project_name}-rds-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}
