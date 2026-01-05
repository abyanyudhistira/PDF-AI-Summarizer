package models

import (
	"time"

	"gorm.io/gorm"
)

// RequestLog tracks all API requests
type RequestLog struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Method        string         `gorm:"size:10;not null" json:"method"`
	Path          string         `gorm:"size:500;not null" json:"path"`
	StatusCode    int            `json:"status_code"`
	ResponseTime  float64        `json:"response_time"` // in milliseconds
	IPAddress     string         `gorm:"size:50" json:"ip_address"`
	UserAgent     string         `gorm:"size:500" json:"user_agent"`
	RequestBody   string         `gorm:"type:text" json:"request_body,omitempty"`
	ResponseBody  string         `gorm:"type:text" json:"response_body,omitempty"`
	ErrorMessage  string         `gorm:"type:text" json:"error_message,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// SystemMetric tracks system performance
type SystemMetric struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	TotalRequests     int64     `json:"total_requests"`
	TotalPDFs         int64     `json:"total_pdfs"`
	TotalSummaries    int64     `json:"total_summaries"`
	AvgResponseTime   float64   `json:"avg_response_time"`
	AvgProcessingTime float64   `json:"avg_processing_time"`
	TotalErrors       int64     `json:"total_errors"`
	TotalStorageUsed  int64     `json:"total_storage_used"` // in bytes
	RecordedAt        time.Time `json:"recorded_at"`
}

// ErrorLog tracks application errors
type ErrorLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	ErrorType    string    `gorm:"size:100" json:"error_type"`
	ErrorMessage string    `gorm:"type:text;not null" json:"error_message"`
	StackTrace   string    `gorm:"type:text" json:"stack_trace,omitempty"`
	Endpoint     string    `gorm:"size:500" json:"endpoint"`
	Method       string    `gorm:"size:10" json:"method"`
	UserID       *uint     `json:"user_id,omitempty"`
	IPAddress    string    `gorm:"size:50" json:"ip_address"`
	CreatedAt    time.Time `json:"created_at"`
}

// MonitoringStats for dashboard
type MonitoringStats struct {
	TotalRequests      int64   `json:"total_requests"`
	TotalPDFs          int64   `json:"total_pdfs"`
	TotalSummaries     int64   `json:"total_summaries"`
	TotalErrors        int64   `json:"total_errors"`
	AvgResponseTime    float64 `json:"avg_response_time"`
	AvgProcessingTime  float64 `json:"avg_processing_time"`
	TotalStorageUsed   int64   `json:"total_storage_used"`
	RequestsToday      int64   `json:"requests_today"`
	PDFsToday          int64   `json:"pdfs_today"`
	SummariesToday     int64   `json:"summaries_today"`
	ErrorsToday        int64   `json:"errors_today"`
	TopEndpoints       []EndpointStat `json:"top_endpoints"`
	RecentErrors       []ErrorLog     `json:"recent_errors"`
}

type EndpointStat struct {
	Endpoint     string  `json:"endpoint"`
	RequestCount int64   `json:"request_count"`
	AvgTime      float64 `json:"avg_time"`
}
