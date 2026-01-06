package main

import (
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/utils"
	"pdf-summarizer-backend/worker"

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

	// Start background worker for job processing
	go worker.StartWorker()

	// Setup Fiber app
	app := fiber.New(fiber.Config{
		AppName: "PDF Summarizer API",
		BodyLimit: int(config.AppConfig.MaxFileSize) + 1024*1024, // Max file size + 1MB buffer
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
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
	pdfs.Post("/:id/summarize", handlers.SummarizePDF)           // Sync (old way)
	pdfs.Post("/:id/summarize-async", handlers.CreateSummarizationJob) // Async (new way with queue)
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

	// Start server
	port := config.AppConfig.Port
	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("📊 Database: 3 tables (pdf_files, summary_logs, summarization_jobs)")
	log.Printf("⚡ Trigger: Auto-update latest summary on pdf_files")
	log.Printf("🔄 Worker: Background job processor running")
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
