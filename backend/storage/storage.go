package storage

import (
	"context"
	"io"
	"time"
)

// Storage interface untuk abstraction (support MinIO & S3)
type Storage interface {
	UploadFile(ctx context.Context, objectName string, reader io.Reader, size int64) error
	DownloadFile(ctx context.Context, objectName string) (io.ReadCloser, error)
	DeleteFile(ctx context.Context, objectName string) error
	GetPresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error)
	FileExists(ctx context.Context, objectName string) (bool, error)
}

// Factory function untuk create storage client
func NewStorage(useAWS bool) (Storage, error) {
	if useAWS {
		// Use AWS S3
		return NewS3Storage()
	}
	// Use MinIO (local development)
	return NewMinioStorage()
}
