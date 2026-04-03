@echo off
setlocal enabledelayedexpansion

REM PDF AI Summarizer - AWS Deployment Script for Windows
REM Usage: deploy.bat [options]
REM Options:
REM   --skip-infra    Skip infrastructure creation (only deploy containers)
REM   --force         Force recreate resources
REM   --skip-build    Skip Docker build (only update ECS)

set PROJECT_NAME=pdfsummarizer2
set AWS_REGION=us-east-1
set ENVIRONMENT=dev
set SKIP_INFRA=false
set FORCE_RECREATE=false
set SKIP_BUILD=false

REM Parse arguments
:parse_args
if "%~1"=="" goto end_parse
if /i "%~1"=="--skip-infra" set SKIP_INFRA=true & shift & goto parse_args
if /i "%~1"=="--force" set FORCE_RECREATE=true & shift & goto parse_args
if /i "%~1"=="--skip-build" set SKIP_BUILD=true & shift & goto parse_args
echo Unknown option: %~1
echo Usage: deploy.bat [--skip-infra] [--force] [--skip-build]
exit /b 1
:end_parse

echo ========================================
echo   PDF AI Summarizer - AWS Deploy
echo ========================================
echo.

REM Check prerequisites
echo [1/7] Checking prerequisites...

where terraform >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Terraform not found! Please install Terraform first.
    echo Download: https://www.terraform.io/downloads
    pause
    exit /b 1
)

where aws >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not found! Please install AWS CLI first.
    echo Download: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

REM Check Docker
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker not found! Please install Docker first.
    echo Download: https://docker.com
    pause
    exit /b 1
)

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS credentials not configured!
    echo Run: aws configure
    pause
    exit /b 1
)

echo All prerequisites met!
echo.

REM Show current identity
echo AWS Identity:
aws sts get-caller-identity
echo.

REM Check existing resources
echo [2/7] Checking existing resources...
echo.

set EXISTING_CLUSTER=
for /f "delims=" %%i in ('aws ecs describe-clusters --clusters %PROJECT_NAME%-cluster --query 'clusters[0].clusterName' --output text 2^>nul') do set EXISTING_CLUSTER=%%i

if not "!EXISTING_CLUSTER!"=="%PROJECT_NAME%-cluster" (
    echo   - ECS Cluster: NOT FOUND (will be created)
) else (
    echo   - ECS Cluster: EXISTS (will be updated)
)

set EXISTING_ECR_FRONTEND=
for /f "delims=" %%i in ('aws ecr describe-repositories --repository-names %PROJECT_NAME%-frontend --query 'repositories[0].repositoryName' --output text 2^>nul') do set EXISTING_ECR_FRONTEND=%%i

if not "!EXISTING_ECR_FRONTEND!"=="" (
    echo   - ECR Frontend: EXISTS (will be updated)
) else (
    echo   - ECR Frontend: NOT FOUND (will be created)
)

set EXISTING_RDS=
for /f "delims=" %%i in ('aws rds describe-db-instances --db-instance-identifier %PROJECT_NAME%-db --query 'DBInstances[0].DBInstanceIdentifier' --output text 2^>nul') do set EXISTING_RDS=%%i

if not "!EXISTING_RDS!"=="" (
    echo   - RDS Database: EXISTS (will be updated)
) else (
    echo   - RDS Database: NOT FOUND (will be created)
)

set EXISTING_S3=
for /f "delims=" %%i in ('aws s3api head-bucket --bucket %PROJECT_NAME%-pdf-files-%ENVIRONMENT% 2^>nul ^&^& echo EXISTS') do set EXISTING_S3=%%i

if "!EXISTING_S3!"=="EXISTS" (
    echo   - S3 Bucket: EXISTS (will be updated)
) else (
    echo   - S3 Bucket: NOT FOUND (will be created)
)

set EXISTING_SQS=
for /f "delims=" %%i in ('aws sqs get-queue-url --queue-name %PROJECT_NAME%-pdf-jobs-%ENVIRONMENT% --query 'QueueUrl' --output text 2^>nul') do set EXISTING_SQS=%%i

