package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"pdf-summarizer-backend/config"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var MinioClient *minio.Client

// InitMinio initializes MinIO client and creates bucket if not exists
func InitMinio() error {
	var err error

	// Initialize MinIO client
	MinioClient, err = minio.New(config.AppConfig.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AppConfig.MinioAccessKey, config.AppConfig.MinioSecretKey, ""),
		Secure: config.AppConfig.MinioUseSSL,
	})
	if err != nil {
		return fmt.Errorf("failed to create MinIO client: %v", err)
	}

	// Create bucket if not exists
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	exists, err := MinioClient.BucketExists(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("failed to check bucket: %v", err)
	}

	if !exists {
		err = MinioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %v", err)
		}
		log.Printf("MinIO bucket '%s' created", bucketName)
	} else {
		log.Printf("MinIO bucket '%s' already exists", bucketName)
	}

	log.Println("MinIO client initialized successfully")
	return nil
}

// UploadFile uploads a file to MinIO with retry mechanism
func UploadFile(file *multipart.FileHeader, objectName string) (string, error) {
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	maxRetries := 3
	retryDelay := 2 * time.Second

	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		// Open file
		src, err := file.Open()
		if err != nil {
			return "", fmt.Errorf("failed to open file: %v", err)
		}

		// Upload to MinIO
		_, err = MinioClient.PutObject(ctx, bucketName, objectName, src, file.Size, minio.PutObjectOptions{
			ContentType: file.Header.Get("Content-Type"),
		})
		src.Close()

		if err == nil {
			// Success!
			objectPath := fmt.Sprintf("%s/%s", bucketName, objectName)
			log.Printf("File uploaded to MinIO: %s (attempt %d/%d)", objectPath, attempt, maxRetries)
			return objectPath, nil
		}

		// Failed, save error
		lastErr = err
		log.Printf("Upload attempt %d/%d failed: %v", attempt, maxRetries, err)

		// Retry with delay (except on last attempt)
		if attempt < maxRetries {
			log.Printf("Retrying in %v...", retryDelay)
			time.Sleep(retryDelay)
			retryDelay *= 2 // Exponential backoff
		}
	}

	return "", fmt.Errorf("failed to upload to MinIO after %d attempts: %v", maxRetries, lastErr)
}

// DownloadFile downloads a file from MinIO with retry mechanism
func DownloadFile(objectName string) (io.ReadCloser, error) {
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	maxRetries := 3
	retryDelay := 2 * time.Second

	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		object, err := MinioClient.GetObject(ctx, bucketName, objectName, minio.GetObjectOptions{})
		if err == nil {
			log.Printf("File downloaded from MinIO: %s (attempt %d/%d)", objectName, attempt, maxRetries)
			return object, nil
		}

		lastErr = err
		log.Printf("Download attempt %d/%d failed: %v", attempt, maxRetries, err)

		if attempt < maxRetries {
			log.Printf("⏳ Retrying in %v...", retryDelay)
			time.Sleep(retryDelay)
			retryDelay *= 2 // Exponential backoff
		}
	}

	return nil, fmt.Errorf("failed to download from MinIO after %d attempts: %v", maxRetries, lastErr)
}

// DeleteFile deletes a file from MinIO with retry mechanism
func DeleteFile(objectName string) error {
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	maxRetries := 3
	retryDelay := 2 * time.Second

	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		err := MinioClient.RemoveObject(ctx, bucketName, objectName, minio.RemoveObjectOptions{})
		if err == nil {
			log.Printf("File deleted from MinIO: %s (attempt %d/%d)", objectName, attempt, maxRetries)
			return nil
		}

		lastErr = err
		log.Printf("Delete attempt %d/%d failed: %v", attempt, maxRetries, err)

		if attempt < maxRetries {
			log.Printf("⏳ Retrying in %v...", retryDelay)
			time.Sleep(retryDelay)
			retryDelay *= 2 // Exponential backoff
		}
	}

	return fmt.Errorf("failed to delete from MinIO after %d attempts: %v", maxRetries, lastErr)
}

// GetPresignedURL generates a presigned URL for temporary access
func GetPresignedURL(objectName string, expiry time.Duration) (string, error) {
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	presignedURL, err := MinioClient.PresignedGetObject(ctx, bucketName, objectName, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %v", err)
	}

	return presignedURL.String(), nil
}
