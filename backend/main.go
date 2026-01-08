package main

import (
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/middleware"
	"pdf-summarizer-backend/queue"
	"pdf-summarizer-backend/storage"
	"pdf-summarizer-backend/worker"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Load configuration
	config.LoadConfig()

	// Connect to database
	database.Connect()

	// Run migrations
	database.Migrate()

	// Initialize MinIO
	if err := storage.InitMinio(); err != nil {
		log.Fatal("Failed to initialize MinIO:", err)
	}

	// Connect to RabbitMQ
	if err := queue.Connect(); err != nil {
		log.Fatal("Failed to connect to RabbitMQ:", err)
	}
	defer queue.Close()

	// Start background workers
	go worker.StartWorker()      // Job processor
	go worker.StartAuditWorker() // Audit log processor

	// Setup Fiber app
	app := fiber.New(fiber.Config{
		AppName: "PDF Summarizer API",
		BodyLimit: int(config.AppConfig.MaxFileSize) + 1024*1024, // Max file size + 1MB buffer
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(middleware.AuditMiddleware()) // Audit logging
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
	
	// PDF Summarization routes (Async with RabbitMQ Queue)
	pdfs.Post("/:id/summarize", handlers.CreateSummarizationJob) // Async (default)
	pdfs.Get("/:id/summaries", handlers.ListSummaries)

	// Summary routes
	summaries := api.Group("/summaries")
	summaries.Get("/", handlers.GetAllSummaries)
	summaries.Get("/:summaryId", handlers.GetSummary)
	summaries.Delete("/:summaryId", handlers.DeleteSummary)

	// Job Queue routes
	jobs := api.Group("/jobs")
	jobs.Get("/", handlers.ListJobs)                    // List all jobs with filters
	jobs.Get("/:jobId", handlers.GetJob)                // Get job status
	jobs.Post("/:jobId/retry", handlers.RetryJob)       // Retry failed job
	jobs.Delete("/:jobId", handlers.DeleteJob)          // Delete job

	// Audit Log routes
	audit := api.Group("/audit")
	audit.Get("/logs", handlers.ListAuditLogs)                 // List audit logs
	audit.Get("/stats", handlers.GetAuditStats)                // Get statistics
	audit.Delete("/logs/cleanup", handlers.DeleteOldAuditLogs) // Cleanup old logs

	// Test routes removed - not needed for production

	// Start server
	port := config.AppConfig.Port
	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📊 Database: 4 tables (pdf_files, summary_logs, summarization_jobs, audit_logs)")
	log.Printf("⚡ Trigger: Auto-update latest summary on pdf_files")
	log.Printf("🐰 RabbitMQ: Connected and consuming jobs")
	log.Printf("🔄 Worker: Job processor running")
	log.Printf("📝 Worker: Audit log processor running")
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
