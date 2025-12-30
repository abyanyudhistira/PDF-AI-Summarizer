package main

import (
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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

	// Setup Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "PDF Summarizer API is running",
		})
	})

	// API routes
	api := router.Group("/api")
	{
		// PDF management routes
		pdfs := api.Group("/pdfs")
		{
			pdfs.POST("/upload", handlers.UploadPDF)
			pdfs.GET("", handlers.ListPDFs)
			pdfs.GET("/:id", handlers.GetPDF)
			pdfs.DELETE("/:id", handlers.DeletePDF)
			pdfs.GET("/stats/count", handlers.GetPDFStats)
		}

		// Summary routes (will be added later)
		// summaries := api.Group("/summaries")
		// {
		// 	summaries.GET("", handlers.ListSummaries)
		// 	summaries.GET("/:id", handlers.GetSummary)
		// 	summaries.DELETE("/:id", handlers.DeleteSummary)
		// }
	}

	// Start server
	port := config.AppConfig.Port
	log.Printf("🚀 Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
