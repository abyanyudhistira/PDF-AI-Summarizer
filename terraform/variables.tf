# Variables untuk Infrastructure Automation

variable "aws_region" {
  description = "AWS Region untuk deployment"
  type        = string
  default     = "ap-southeast-1" # Singapore - paling dekat
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "pdf-summarizer"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block untuk VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro" # Free tier eligible
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "pdf_summarizer"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# ECS Configuration
variable "backend_cpu" {
  description = "CPU units untuk backend task"
  type        = number
  default     = 256 # 0.25 vCPU
}

variable "backend_memory" {
  description = "Memory untuk backend task (MB)"
  type        = number
  default     = 512
}

variable "ai_service_cpu" {
  description = "CPU units untuk AI service task"
  type        = number
  default     = 512 # 0.5 vCPU
}

variable "ai_service_memory" {
  description = "Memory untuk AI service task (MB)"
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "CPU units untuk frontend task"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory untuk frontend task (MB)"
  type        = number
  default     = 512
}

# Auto Scaling Configuration
variable "backend_min_tasks" {
  description = "Minimum number of backend tasks"
  type        = number
  default     = 1
}

variable "backend_max_tasks" {
  description = "Maximum number of backend tasks"
  type        = number
  default     = 4
}

variable "ai_service_min_tasks" {
  description = "Minimum number of AI service tasks"
  type        = number
  default     = 1
}

variable "ai_service_max_tasks" {
  description = "Maximum number of AI service tasks"
  type        = number
  default     = 3
}

# Secrets
variable "gemini_api_key" {
  description = "Google Gemini API Key"
  type        = string
  sensitive   = true
}
