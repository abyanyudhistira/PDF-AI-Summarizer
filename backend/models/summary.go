package models

import (
	"time"

	"gorm.io/gorm"
)

type SummaryMode string

const (
	ModeSimple     SummaryMode = "simple"
	ModeStructured SummaryMode = "structured"
	ModeMulti      SummaryMode = "multi"
	ModeQA         SummaryMode = "qa"
)

type Summary struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	PDFFileID        uint           `gorm:"not null;index" json:"pdf_file_id"`
	Mode             SummaryMode    `gorm:"type:varchar(50);not null" json:"mode"`
	Language         string         `gorm:"size:50;not null;default:'english'" json:"language"`
	PagesProcessed   *string        `gorm:"size:100" json:"pages_processed"`
	SummaryText      *string        `gorm:"type:text" json:"summary_text"`
	ExecutiveSummary *string        `gorm:"type:text" json:"executive_summary"`
	Bullets          *string        `gorm:"type:text" json:"bullets"`
	Highlights       *string        `gorm:"type:text" json:"highlights"`
	QAQuestion       *string        `gorm:"type:text" json:"qa_question"`
	QAAnswer         *string        `gorm:"type:text" json:"qa_answer"`
	ProcessingTime   float64        `gorm:"not null" json:"processing_time"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	PDFFile          PDFFile        `gorm:"foreignKey:PDFFileID" json:"pdf_file,omitempty"`
}

type SummaryResponse struct {
	ID               uint        `json:"id"`
	PDFFileID        uint        `json:"pdf_file_id"`
	Mode             SummaryMode `json:"mode"`
	Language         string      `json:"language"`
	PagesProcessed   *string     `json:"pages_processed"`
	SummaryText      *string     `json:"summary_text"`
	ExecutiveSummary *string     `json:"executive_summary"`
	Bullets          *string     `json:"bullets"`
	Highlights       *string     `json:"highlights"`
	QAQuestion       *string     `json:"qa_question"`
	QAAnswer         *string     `json:"qa_answer"`
	ProcessingTime   float64     `json:"processing_time"`
	CreatedAt        time.Time   `json:"created_at"`
}
