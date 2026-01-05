package main

import (
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/middleware"
	"pdf-summarizer-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Load configuration
	config.LoadConfig()

	// Ensure upload directory exists
	if err := utils.EnsureUploadDir(config.AppConfig.UploadDir); err != nil {
		log.Fatal("Failed to create upload directory:", err)
	}

	// Connect to database
	database.Connect()

	// Run migrations
	database.Migrate()

	// Setup Fiber app
	app := fiber.New(fiber.Config{
		AppName: "PDF Summarizer API",
		BodyLimit: int(config.AppConfig.MaxFileSize) + 1024*1024, // Max file size + 1MB buffer
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(middleware.MonitoringMiddleware())
	app.Use(middleware.ErrorLoggingMiddleware())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "PDF Summarizer API is running",
		})
	})

	// API routes
	api := app.Group("/api")
	
	// PDF management routes
	pdfs := api.Group("/pdfs")
	pdfs.Post("/upload", handlers.UploadPDF)
	pdfs.Get("/", handlers.ListPDFs)
	pdfs.Get("/:id", handlers.GetPDF)
	pdfs.Delete("/:id", handlers.DeletePDF)
	pdfs.Get("/stats/count", handlers.GetPDFStats)
	
	// PDF Summarization routes
	pdfs.Post("/:id/summarize", handlers.SummarizePDF)
	pdfs.Get("/:id/summaries", handlers.ListSummaries)

	// Summary routes
	summaries := api.Group("/summaries")
	summaries.Get("/", handlers.GetAllSummaries)
	summaries.Get("/:summaryId", handlers.GetSummary)
	summaries.Delete("/:summaryId", handlers.DeleteSummary)

	// Monitoring routes
	monitoring := api.Group("/monitoring")
	monitoring.Get("/stats", handlers.GetMonitoringStats)
	monitoring.Get("/requests", handlers.GetRequestLogs)
	monitoring.Get("/errors", handlers.GetErrorLogs)
	monitoring.Get("/metrics", handlers.GetSystemMetrics)
	monitoring.Post("/metrics/record", handlers.RecordSystemMetric)
	monitoring.Delete("/logs/clear", handlers.ClearOldLogs)

	// Start server
	port := config.AppConfig.Port
	log.Printf("Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
