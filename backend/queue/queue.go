package queue

import (
	"context"
)

// Queue interface untuk abstraction (support RabbitMQ & SQS)
type Queue interface {
	SendMessage(ctx context.Context, message JobMessage) error
	ReceiveMessages(ctx context.Context, maxMessages int32) ([]Message, error)
	DeleteMessage(ctx context.Context, receiptHandle string) error
}

// Factory function untuk create queue client
func NewQueue(useAWS bool) (Queue, error) {
	if useAWS {
		// Use AWS SQS
		return NewSQSQueue()
	}
	// Use RabbitMQ (local development)
	return NewRabbitMQQueue()
}
