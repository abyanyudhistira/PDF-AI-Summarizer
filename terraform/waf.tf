# WAF Web ACL
# Only for production environment
resource "aws_wafv2_web_acl" "main" {
  count       = var.environment == "prod" ? 1 : 0
  name        = "${var.project_name}-waf"
  description = "WAF for PDF Summarizer application"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      count {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 2

    override_action {
      count {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {
        custom_response {
          response_code            = 429
          custom_response_body_key = "rateLimitBody"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  custom_response_body {
    key          = "rateLimitBody"
    content_type = "APPLICATION_JSON"
    content = jsonencode({
      error   = "Too Many Requests"
      message = "Rate limit exceeded. Please try again later."
    })
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WAFMetric"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${var.project_name}-waf"
  }
}

# WAF Association with ALB (only for prod)
resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.environment == "prod" ? 1 : 0
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main[0].arn
}

# CloudWatch Metrics for WAF
resource "aws_cloudwatch_log_group" "waf_logs" {
  count             = var.environment == "prod" ? 1 : 0
  name              = "/aws/waf/${var.project_name}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-waf-logs"
  }
}
