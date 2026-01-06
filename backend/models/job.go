package models

import (
	"time"

	"gorm.io/gorm"
)

type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

// SummarizationJob - Queue for background summarization
type SummarizationJob struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	PDFFileID   uint           `gorm:"not null;index" json:"pdf_file_id"`
	Status      JobStatus      `gorm:"type:varchar(20);not null;default:'pending';index" json:"status"`
	Mode        SummaryMode    `gorm:"type:varchar(50);not null" json:"mode"`
	Language    string         `gorm:"size:50;not null;default:'english'" json:"language"`
	Pages       *string        `gorm:"size:100" json:"pages"`
	Question    *string        `gorm:"type:text" json:"question"`
	
	// Retry mechanism
	RetryCount  int            `gorm:"default:0" json:"retry_count"`
	MaxRetries  int            `gorm:"default:3" json:"max_retries"`
	ErrorMsg    *string        `gorm:"type:text" json:"error_msg"`
	
	// Result
	SummaryLogID *uint         `gorm:"index" json:"summary_log_id"`
	
	// Timestamps
	StartedAt   *time.Time     `json:"started_at"`
	CompletedAt *time.Time     `json:"completed_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Relations
	PDFFile     PDFFile        `gorm:"foreignKey:PDFFileID" json:"pdf_file,omitempty"`
	SummaryLog  *SummaryLog    `gorm:"foreignKey:SummaryLogID" json:"summary_log,omitempty"`
}

type JobResponse struct {
	ID           uint       `json:"id"`
	PDFFileID    uint       `json:"pdf_file_id"`
	Status       JobStatus  `json:"status"`
	Mode         SummaryMode `json:"mode"`
	Language     string     `json:"language"`
	Pages        *string    `json:"pages"`
	Question     *string    `json:"question"`
	RetryCount   int        `json:"retry_count"`
	MaxRetries   int        `json:"max_retries"`
	ErrorMsg     *string    `json:"error_msg"`
	SummaryLogID *uint      `json:"summary_log_id"`
	StartedAt    *time.Time `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at"`
	CreatedAt    time.Time  `json:"created_at"`
	
	// Include PDF info
	PDFFilename  string     `json:"pdf_filename,omitempty"`
}
