package main

import (
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/middleware"
	"pdf-summarizer-backend/storage"
	"pdf-summarizer-backend/worker"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	config.LoadConfig()
	database.Connect()
	database.Migrate()

	if config.AppConfig.UseAWS {
		log.Println("Using AWS S3 + SQS")
	} else {
		log.Println("Using MinIO + RabbitMQ (local dev)")
		if err := storage.InitMinio(); err != nil {
			log.Fatal("Failed to initialize MinIO:", err)
		}
	}

	go worker.StartWorker()
	go worker.StartAuditWorker()

	app := fiber.New(fiber.Config{
		AppName:   "PDF Summarizer API",
		BodyLimit: int(config.AppConfig.MaxFileSize) + 1024*1024,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(middleware.AuditMiddleware())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "PDF Summarizer API is running",
		})
	})

	api := app.Group("/api")

	pdfs := api.Group("/pdfs")
	pdfs.Post("/upload", handlers.UploadPDF)
	pdfs.Get("/", handlers.ListPDFs)
	pdfs.Get("/:id", handlers.GetPDF)
	pdfs.Delete("/:id", handlers.DeletePDF)
	pdfs.Get("/stats/count", handlers.GetPDFStats)
	pdfs.Post("/:id/summarize", handlers.CreateSummarizationJob)
	pdfs.Get("/:id/summaries", handlers.ListSummaries)

	summaries := api.Group("/summaries")
	summaries.Get("/", handlers.GetAllSummaries)
	summaries.Get("/:summaryId", handlers.GetSummary)
	summaries.Delete("/:summaryId", handlers.DeleteSummary)

	jobs := api.Group("/jobs")
	jobs.Get("/", handlers.ListJobs)
	jobs.Get("/:jobId", handlers.GetJob)
	jobs.Post("/:jobId/retry", handlers.RetryJob)
	jobs.Delete("/:jobId", handlers.DeleteJob)

	audit := api.Group("/audit")
	audit.Get("/logs", handlers.ListAuditLogs)
	audit.Get("/stats", handlers.GetAuditStats)
	audit.Delete("/logs/cleanup", handlers.DeleteOldAuditLogs)

	log.Printf("Server starting on port %s", config.AppConfig.Port)
	if err := app.Listen(":" + config.AppConfig.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
