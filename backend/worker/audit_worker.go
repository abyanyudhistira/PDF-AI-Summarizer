package worker

import (
	"encoding/json"
	"log"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/queue"
)

// StartAuditWorker starts audit log consumer
func StartAuditWorker() {
	log.Println("Starting audit log consumer...")

	// Get messages from queue
	msgs, err := queue.Channel.Consume(
		queue.AuditQueueName, // queue
		"",                   // consumer
		false,                // auto-ack
		false,                // exclusive
		false,                // no-local
		false,                // no-wait
		nil,                  // args
	)
	if err != nil {
		log.Fatal("Failed to register audit consumer:", err)
	}

	// Process messages
	go func() {
		for msg := range msgs {
			var auditLog models.AuditLog

			err := json.Unmarshal(msg.Body, &auditLog)
			if err != nil {
				log.Printf("Failed to parse audit log: %v", err)
				msg.Nack(false, false)
				continue
			}

			// Save to database
			if err := database.DB.Create(&auditLog).Error; err != nil {
				log.Printf("Failed to save audit log: %v", err)
				msg.Nack(false, true) // Requeue
				continue
			}

			// Acknowledge
			msg.Ack(false)
		}
	}()

	log.Println("Audit worker started")
}