if "!EXISTING_SQS!"=="" (
    echo   - SQS Queue: NOT FOUND (will be created)
) else (
    echo   - SQS Queue: EXISTS (will be updated)
)

echo.

REM Terraform setup
echo [3/7] Initializing Terraform...
cd terraform
call terraform init -upgrade
if %errorlevel% neq 0 (
    echo ERROR: Terraform init failed!
    cd ..
    pause
    exit /b 1
)

REM Set environment variables for Terraform
set TF_VAR_aws_region=%AWS_REGION%
set TF_VAR_project_name=%PROJECT_NAME%
set TF_VAR_environment=%ENVIRONMENT%

REM Get secrets from user if not provided via env
if "%GEMINI_API_KEY%"=="" (
    set /p GEMINI_API_KEY="Enter GEMINI_API_KEY (press Enter to skip/update later): "
)
if "%DB_PASSWORD%"=="" (
    set /p DB_PASSWORD="Enter DB_PASSWORD (press Enter to skip/update later): "
)

if not "%GEMINI_API_KEY%"=="" (
    set TF_VAR_gemini_api_key=%GEMINI_API_KEY%
)
if not "%DB_PASSWORD%"=="" (
    set TF_VAR_db_password=%DB_PASSWORD%
)

REM Import existing resources to Terraform state if they exist
echo.
echo [4/7] Importing existing resources to Terraform state...

if "!EXISTING_CLUSTER!"=="%PROJECT_NAME%-cluster" (
    echo   Importing ECS Cluster...
    call terraform import -var "aws_region=%AWS_REGION%" -var "project_name=%PROJECT_NAME%" -var "environment=%ENVIRONMENT%" aws_ecs_cluster.main %PROJECT_NAME%-cluster 2>nul
)

if "!EXISTING_ECR_FRONTEND!"=="" (
    echo   ECR repos not found, Terraform will create them
)

REM Terraform plan
echo.
echo [5/7] Running Terraform Plan...
call terraform plan -out=tfplan -var "aws_region=%AWS_REGION%" -var "project_name=%PROJECT_NAME%" -var "environment=%ENVIRONMENT%" -var "gemini_api_key=%GEMINI_API_KEY%" -var "db_password=%DB_PASSWORD%"
if %errorlevel% neq 0 (
    echo ERROR: Terraform plan failed!
    cd ..
    pause
    exit /b 1
)

REM Confirm before apply (unless skip-infra)
if "%SKIP_INFRA%"=="true" goto :skip_terraform_apply
echo.
echo [6/7] Ready to apply changes
set /p confirm="Do you want to apply these changes? (yes/no/skip): "
if /i "!confirm!"=="skip" (
    echo Skipping infrastructure changes...
    goto :skip_terraform_apply
)
if /i not "!confirm!"=="yes" (
    echo Deployment cancelled.
    cd ..
    pause
    exit /b 0
)

REM Terraform apply
echo.
echo Applying Terraform...
call terraform apply -auto-approve tfplan
if %errorlevel% neq 0 (
    echo ERROR: Terraform apply failed!
    cd ..
    pause
    exit /b 1
)

:skip_terraform_apply

REM Get outputs
echo.
echo ========================================
echo   Infrastructure Status
echo ========================================
echo.

REM Get ECR URLs
for /f "delims=" %%i in ('terraform output -raw ecr_frontend_url 2^>nul') do set "ECR_FRONTEND=%%i"
for /f "delims=" %%i in ('terraform output -raw ecr_backend_url 2^>nul') do set "ECR_BACKEND=%%i"
for /f "delims=" %%i in ('terraform output -raw ecr_ai_service_url 2^>nul') do set "ECR_AI=%%i"
for /f "delims=" %%i in ('terraform output -raw alb_url 2^>nul') do set "ALB_URL=%%i"
for /f "delims=" %%i in ('terraform output -raw ecs_cluster_name 2^>nul') do set "CLUSTER_NAME=%%i"

echo   Frontend ECR: !ECR_FRONTEND!
echo   Backend ECR: !ECR_BACKEND!
echo   AI Service ECR: !ECR_AI!
echo   Application URL: !ALB_URL!
echo   ECS Cluster: !CLUSTER_NAME!
echo.

