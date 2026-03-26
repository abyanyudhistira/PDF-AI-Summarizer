package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Storage implements storage using AWS S3
type S3Storage struct {
	client     *s3.Client
	bucketName string
}

// NewS3Storage creates new S3 storage client
func NewS3Storage() (*S3Storage, error) {
	// Load AWS config dari environment atau IAM role
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(os.Getenv("AWS_REGION")),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg)
	bucketName := os.Getenv("S3_BUCKET")
	if bucketName == "" {
		return nil, fmt.Errorf("S3_BUCKET environment variable not set")
	}

	return &S3Storage{
		client:     client,
		bucketName: bucketName,
	}, nil
}

// UploadFile uploads file to S3
func (s *S3Storage) UploadFile(ctx context.Context, objectName string, reader io.Reader, size int64) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucketName),
		Key:           aws.String(objectName),
		Body:          reader,
		ContentLength: aws.Int64(size),
		ContentType:   aws.String("application/pdf"),
	})
	if err != nil {
		return fmt.Errorf("failed to upload to S3: %w", err)
	}

	return nil
}

// DownloadFile downloads file from S3
func (s *S3Storage) DownloadFile(ctx context.Context, objectName string) (io.ReadCloser, error) {
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectName),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to download from S3: %w", err)
	}

	return result.Body, nil
}

// DeleteFile deletes file from S3
func (s *S3Storage) DeleteFile(ctx context.Context, objectName string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectName),
	})
	if err != nil {
		return fmt.Errorf("failed to delete from S3: %w", err)
	}

	return nil
}

// GetPresignedURL generates presigned URL for temporary access
func (s *S3Storage) GetPresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	presignClient := s3.NewPresignClient(s.client)

	request, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectName),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiry
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return request.URL, nil
}

// FileExists checks if file exists in S3
func (s *S3Storage) FileExists(ctx context.Context, objectName string) (bool, error) {
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectName),
	})
	if err != nil {
		// Check if error is "not found"
		return false, nil
	}

	return true, nil
}
