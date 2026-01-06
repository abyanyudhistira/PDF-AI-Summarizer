package models

import (
	"time"

	"gorm.io/gorm"
)

// PDFFile - Main table with latest summary embedded
type PDFFile struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Filename         string         `gorm:"size:255;not null" json:"filename"`
	OriginalFilename string         `gorm:"size:255;not null" json:"original_filename"`
	FilePath         string         `gorm:"size:500;not null" json:"file_path"`
	FileSize         int64          `gorm:"not null" json:"file_size"`
	TotalPages       *int           `json:"total_pages"`
	UploadDate       time.Time      `gorm:"autoCreateTime" json:"upload_date"`
	
	// Latest Summary Fields (auto-updated by trigger)
	LatestSummaryID  *uint          `gorm:"index" json:"latest_summary_id"`
	Mode             *string        `gorm:"size:50" json:"mode"`
	Language         *string        `gorm:"size:50" json:"language"`
	PagesProcessed   *string        `gorm:"size:100" json:"pages_processed"`
	SummaryText      *string        `gorm:"type:text" json:"summary_text"`
	ExecutiveSummary *string        `gorm:"type:text" json:"executive_summary"`
	Bullets          *string        `gorm:"type:text" json:"bullets"`
	Highlights       *string        `gorm:"type:text" json:"highlights"`
	QAQuestion       *string        `gorm:"type:text" json:"qa_question"`
	QAAnswer         *string        `gorm:"type:text" json:"qa_answer"`
	ProcessingTime   *float64       `json:"processing_time"`
	LastSummarizedAt *time.Time     `json:"last_summarized_at"`
	
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

type PDFFileResponse struct {
	ID               uint       `json:"id"`
	OriginalFilename string     `json:"original_filename"`
	FileSize         int64      `json:"file_size"`
	FileSizeMB       float64    `json:"file_size_mb"`
	TotalPages       *int       `json:"total_pages"`
	UploadDate       time.Time  `json:"upload_date"`
	UploadedAt       time.Time  `json:"uploaded_at"`
	
	// Latest Summary
	Mode             *string    `json:"mode"`
	Language         *string    `json:"language"`
	PagesProcessed   *string    `json:"pages_processed"`
	SummaryText      *string    `json:"summary_text"`
	ExecutiveSummary *string    `json:"executive_summary"`
	Bullets          *string    `json:"bullets"`
	Highlights       *string    `json:"highlights"`
	QAQuestion       *string    `json:"qa_question"`
	QAAnswer         *string    `json:"qa_answer"`
	ProcessingTime   *float64   `json:"processing_time"`
	LastSummarizedAt *time.Time `json:"last_summarized_at"`
	
	SummaryCount     int64      `json:"summary_count"`
}
