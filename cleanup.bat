@echo off
REM PDF AI Summarizer - AWS Cleanup Script (Simple Version)
REM Hapus semua resource yang bentrok
REM Usage: cleanup.bat

set AWS_REGION=us-east-1
set PROJECT_NAME=pdf-summarizer

echo ========================================
echo   AWS Cleanup Script
echo ========================================
echo.

REM Cek credentials
echo [1] Checking AWS credentials...
aws sts get-caller-identity
echo.

REM Get account ID
for /f "delims=" %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
echo Account ID: %ACCOUNT_ID%
echo.

REM ========================================
REM ECS
REM ========================================
echo [2] Deleting ECS Services...
echo Stopping services...
aws ecs update-service --cluster %PROJECT_NAME%-cluster --service %PROJECT_NAME%-frontend-service --desired-count 0 --region %AWS_REGION%
aws ecs update-service --cluster %PROJECT_NAME%-cluster --service %PROJECT_NAME%-backend-service --desired-count 0 --region %AWS_REGION%
aws ecs update-service --cluster %PROJECT_NAME%-cluster --service %PROJECT_NAME%-ai_service --desired-count 0 --region %AWS_REGION%
echo Deleting services...
aws ecs delete-service --cluster %PROJECT_NAME%-cluster --service %PROJECT_NAME%-frontend-service --force --region %AWS_REGION%
aws ecs delete-service --cluster %PROJECT_NAME%-cluster --service %PROJECT_NAME%-backend-service --force --region %AWS_REGION%
aws ecs delete-service --cluster %PROJECT_NAME%-cluster --service %PROJECT_NAME%-ai_service --force --region %AWS_REGION%
echo Deleting cluster...
aws ecs delete-cluster --cluster %PROJECT_NAME%-cluster --region %AWS_REGION%
echo Done.
echo.

REM ========================================
REM ECR
REM ========================================
echo [3] Deleting ECR Repositories...
aws ecr delete-repository --repository-name pdf-summarizer-frontend --force --region %AWS_REGION%
aws ecr delete-repository --repository-name pdf-summarizer-backend --force --region %AWS_REGION%
aws ecr delete-repository --repository-name pdf-summarizer-ai-service --force --region %AWS_REGION%
echo Done.
echo.

REM ========================================
REM Load Balancer
REM ========================================
echo [4] Deleting Load Balancer...
for /f "delims=" %%i in ('aws elbv2 describe-load-balancers --names %PROJECT_NAME%-alb --query LoadBalancers[0].LoadBalancerArn --output text --region %AWS_REGION% 2^>nul') do (
    if not "%%i"=="" (
        echo Deleting ALB: %%i
        aws elbv2 delete-load-balancer --load-balancer-arn %%i --region %AWS_REGION%
    )
)
echo Done.
echo.

REM ========================================
REM Target Groups
REM ========================================
echo [5] Deleting Target Groups...
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:%AWS_REGION%:%ACCOUNT_ID%:targetgroup/%PROJECT_NAME%-frontend-tg --region %AWS_REGION% 2>nul
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:%AWS_REGION%:%ACCOUNT_ID%:targetgroup/%PROJECT_NAME%-backend-tg --region %AWS_REGION% 2>nul
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:%AWS_REGION%:%ACCOUNT_ID%:targetgroup/%PROJECT_NAME%-ai-service-tg --region %AWS_REGION% 2>nul
echo Done.
echo.

REM ========================================
REM RDS
REM ========================================
echo [6] Deleting RDS Database...
aws rds delete-db-instance --db-instance-identifier %PROJECT_NAME%-db --skip-final-snapshot --region %AWS_REGION% 2>nul
aws rds delete-db-subnet-group --db-subnet-group-name %PROJECT_NAME%-db-subnet-group --region %AWS_REGION% 2>nul
echo Done.
echo.

REM ========================================
REM SQS
REM ========================================
echo [7] Deleting SQS Queues...
aws sqs delete-queue --queue-url https://sqs.%AWS_REGION%.amazonaws.com/%ACCOUNT_ID%/%PROJECT_NAME%-pdf-jobs-dev --region %AWS_REGION% 2>nul
aws sqs delete-queue --queue-url https://sqs.%AWS_REGION%.amazonaws.com/%ACCOUNT_ID%/%PROJECT_NAME%-pdf-jobs-dlq-dev --region %AWS_REGION% 2>nul
aws sqs delete-queue --queue-url https://sqs.%AWS_REGION%.amazonaws.com/%ACCOUNT_ID%/%PROJECT_NAME%-audit-logs-dev --region %AWS_REGION% 2>nul
echo Done.
echo.

REM ========================================
REM Secrets Manager
REM ========================================
echo [8] Deleting Secrets...
aws secretsmanager delete-secret --secret-id %PROJECT_NAME%/gemini-api-key --force-delete-without-recovery --region %AWS_REGION% 2>nul
aws secretsmanager delete-secret --secret-id %PROJECT_NAME%/db-credentials --force-delete-without-recovery --region %AWS_REGION% 2>nul
echo Done.
echo.

