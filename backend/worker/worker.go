package worker

import (
	"context"
	"encoding/json"
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/handlers"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/queue"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

var (
	useAWS      bool
	queueClient queue.Queue
)

func initWorker() {
	useAWS = config.AppConfig.UseAWS

	if useAWS {
		var err error
		queueClient, err = queue.NewSQSQueue()
		if err != nil {
			log.Fatal("Failed to initialize SQS queue:", err)
		}
		log.Println("SQS queue client initialized")
	} else {
		if err := queue.ConnectRabbitMQ(); err != nil {
			log.Fatal("Failed to connect to RabbitMQ:", err)
		}
		log.Println("RabbitMQ connected successfully")
	}
}

func StartWorker() {
	initWorker()
	log.Println("Starting job consumer...")

	if useAWS {
		startSQSConsumer()
	} else {
		startRabbitMQConsumer()
	}
}

func startSQSConsumer() {
	log.Println("Starting SQS consumer...")

	for {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		messages, err := queueClient.ReceiveMessages(ctx, 1)
		cancel()

		if err != nil {
			log.Printf("Failed to receive messages: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}

		for _, msg := range messages {
			processSQSMessages(msg)
		}
	}
}

func processSQSMessages(msg queue.Message) {
	log.Printf("Processing job %s (SQS MessageID: %s)", msg.Body.JobID, msg.MessageID)

	err := handlers.ProcessJobWithCheckpoint(msg.Body.JobID)

	if err != nil {
		log.Printf("Job %s failed: %v", msg.Body.JobID, err)

		isPermanent := isPermanentError(err)
		if isPermanent {
			log.Printf("Permanent error - deleting message %s", msg.MessageID)
			ctx := context.Background()
			queueClient.DeleteMessage(ctx, msg.ReceiptHandle)
		} else {
			log.Printf("Temporary error - message %s will be retried", msg.MessageID)
		}
	} else {
		log.Printf("Job %s completed successfully", msg.Body.JobID)
		ctx := context.Background()
		queueClient.DeleteMessage(ctx, msg.ReceiptHandle)
	}
}

func startRabbitMQConsumer() {
	log.Println("Starting RabbitMQ consumer...")

	msgs, err := queue.GetRabbitMQChannel().Consume(
		queue.QueueName,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatal("Failed to register consumer:", err)
	}

	forever := make(chan bool)

	go func() {
		for msg := range msgs {
			processRabbitMQDelivery(msg)
		}
	}()

	log.Println("Worker started. Waiting for jobs...")
	<-forever
}

func processRabbitMQDelivery(msg amqp.Delivery) {
	var jobMsg queue.JobMessage
	err := json.Unmarshal(msg.Body, &jobMsg)
	if err != nil {
		log.Printf("Failed to parse message: %v", err)
		msg.Nack(false, false)
		return
	}

	log.Printf("Processing job %d", jobMsg.JobID)

	err = handlers.ProcessJobWithCheckpoint(jobMsg.JobID)

	if err != nil {
		log.Printf("Job %d failed: %v", jobMsg.JobID, err)

		isPermanent := isPermanentError(err)
		if isPermanent {
			log.Printf("Permanent error - not requeuing job %d", jobMsg.JobID)
			msg.Nack(false, false)
		} else {
			msg.Nack(false, true)
		}
	} else {
		log.Printf("Job %d completed successfully", jobMsg.JobID)
		msg.Ack(false)
	}
}

func isPermanentError(err error) bool {
	permanentErrors := []string{
		"specified key does not exist",
		"file not found",
		"invalid file format",
		"file too large",
		"could not extract text",
		"corrupted",
		"encrypted",
		"no such file",
	}

	errMsg := strings.ToLower(err.Error())
	for _, permErr := range permanentErrors {
		if strings.Contains(errMsg, permErr) {
			return true
		}
	}
	return false
}

func StartAuditWorker() {
	log.Println("Starting audit log consumer...")

	if useAWS {
		startAuditSQSConsumer()
	} else {
		startAuditRabbitMQConsumer()
	}
}

func startAuditSQSConsumer() {
	log.Println("Starting audit SQS consumer...")

	for {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		messages, err := queueClient.ReceiveMessages(ctx, 5)
		cancel()

		if err != nil {
			log.Printf("Failed to receive audit messages: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}

		for _, msg := range messages {
			if msg.Body.JobID == 0 {
				processAuditMessage(msg.Body)
				ctx := context.Background()
				queueClient.DeleteMessage(ctx, msg.ReceiptHandle)
			}
		}
	}
}

func processAuditMessage(jobMsg queue.JobMessage) {
	var auditLog models.AuditLog
	auditLogJSON, err := json.Marshal(jobMsg)
	if err != nil {
		log.Printf("Failed to marshal audit log: %v", err)
		return
	}

	if err := json.Unmarshal(auditLogJSON, &auditLog); err != nil {
		log.Printf("Failed to parse audit log: %v", err)
		return
	}

	if err := database.DB.Create(&auditLog).Error; err != nil {
		log.Printf("Failed to save audit log: %v", err)
		return
	}

	log.Printf("Audit log saved for job %s", jobMsg.JobID)
}

func startAuditRabbitMQConsumer() {
	msgs, err := queue.GetRabbitMQChannel().Consume(
		queue.AuditQueueName,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatal("Failed to register audit consumer:", err)
	}

	go func() {
		for msg := range msgs {
			var auditLog models.AuditLog

			if err := json.Unmarshal(msg.Body, &auditLog); err != nil {
				log.Printf("Failed to parse audit log: %v", err)
				msg.Nack(false, false)
				continue
			}

			if err := database.DB.Create(&auditLog).Error; err != nil {
				log.Printf("Failed to save audit log: %v", err)
				msg.Nack(false, true)
				continue
			}

			msg.Ack(false)
		}
	}()

	log.Println("Audit worker started")
}
