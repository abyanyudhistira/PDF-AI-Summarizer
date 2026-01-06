package middleware

import (
	"encoding/json"
	"fmt"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/queue"
	"time"

	"github.com/gofiber/fiber/v2"
)

// AuditMiddleware logs all requests
func AuditMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Calculate duration
		duration := time.Since(start).Milliseconds()

		// Determine status
		status := "success"
		if err != nil || c.Response().StatusCode() >= 400 {
			status = "failed"
		}

		// Build action
		action := fmt.Sprintf("%s %s", c.Method(), c.Path())

		// Build resource (extract from path if possible)
		resource := extractResource(c)

		// Build details
		details := buildDetails(c)

		// Create audit log
		auditLog := models.AuditLog{
			Timestamp: start,
			Action:    action,
			Resource:  resource,
			Details:   details,
			IPAddress: c.IP(),
			Status:    status,
			Duration:  duration,
		}

		// Publish to RabbitMQ (async, non-blocking)
		go queue.PublishAudit(auditLog)

		return err
	}
}

// extractResource extracts resource identifier from path
func extractResource(c *fiber.Ctx) string {
	// Extract IDs from path
	if id := c.Params("id"); id != "" {
		return fmt.Sprintf("%s:%s", getResourceType(c.Path()), id)
	}
	if id := c.Params("jobId"); id != "" {
		return fmt.Sprintf("job:%s", id)
	}
	if id := c.Params("summaryId"); id != "" {
		return fmt.Sprintf("summary:%s", id)
	}
	return c.Path()
}

// getResourceType determines resource type from path
func getResourceType(path string) string {
	if contains(path, "/pdfs") {
		return "pdf"
	}
	if contains(path, "/jobs") {
		return "job"
	}
	if contains(path, "/summaries") {
		return "summary"
	}
	return "unknown"
}

// buildDetails builds JSON details from request
func buildDetails(c *fiber.Ctx) string {
	details := make(map[string]interface{})

	// Add query params if any
	if len(c.Queries()) > 0 {
		details["query"] = c.Queries()
	}

	// Add file info for uploads
	if c.Method() == "POST" && contains(c.Path(), "/upload") {
		if file, err := c.FormFile("file"); err == nil {
			details["filename"] = file.Filename
			details["file_size"] = file.Size
		}
	}

	// Add body for POST/PUT (limit size)
	if c.Method() == "POST" || c.Method() == "PUT" {
		if len(c.Body()) > 0 && len(c.Body()) < 1000 {
			var body map[string]interface{}
			if err := json.Unmarshal(c.Body(), &body); err == nil {
				// Remove sensitive fields
				delete(body, "password")
				delete(body, "token")
				details["body"] = body
			}
		}
	}

	// Convert to JSON string
	if len(details) > 0 {
		if jsonStr, err := json.Marshal(details); err == nil {
			return string(jsonStr)
		}
	}

	return "{}"
}

// contains checks if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsMiddle(s, substr)))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
