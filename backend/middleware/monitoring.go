package middleware

import (
	"bytes"
	"io"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
)

// MonitoringMiddleware logs all requests to database
func MonitoringMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Start timer
		start := time.Now()

		// Read request body
		var requestBody string
		if c.Method() == "POST" || c.Method() == "PUT" {
			bodyBytes := c.Body()
			if len(bodyBytes) > 0 && len(bodyBytes) < 10000 { // Only log if < 10KB
				requestBody = string(bodyBytes)
			}
		}

		// Process request
		err := c.Next()

		// Calculate response time
		duration := time.Since(start)
		responseTime := float64(duration.Milliseconds())

		// Get response body (if available and small)
		var responseBody string
		if c.Response().StatusCode() < 300 {
			body := c.Response().Body()
			if len(body) > 0 && len(body) < 5000 { // Only log if < 5KB
				responseBody = string(body)
			}
		}

		// Get error message if any
		var errorMessage string
		if err != nil {
			errorMessage = err.Error()
		}

		// Create log entry
		log := models.RequestLog{
			Method:       c.Method(),
			Path:         c.Path(),
			StatusCode:   c.Response().StatusCode(),
			ResponseTime: responseTime,
			IPAddress:    c.IP(),
			UserAgent:    c.Get("User-Agent"),
			RequestBody:  requestBody,
			ResponseBody: responseBody,
			ErrorMessage: errorMessage,
		}

		// Save to database (async to not block response)
		go func() {
			database.DB.Create(&log)
		}()

		return err
	}
}

// ErrorLoggingMiddleware logs errors to database
func ErrorLoggingMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()

		if err != nil {
			// Log error to database
			errorLog := models.ErrorLog{
				ErrorType:    "API_ERROR",
				ErrorMessage: err.Error(),
				Endpoint:     c.Path(),
				Method:       c.Method(),
				IPAddress:    c.IP(),
			}

			go func() {
				database.DB.Create(&errorLog)
			}()
		}

		return err
	}
}

// ResponseBodyCapture middleware to capture response body
type bodyWriter struct {
	io.Writer
	body *bytes.Buffer
}

func (w bodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.Writer.Write(b)
}
