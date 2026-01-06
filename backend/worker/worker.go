package worker

import (
	"encoding/json"
	"log"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/queue"

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

	log.Printf("📥 Processing job %d", jobMsg.JobID)

	// Process the job
	err = handlers.ProcessJob(jobMsg.JobID)
	
	if err != nil {
		log.Printf("❌ Job %d failed: %v", jobMsg.JobID, err)
		// Nack with requeue - RabbitMQ will retry or send to DLQ
		msg.Nack(false, true)
	} else {
		log.Printf("✅ Job %d completed successfully", jobMsg.JobID)
		// Acknowledge successful processing
		msg.Ack(false)
	}
}