REM ========================================
REM SNS
REM ========================================
echo [9] Deleting SNS Topics...
aws sns delete-topic --topic-arn arn:aws:sns:%AWS_REGION%:%ACCOUNT_ID%:%PROJECT_NAME%-alerts-dev --region %AWS_REGION% 2>nul
aws sns delete-topic --topic-arn arn:aws:sns:%AWS_REGION%:%ACCOUNT_ID%:%PROJECT_NAME%-job-notifications-dev --region %AWS_REGION% 2>nul
echo Done.
echo.

REM ========================================
REM S3
REM ========================================
echo [10] Deleting S3 Bucket...
aws s3 rb s3://%PROJECT_NAME%-pdf-files-dev --force --region %AWS_REGION% 2>nul
echo Done.
echo.

REM ========================================
REM CloudWatch
REM ========================================
echo [11] Deleting CloudWatch...
aws logs delete-log-group --log-group-name /ecs/%PROJECT_NAME%/frontend --region %AWS_REGION% 2>nul
aws logs delete-log-group --log-group-name /ecs/%PROJECT_NAME%/backend --region %AWS_REGION% 2>nul
aws logs delete-log-group --log-group-name /ecs/%PROJECT_NAME%/ai-service --region %AWS_REGION% 2>nul
aws cloudwatch delete-dashboards --dashboard-names %PROJECT_NAME%-dashboard --region %AWS_REGION% 2>nul
echo Done.
echo.

REM ========================================
REM VPC
REM ========================================
echo [12] Deleting VPC...

REM Find VPC ID
for /f "delims=" %%v in ('aws ec2 describe-vpcs --filters Name=tag:Name,Values=%PROJECT_NAME%-vpc --query Vpcs[0].VpcId --output text --region %AWS_REGION% 2^>nul') do (
    set VPC_ID=%%v
)

if defined VPC_ID (
    echo Found VPC: %VPC_ID%
    
    REM Delete Internet Gateway
    for /f "delims=" %%g in ('aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=%VPC_ID% --query InternetGateways[0].InternetGatewayId --output text --region %AWS_REGION% 2^>nul') do (
        echo Detaching IGW: %%g
        aws ec2 detach-internet-gateway --internet-gateway-id %%g --vpc-id %VPC_ID% --region %AWS_REGION% 2>nul
        aws ec2 delete-internet-gateway --internet-gateway-id %%g --region %AWS_REGION% 2>nul
    )
    
    REM Delete Security Groups
    for /f "delims=" %%s in ('aws ec2 describe-security-groups --filters Name=vpc-id,Values=%VPC_ID% --query SecurityGroups[*].GroupId --output json --region %AWS_REGION% 2^>nul') do (
        echo Deleting SG: %%s
        aws ec2 delete-security-group --group-id %%s --region %AWS_REGION% 2>nul
    )
    
    REM Delete Subnets
    for /f "delims=" %%n in ('aws ec2 describe-subnets --filters Name=vpc-id,Values=%VPC_ID% --query Subnets[*].SubnetId --output json --region %AWS_REGION% 2^>nul') do (
        echo Deleting Subnet: %%n
        aws ec2 delete-subnet --subnet-id %%n --region %AWS_REGION% 2>nul
    )
    
    REM Delete Route Tables
    for /f "delims=" %%r in ('aws ec2 describe-route-tables --filters Name=vpc-id,Values=%VPC_ID% --query RouteTables[?Main==false].RouteTableId --output json --region %AWS_REGION% 2^>nul') do (
        echo Deleting Route Table: %%r
        aws ec2 delete-route-table --route-table-id %%r --region %AWS_REGION% 2>nul
    )
    
    REM Delete NAT Gateway
    for /f "delims=" %%n in ('aws ec2 describe-nat-gateways --filter Name=vpc-id,Values=%VPC_ID% --query NatGateways[?State!=^deleted^].NatGatewayId --output json --region %AWS_REGION% 2^>nul') do (
        echo Deleting NAT GW: %%n
        aws ec2 delete-nat-gateway --nat-gateway-id %%n --region %AWS_REGION% 2>nul
    )
    
    REM Delete VPC
    echo Deleting VPC: %VPC_ID%
    aws ec2 delete-vpc --vpc-id %VPC_ID% --region %AWS_REGION% 2>nul
) else (
    echo VPC not found or already deleted
)
echo Done.
echo.

REM ========================================
REM EIP
REM ========================================
echo [13] Releasing EIP...
aws ec2 describe-addresses --filters Name=tag:Name,Values=%PROJECT_NAME%* --query Addresses[*].AllocationId --output json --region %AWS_REGION% 2>nul
echo Done.
echo.

echo ========================================
echo   Cleanup Complete!
echo ========================================
echo.
pause
