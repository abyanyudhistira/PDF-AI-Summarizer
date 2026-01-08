package queue

import (
	"encoding/json"
	"log"
	"pdf-summarizer-backend/config"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

var (
	Connection *amqp.Connection
	Channel    *amqp.Channel
)

const (
	QueueName       = "summarization_jobs"
	ExchangeName    = "summarization"
	RoutingKey      = "job.new"
	DeadLetterQueue = "summarization_jobs_dlq"
	
	// Audit queue
	AuditQueueName = "audit_logs"
	AuditExchange  = "audit"
	AuditRoutingKey = "audit.log"
)

// JobMessage represents a job message in the queue
type JobMessage struct {
	JobID uint `json:"job_id"`
}

// Connect establishes connection to RabbitMQ with retry logic
func Connect() error {
	var err error
	maxRetries := 10
	retryDelay := 3 * time.Second
	
	log.Println("Connecting to RabbitMQ...")
	
	// Retry connection with exponential backoff
	for i := 0; i < maxRetries; i++ {
		Connection, err = amqp.Dial(config.AppConfig.RabbitMQURL)
		if err == nil {
			break
		}
		
		if i < maxRetries-1 {
			log.Printf("Failed to connect to RabbitMQ (attempt %d/%d): %v", i+1, maxRetries, err)
			log.Printf("Retrying in %v...", retryDelay)
			time.Sleep(retryDelay)
			retryDelay *= 2 // Exponential backoff
		} else {
			log.Printf("Failed to connect to RabbitMQ after %d attempts", maxRetries)
			return err
		}
	}

	// Create channel
	Channel, err = Connection.Channel()
	if err != nil {
		return err
	}

	// Declare dead letter exchange and queue
	err = Channel.ExchangeDeclare(
		"summarization_dlx", // name
		"direct",            // type
		true,                // durable
		false,               // auto-deleted
		false,               // internal
		false,               // no-wait
		nil,                 // arguments
	)
	if err != nil {
		return err
	}

	_, err = Channel.QueueDeclare(
		DeadLetterQueue, // name
		true,            // durable
		false,           // delete when unused
		false,           // exclusive
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		return err
	}

	err = Channel.QueueBind(
		DeadLetterQueue,     // queue name
		"job.failed",        // routing key
		"summarization_dlx", // exchange
		false,
		nil,
	)
	if err != nil {
		return err
	}

	// Declare main exchange
	err = Channel.ExchangeDeclare(
		ExchangeName, // name
		"direct",     // type
		true,         // durable
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,          // arguments
	)
	if err != nil {
		return err
	}

	// Declare main queue with dead letter exchange
	_, err = Channel.QueueDeclare(
		QueueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		amqp.Table{
			"x-dead-letter-exchange":    "summarization_dlx",
			"x-dead-letter-routing-key": "job.failed",
		},
	)
	if err != nil {
		return err
	}

	// Bind queue to exchange
	err = Channel.QueueBind(
		QueueName,    // queue name
		RoutingKey,   // routing key
		ExchangeName, // exchange
		false,
		nil,
	)
	if err != nil {
		return err
	}

	log.Println("RabbitMQ connected successfully")
	log.Printf("Queue: %s", QueueName)
	log.Printf("Dead Letter Queue: %s", DeadLetterQueue)
	
	// Setup audit queue
	if err := setupAuditQueue(); err != nil {
		return err
	}
	
	return nil
}

// setupAuditQueue creates audit logging queue
func setupAuditQueue() error {
	// Declare audit exchange
	err := Channel.ExchangeDeclare(
		AuditExchange, // name
		"direct",      // type
		true,          // durable
		false,         // auto-deleted
		false,         // internal
		false,         // no-wait
		nil,           // arguments
	)
	if err != nil {
		return err
	}

	// Declare audit queue
	_, err = Channel.QueueDeclare(
		AuditQueueName, // name
		true,           // durable
		false,          // delete when unused
		false,          // exclusive
		false,          // no-wait
		nil,            // arguments
	)
	if err != nil {
		return err
	}

	// Bind queue to exchange
	err = Channel.QueueBind(
		AuditQueueName,   // queue name
		AuditRoutingKey,  // routing key
		AuditExchange,    // exchange
		false,
		nil,
	)
	if err != nil {
		return err
	}

	log.Printf("Audit Queue: %s", AuditQueueName)
	return nil
}

// PublishJob publishes a new job to the queue
func PublishJob(jobID uint) error {
	message := JobMessage{
		JobID: jobID,
	}

	body, err := json.Marshal(message)
	if err != nil {
		return err
	}

	err = Channel.Publish(
		ExchangeName, // exchange
		RoutingKey,   // routing key
		false,        // mandatory
		false,        // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
		},
	)

	if err != nil {
		return err
	}

	log.Printf("Published job %d to queue", jobID)
	return nil
}

// PublishAudit publishes audit log to queue
func PublishAudit(auditLog interface{}) error {
	body, err := json.Marshal(auditLog)
	if err != nil {
		return err
	}

	err = Channel.Publish(
		AuditExchange,   // exchange
		AuditRoutingKey, // routing key
		false,           // mandatory
		false,           // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
		},
	)

	if err != nil {
		return err
	}

	return nil
}

// Close closes the RabbitMQ connection
func Close() {
	if Channel != nil {
		Channel.Close()
	}
	if Connection != nil {
		Connection.Close()
	}
	log.Println("RabbitMQ connection closed")
}
