package models

import (
	"time"

	"gorm.io/gorm"
)

type PDFFile struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Filename         string         `gorm:"size:255;not null" json:"filename"`
	OriginalFilename string         `gorm:"size:255;not null" json:"original_filename"`
	FilePath         string         `gorm:"size:500;not null" json:"file_path"`
	FileSize         int64          `gorm:"not null" json:"file_size"`
	TotalPages       *int           `json:"total_pages"`
	UploadDate       time.Time      `gorm:"autoCreateTime" json:"upload_date"`
	Summaries        []Summary      `gorm:"foreignKey:PDFFileID;constraint:OnDelete:CASCADE" json:"summaries,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

type PDFFileResponse struct {
	ID               uint      `json:"id"`
	OriginalFilename string    `json:"original_filename"`
	FileSize         int64     `json:"file_size"`
	FileSizeMB       float64   `json:"file_size_mb"`
	TotalPages       *int      `json:"total_pages"`
	UploadDate       time.Time `json:"upload_date"`
	SummaryCount     int64     `json:"summary_count"`
}
