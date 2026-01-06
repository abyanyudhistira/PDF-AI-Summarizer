package worker

import (
	"log"
	"pdf-summarizer-backend/handlers"
	"time"
)

// StartWorker starts background job processor
func StartWorker() {
	log.Println("Starting background job worker...")

	// Process jobs every 5 seconds
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := handlers.ProcessPendingJobs(); err != nil {
			log.Printf("Error processing jobs: %v", err)
		}
	}
}
