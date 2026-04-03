package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
)

// SQSQueue implements queue using AWS SQS
type SQSQueue struct {
	client   *sqs.Client
	queueURL string
}

// SQSJobMessage represents message structure for SQS
type SQSJobMessage struct {
	JobID      string `json:"job_id"`
	FileID     string `json:"file_id"`
	FileName   string `json:"file_name"`
	S3Key      string `json:"s3_key"`
	UploadedAt string `json:"uploaded_at"`
}

// ToJobMessage converts SQSJobMessage to JobMessage
func (s *SQSJobMessage) ToJobMessage() (JobMessage, error) {
	jobID, err := strconv.ParseUint(s.JobID, 10, 64)
	if err != nil {
		return JobMessage{}, fmt.Errorf("failed to parse job_id: %w", err)
	}
	return JobMessage{
		JobID: uint(jobID),
	}, nil
}

// NewSQSQueue creates new SQS queue client
func NewSQSQueue() (*SQSQueue, error) {
	// Load AWS config
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(os.Getenv("AWS_REGION")),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := sqs.NewFromConfig(cfg)
	queueURL := os.Getenv("SQS_QUEUE_URL")
	if queueURL == "" {
		return nil, fmt.Errorf("SQS_QUEUE_URL environment variable not set")
	}

	return &SQSQueue{
		client:   client,
		queueURL: queueURL,
	}, nil
}

// SendMessage sends job message to SQS queue
func (q *SQSQueue) SendMessage(ctx context.Context, message JobMessage) error {
	sqsMsg := SQSJobMessage{
		JobID: fmt.Sprintf("%d", message.JobID),
	}

	body, err := json.Marshal(sqsMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	_, err = q.client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(q.queueURL),
		MessageBody: aws.String(string(body)),
		MessageAttributes: map[string]types.MessageAttributeValue{
			"JobID": {
				DataType:    aws.String("String"),
				StringValue: aws.String(fmt.Sprintf("%d", message.JobID)),
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to send message to SQS: %w", err)
	}

	return nil
}

// ReceiveMessages receives messages from SQS queue
func (q *SQSQueue) ReceiveMessages(ctx context.Context, maxMessages int32) ([]Message, error) {
	result, err := q.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(q.queueURL),
		MaxNumberOfMessages: maxMessages,
		WaitTimeSeconds:     10,
		VisibilityTimeout:   900,
		MessageAttributeNames: []string{
			"All",
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to receive messages from SQS: %w", err)
	}

	messages := make([]Message, 0, len(result.Messages))
	for _, msg := range result.Messages {
		var sqsMsg SQSJobMessage
		if err := json.Unmarshal([]byte(*msg.Body), &sqsMsg); err != nil {
			continue
		}

		jobMsg, err := sqsMsg.ToJobMessage()
		if err != nil {
			continue
		}

		messages = append(messages, Message{
			ID:            *msg.ReceiptHandle,
			Body:          jobMsg,
			ReceiptHandle: *msg.ReceiptHandle,
			MessageID:     *msg.MessageId,
		})
	}

	return messages, nil
}

// DeleteMessage deletes message from queue after successful processing
func (q *SQSQueue) DeleteMessage(ctx context.Context, receiptHandle string) error {
	_, err := q.client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
		QueueUrl:      aws.String(q.queueURL),
		ReceiptHandle: aws.String(receiptHandle),
	})
	if err != nil {
		return fmt.Errorf("failed to delete message from SQS: %w", err)
	}

	return nil
}

// ChangeMessageVisibility extends visibility timeout untuk long processing
func (q *SQSQueue) ChangeMessageVisibility(ctx context.Context, receiptHandle string, timeout int32) error {
	_, err := q.client.ChangeMessageVisibility(ctx, &sqs.ChangeMessageVisibilityInput{
		QueueUrl:          aws.String(q.queueURL),
		ReceiptHandle:     aws.String(receiptHandle),
		VisibilityTimeout: timeout,
	})
	if err != nil {
		return fmt.Errorf("failed to change message visibility: %w", err)
	}

	return nil
}

// GetQueueAttributes gets queue statistics
func (q *SQSQueue) GetQueueAttributes(ctx context.Context) (map[string]string, error) {
	result, err := q.client.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
		QueueUrl: aws.String(q.queueURL),
		AttributeNames: []types.QueueAttributeName{
			types.QueueAttributeNameApproximateNumberOfMessages,
			types.QueueAttributeNameApproximateNumberOfMessagesNotVisible,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get queue attributes: %w", err)
	}

	return result.Attributes, nil
}

// Message represents SQS message
type Message struct {
	ID            string
	Body          JobMessage
	ReceiptHandle string
	MessageID     string
}