REM Update secrets if provided
if not "%GEMINI_API_KEY%"=="" (
    echo Updating GEMINI_API_KEY secret...
    aws secretsmanager put-secret-value --secret-id %PROJECT_NAME%/gemini-api-key --secret-string "%GEMINI_API_KEY%" 2>nul
)
if not "%DB_PASSWORD%"=="" (
    echo Updating DB credentials secret...
    aws secretsmanager put-secret-value --secret-id %PROJECT_NAME%/db-credentials --secret-string "{\"username\":\"postgres\",\"password\":\"%DB_PASSWORD%\"}" 2>nul
)

cd ..

REM Build and push Docker images
if "%SKIP_BUILD%"=="true" goto :skip_docker_build

echo [7/7] Building and pushing Docker images...
echo.

REM Login to ECR
call aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin !ECR_FRONTEND! 2>nul
if %errorlevel% neq 0 (
    echo WARNING: ECR login failed, images may not exist yet
)

REM Build and push Frontend
if not "!ECR_FRONTEND!"=="" (
    echo Building and pushing Frontend...
    docker build -t %PROJECT_NAME%-frontend:latest .\frontend 2>nul
    if %errorlevel% equ 0 (
        docker tag %PROJECT_NAME%-frontend:latest !ECR_FRONTEND!:latest 2>nul
        docker push !ECR_FRONTEND!:latest 2>nul
        echo   Frontend pushed!
    ) else (
        echo   Frontend build failed, skipping...
    )
)

REM Build and push Backend
if not "!ECR_BACKEND!"=="" (
    echo Building and pushing Backend...
    docker build -t %PROJECT_NAME%-backend:latest .\backend 2>nul
    if %errorlevel% equ 0 (
        docker tag %PROJECT_NAME%-backend:latest !ECR_BACKEND!:latest 2>nul
        docker push !ECR_BACKEND!:latest 2>nul
        echo   Backend pushed!
    ) else (
        echo   Backend build failed, skipping...
    )
)

REM Build and push AI Service
if not "!ECR_AI!"=="" (
    echo Building and pushing AI Service...
    docker build -t %PROJECT_NAME%-ai-service:latest .\ai-service 2>nul
    if %errorlevel% equ 0 (
        docker tag %PROJECT_NAME%-ai-service:latest !ECR_AI!:latest 2>nul
        docker push !ECR_AI!:latest 2>nul
        echo   AI Service pushed!
    ) else (
        echo   AI Service build failed, skipping...
    )
)

:skip_docker_build

REM Update ECS services
echo.
echo ========================================
echo   Updating ECS Services...
echo ========================================

echo Updating services in cluster: !CLUSTER_NAME!

call aws ecs update-service --cluster !CLUSTER_NAME! --service %PROJECT_NAME%-frontend-service --force-new-deployment --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo   - Frontend service updated
) else (
    echo   - Frontend service not found or update failed
)

call aws ecs update-service --cluster !CLUSTER_NAME! --service %PROJECT_NAME%-backend-service --force-new-deployment --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo   - Backend service updated
) else (
    echo   - Backend service not found or update failed
)

call aws ecs update-service --cluster !CLUSTER_NAME! --service %PROJECT_NAME%-ai-service --force-new-deployment --region %AWS_REGION% 2>nul
if %errorlevel% equ 0 (
    echo   - AI Service updated
) else (
    echo   - AI Service not found or update failed
)

REM Get final outputs
echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Application URL: !ALB_URL!
echo.
echo ECS Cluster: !CLUSTER_NAME!
echo.
echo Useful commands:
echo   Check service status:
echo     aws ecs describe-services --cluster !CLUSTER_NAME! --services %PROJECT_NAME%-frontend-service %PROJECT_NAME%-backend-service %PROJECT_NAME%-ai-service --region %AWS_REGION%
echo.
echo   Check logs:
echo     aws logs tail /ecs/%PROJECT_NAME%/backend --follow --region %AWS_REGION%
echo.
echo Done!
pause
