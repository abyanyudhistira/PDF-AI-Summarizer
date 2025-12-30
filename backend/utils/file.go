package utils

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ValidateFile validates file type and size
func ValidateFile(file *multipart.FileHeader, maxSize int64) error {
	// Check file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".pdf" {
		return fmt.Errorf("only PDF files are allowed")
	}

	// Check file size
	if file.Size > maxSize {
		maxSizeMB := float64(maxSize) / (1024 * 1024)
		return fmt.Errorf("file size exceeds maximum limit of %.2f MB", maxSizeMB)
	}

	return nil
}

// GenerateUniqueFilename generates a unique filename to avoid collisions
func GenerateUniqueFilename(originalFilename string) string {
	timestamp := time.Now().Format("20060102_150405")
	uniqueID := uuid.New().String()[:8]
	ext := filepath.Ext(originalFilename)
	
	// Clean original filename
	cleanName := strings.TrimSuffix(originalFilename, ext)
	cleanName = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		if r == ' ' {
			return '_'
		}
		return -1
	}, cleanName)
	
	// Limit length
	if len(cleanName) > 50 {
		cleanName = cleanName[:50]
	}
	
	return fmt.Sprintf("%s_%s_%s%s", timestamp, uniqueID, cleanName, ext)
}

// EnsureUploadDir creates upload directory if it doesn't exist
func EnsureUploadDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return os.MkdirAll(dir, 0755)
	}
	return nil
}

// DeleteFile deletes a file from filesystem
func DeleteFile(filePath string) error {
	if _, err := os.Stat(filePath); err == nil {
		return os.Remove(filePath)
	}
	return nil
}

// GetFileSizeMB converts bytes to MB
func GetFileSizeMB(sizeBytes int64) float64 {
	return float64(sizeBytes) / (1024 * 1024)
}
