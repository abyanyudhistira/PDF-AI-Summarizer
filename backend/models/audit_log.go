package models

import (
	"time"

	"gorm.io/gorm"
)

// AuditLog - Simple audit logging
type AuditLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Timestamp time.Time      `gorm:"index;not null" json:"timestamp"`
	Action    string         `gorm:"size:100;not null;index" json:"action"`
	Resource  string         `gorm:"size:255;index" json:"resource"`
	Details   string         `gorm:"type:text" json:"details"` // JSON string
	IPAddress string         `gorm:"size:45" json:"ip_address"`
	Status    string         `gorm:"size:20;index" json:"status"` // success, failed
	Duration  int64          `json:"duration"`                    // milliseconds
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type AuditLogResponse struct {
	ID        uint      `json:"id"`
	Timestamp time.Time `json:"timestamp"`
	Action    string    `json:"action"`
	Resource  string    `json:"resource"`
	Details   string    `json:"details"`
	IPAddress string    `json:"ip_address"`
	Status    string    `json:"status"`
	Duration  int64     `json:"duration"`
}
