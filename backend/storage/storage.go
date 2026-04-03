package storage

import (
	"context"
	"io"
	"time"
)

type Storage interface {
	UploadFile(ctx context.Context, objectName string, reader io.Reader, size int64) error
	DownloadFile(ctx context.Context, objectName string) (io.ReadCloser, error)
	DeleteFile(ctx context.Context, objectName string) error
	GetPresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error)
	FileExists(ctx context.Context, objectName string) (bool, error)
}

func NewStorage(useAWS bool) (Storage, error) {
	if useAWS {
		return NewS3Storage()
	}
	return NewMinioStorage()
}
