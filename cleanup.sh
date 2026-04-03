#!/bin/bash
# PDF AI Summarizer - AWS Cleanup Script
# Usage: ./cleanup.sh

set -e

AWS_REGION="us-east-1"
PROJECT_NAME="pdf-summarizer"

echo "========================================"
echo "  AWS Cleanup Script"
echo "========================================"
echo ""

echo "[1/6] Checking AWS credentials..."
aws sts get-caller-identity
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "Account ID: $ACCOUNT_ID"
echo ""

echo "[2/6] Deleting ECS Services and Cluster..."
# Delete ECS services
for svc in frontend-service backend-service ai_service; do
    echo "Deleting service $svc..."
    aws ecs update-service --cluster $PROJECT_NAME-cluster --service $PROJECT_NAME-$svc --desired-count 0 --region $AWS_REGION 2>/dev/null || true
    aws ecs delete-service --cluster $PROJECT_NAME-cluster --service $PROJECT_NAME-$svc --force --region $AWS_REGION 2>/dev/null || true
done

echo "Deleting ECS cluster..."
aws ecs delete-cluster --cluster $PROJECT_NAME-cluster --region $AWS_REGION 2>/dev/null || true
echo "Done."
echo ""

echo "[3/6] Deleting ECR Repositories..."
for repo in pdf-summarizer-frontend pdf-summarizer-backend pdf-summarizer-ai-service; do
    echo "Deleting ECR repository $repo..."
    aws ecr delete-repository --repository-name $repo --force --region $AWS_REGION 2>/dev/null || true
done
echo "Done."
echo ""

echo "[4/6] Deleting SQS Queues..."
for queue in pdf-summarizer-pdf-jobs-dev pdf-summarizer-pdf-jobs-dlq-dev pdf-summarizer-audit-logs-dev; do
    echo "Deleting SQS queue $queue..."
    aws sqs delete-queue --queue-url https://sqs.$AWS_REGION.amazonaws.com/$ACCOUNT_ID/$queue --region $AWS_REGION 2>/dev/null || true
done
echo "Done."
echo ""

echo "[5/6] Deleting Secrets..."
for secret in pdf-summarizer/gemini-api-key pdf-summarizer/db-credentials; do
    echo "Deleting secret $secret..."
    aws secretsmanager delete-secret --secret-id $secret --force-delete-without-recovery --region $AWS_REGION 2>/dev/null || true
done
echo "Done."
echo ""

echo "[6/6] Deleting SNS Topics..."
for topic in pdf-summarizer-alerts-dev pdf-summarizer-job-notifications-dev; do
    echo "Deleting SNS topic $topic..."
    aws sns delete-topic --topic-arn arn:aws:sns:$AWS_REGION:$ACCOUNT_ID:$topic --region $AWS_REGION 2>/dev/null || true
done
echo "Done."
echo ""

echo "========================================"
echo "  Deleting RDS Database..."
echo "========================================"
echo "Deleting RDS instance $PROJECT_NAME-db..."
aws rds delete-db-instance --db-instance-identifier $PROJECT_NAME-db --skip-final-snapshot --region $AWS_REGION 2>/dev/null || true
echo "Done."
echo ""

echo "========================================"
echo "  Deleting S3 Buckets..."
echo "========================================"
echo "Deleting S3 bucket $PROJECT_NAME-pdf-files-dev..."
aws s3 rb s3://$PROJECT_NAME-pdf-files-dev --force --region $AWS_REGION 2>/dev/null || true
echo "Done."
echo ""

echo "========================================"
echo "  Deleting CloudWatch Resources..."
echo "========================================"
for log in /ecs/$PROJECT_NAME/frontend /ecs/$PROJECT_NAME/backend /ecs/$PROJECT_NAME/ai-service; do
    echo "Deleting log group $log..."
    aws logs delete-log-group --log-group-name "$log" --region $AWS_REGION 2>/dev/null || true
done

echo "Deleting CloudWatch dashboard..."
aws cloudwatch delete-dashboards --dashboard-names $PROJECT_NAME-dashboard --region $AWS_REGION 2>/dev/null || true
echo "Done."
echo ""

echo "========================================"
echo "  Deleting Load Balancer..."
echo "========================================"
LB_ARN=$(aws elbv2 describe-load-balancers --names $PROJECT_NAME-alb --query "LoadBalancers[0].LoadBalancerArn" --output text --region $AWS_REGION 2>/dev/null || echo "")
if [ -n "$LB_ARN" ]; then
    echo "Deleting LB: $LB_ARN"
    aws elbv2 delete-load-balancer --load-balancer-arn $LB_ARN --region $AWS_REGION 2>/dev/null || true
fi
echo "Done."
echo ""

echo "========================================"
echo "  Cleanup Complete!"
echo "========================================"
echo ""
echo "NOTE: VPC and related resources may still exist."
echo "If VPC still exists, delete it manually from AWS Console."
echo ""
