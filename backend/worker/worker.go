package worker

import (
	"encoding/json"
	"log"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/queue"
	"strings"

	amqp "github.com/rabbitmq/amqp091-go"
)

// StartWorker starts RabbitMQ consumer
func StartWorker() {
	log.Println("🔄 Starting RabbitMQ job consumer...")

	// Get messages from queue
	msgs, err := queue.Channel.Consume(
		queue.QueueName, // queue
		"",              // consumer
		false,           // auto-ack (manual ack for retry)
		false,           // exclusive
		false,           // no-local
		false,           // no-wait
		nil,             // args
	)
	if err != nil {
		log.Fatal("Failed to register consumer:", err)
	}

	// Process messages
	forever := make(chan bool)

	go func() {
		for msg := range msgs {
			processMessage(msg)
		}
	}()

	log.Println("✅ Worker started. Waiting for jobs...")
	<-forever
}

func processMessage(msg amqp.Delivery) {
	var jobMsg queue.JobMessage
	
	err := json.Unmarshal(msg.Body, &jobMsg)
	if err != nil {
		log.Printf("❌ Failed to parse message: %v", err)
		msg.Nack(false, false) // Don't requeue invalid messages
		return
	}

	log.Printf("📥 Processing job %d (attempt %d)", jobMsg.JobID, msg.Headers["x-delivery-count"])

	// Process the job with checkpoint/resume capability
	err = handlers.ProcessJobWithCheckpoint(jobMsg.JobID)
	
	if err != nil {
		log.Printf("❌ Job %d failed: %v", jobMsg.JobID, err)
		
		// Check if error is permanent (don't requeue)
		errMsg := err.Error()
		isPermanent := false
		
		permanentErrors := []string{
			"specified key does not exist",
			"file not found",
			"invalid file format",
			"file too large",
			"could not extract text",
			"corrupted",
			"encrypted",
		}
		
		for _, permErr := range permanentErrors {
			if contains(errMsg, permErr) {
				isPermanent = true
				log.Printf("🚫 Permanent error - not requeuing job %d", jobMsg.JobID)
				break
			}
		}
		
		if isPermanent {
			// Don't requeue permanent errors - send to DLQ
			msg.Nack(false, false)
		} else {
			// Requeue for retry
			msg.Nack(false, true)
		}
	} else {
		log.Printf("✅ Job %d completed successfully", jobMsg.JobID)
		// Acknowledge successful processing
		msg.Ack(false)
	}
}

// Helper function to check if string contains substring (case-insensitive)
func contains(s, substr string) bool {
	s = strings.ToLower(s)
	substr = strings.ToLower(substr)
	return strings.Contains(s, substr)
}
