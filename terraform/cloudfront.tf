# CloudFront Distribution
# Note: CloudFront requires Route53 which may not be available in LabRole
# For LabRole: Access app via ALB DNS directly

resource "aws_cloudfront_distribution" "main" {
  count = var.environment == "prod" ? 1 : 0

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2", "TLSv1.3"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "PDF Summarizer CDN"
  default_root_object = "/"

  default_cache_behavior {
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "alb-origin"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["*"]
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Output CloudFront URL only for production
output "cloudfront_url" {
  value       = length(aws_cloudfront_distribution.main) > 0 ? aws_cloudfront_distribution.main[0].domain_name : ""
  description = "CloudFront distribution domain (empty for dev)"
}
