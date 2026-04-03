# PDF AI Summarizer - Local Deployment Script
# Compatible with AWS Academy LabRole
# Usage: ./deploy.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROJECT_NAME="pdf-summarizer"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  PDF AI Summarizer - AWS Deploy${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
echo -e "\n${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Terraform not found! Please install Terraform first.${NC}"
    echo "Download: https://www.terraform.io/downloads"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found! Please install AWS CLI first.${NC}"
    echo "Download: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured!${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}All prerequisites met!${NC}"

# Show current identity
echo -e "\n${YELLOW}AWS Identity:${NC}"
aws sts get-caller-identity

# Set environment variables
echo -e "\n${YELLOW}[2/6] Setting environment...${NC}"

export TF_VAR_aws_region=$AWS_REGION
export TF_VAR_project_name=$PROJECT_NAME
export TF_VAR_environment="${ENVIRONMENT:-dev}"

# Get environment variables from user
read -p "Enter GEMINI_API_KEY: " GEMINI_API_KEY
export TF_VAR_gemini_api_key=$GEMINI_API_KEY

# Terraform setup
echo -e "\n${YELLOW}[3/6] Initializing Terraform...${NC}"

cd terraform
terraform init

# Terraform plan
echo -e "\n${YELLOW}[4/6] Running Terraform Plan...${NC}"
terraform plan -out=tfplan

# Confirm before apply
echo -e "\n${YELLOW}[5/6] Ready to apply changes${NC}"
read -p "Do you want to apply these changes? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

# Terraform apply
echo -e "\n${YELLOW}[6/6] Applying Terraform...${NC}"
terraform apply -auto-approve tfplan

# Get outputs
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Important Outputs:${NC}"
terraform output

# Get ECR URLs
echo -e "\n${YELLOW}ECR Repository URLs:${NC}"
ECR_FRONTEND=$(terraform output -raw ecr_frontend_url 2>/dev/null || echo "")
ECR_BACKEND=$(terraform output -raw ecr_backend_url 2>/dev/null || echo "")
ECR_AI=$(terraform output -raw ecr_ai_service_url 2>/dev/null || echo "")

echo "Frontend: $ECR_FRONTEND"
echo "Backend: $ECR_BACKEND"
echo "AI Service: $ECR_AI"

# Build and push images
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Building Docker Images${NC}"
echo -e "${YELLOW}========================================${NC}"

# Login to ECR
echo -e "\n${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_FRONTEND

# Build and push Frontend
if [ -n "$ECR_FRONTEND" ]; then
    echo -e "\n${YELLOW}Building Frontend...${NC}"
    docker build -t pdf-summarizer-frontend:latest ./frontend
    docker tag pdf-summarizer-frontend:latest $ECR_FRONTEND:latest
    docker push $ECR_FRONTEND:latest
    echo -e "${GREEN}Frontend pushed!${NC}"
fi

# Build and push Backend
if [ -n "$ECR_BACKEND" ]; then
    echo -e "\n${YELLOW}Building Backend...${NC}"
    docker build -t pdf-summarizer-backend:latest ./backend
    docker tag pdf-summarizer-backend:latest $ECR_BACKEND:latest
    docker push $ECR_BACKEND:latest
    echo -e "${GREEN}Backend pushed!${NC}"
fi

# Build and push AI Service
if [ -n "$ECR_AI" ]; then
    echo -e "\n${YELLOW}Building AI Service...${NC}"
    docker build -t pdf-summarizer-ai-service:latest ./ai-service
    docker tag pdf-summarizer-ai-service:latest $ECR_AI:latest
    docker push $ECR_AI:latest
    echo -e "${GREEN}AI Service pushed!${NC}"
fi

# Update ECS services
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Updating ECS Services${NC}"
echo -e "${YELLOW}========================================${NC}"

CLUSTER_NAME="$PROJECT_NAME-cluster"

for service in frontend backend ai_service; do
    SERVICE_NAME="$PROJECT_NAME-$service-service"
    echo -e "\nUpdating $SERVICE_NAME..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --force-new-deployment \
        --region $AWS_REGION 2>/dev/null || echo "Service $SERVICE_NAME not found or update failed"
done

# Wait for services
echo -e "\n${YELLOW}Waiting for services to stabilize...${NC}"
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services "$PROJECT_NAME-frontend-service" "$PROJECT_NAME-backend-service" "$PROJECT_NAME-ai_service" \
    --region $AWS_REGION 2>/dev/null || echo "Wait completed or timed out"

# Final output
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"

CLOUDFRONT_URL=$(terraform output -raw cloudfront_distribution_url 2>/dev/null || echo "")
ALB_URL=$(terraform output -raw alb_url 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_URL" ]; then
    echo -e "\n${GREEN}Application URL: $CLOUDFRONT_URL${NC}"
elif [ -n "$ALB_URL" ]; then
    echo -e "\n${GREEN}Application URL: $ALB_URL${NC}"
fi

echo -e "\n${YELLOW}Check ECS services:${NC}"
echo "aws ecs describe-services --cluster $CLUSTER_NAME --services $PROJECT_NAME-frontend-service $PROJECT_NAME-backend-service $PROJECT_NAME-ai_service --region $AWS_REGION"

echo -e "\n${YELLOW}Check CloudWatch logs:${NC}"
echo "aws logs tail /ecs/$PROJECT_NAME/backend --follow --region $AWS_REGION"

cd ..

echo -e "\n${GREEN}Done!${NC}"
