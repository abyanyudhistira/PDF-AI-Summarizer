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
		log.Printf("✅ MinIO bucket '%s' created", bucketName)
	} else {
		log.Printf("✅ MinIO bucket '%s' already exists", bucketName)
	}

	log.Println("✅ MinIO client initialized successfully")
	return nil
}

// UploadFile uploads a file to MinIO
func UploadFile(file *multipart.FileHeader, objectName string) (string, error) {
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	// Open file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %v", err)
	}
	defer src.Close()

	// Upload to MinIO
	_, err = MinioClient.PutObject(ctx, bucketName, objectName, src, file.Size, minio.PutObjectOptions{
		ContentType: file.Header.Get("Content-Type"),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to MinIO: %v", err)
	}

	// Return object path
	objectPath := fmt.Sprintf("%s/%s", bucketName, objectName)
	log.Printf("📤 File uploaded to MinIO: %s", objectPath)
	return objectPath, nil
}

// DownloadFile downloads a file from MinIO
func DownloadFile(objectName string) (io.ReadCloser, error) {
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	object, err := MinioClient.GetObject(ctx, bucketName, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to download from MinIO: %v", err)
	}

	return object, nil
}

// DeleteFile deletes a file from MinIO
func DeleteFile(objectName string) error {
	ctx := context.Background()
	bucketName := config.AppConfig.MinioBucket

	err := MinioClient.RemoveObject(ctx, bucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete from MinIO: %v", err)
	}

	log.Printf("🗑️  File deleted from MinIO: %s", objectName)
	return nil
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
