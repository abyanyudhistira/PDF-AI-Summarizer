package database

import (
	"fmt"
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	cfg := config.AppConfig

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")
}

func Migrate() {
	log.Println("Running database migrations...")

	// Auto-migrate 4 tables: pdf_files, summary_logs, summarization_jobs, audit_logs
	err := DB.AutoMigrate(
		&models.PDFFile{},
		&models.SummaryLog{},
		&models.SummarizationJob{},
		&models.AuditLog{},
	)

	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Create trigger to auto-update pdf_files with latest summary
	if err := createSummaryTrigger(); err != nil {
		log.Fatal("Failed to create trigger:", err)
	}

	log.Println("Database migration completed")
}

func createSummaryTrigger() error {
	// Drop trigger if exists
	DB.Exec("DROP TRIGGER IF EXISTS update_pdf_latest_summary ON summary_logs")
	DB.Exec("DROP FUNCTION IF EXISTS update_pdf_latest_summary_func()")

	// Create function to update pdf_files with latest summary
	triggerFunction := `
	CREATE OR REPLACE FUNCTION update_pdf_latest_summary_func()
	RETURNS TRIGGER AS $$
	BEGIN
		-- Update pdf_files with the new summary data
		UPDATE pdf_files SET
			latest_summary_id = NEW.id,
			mode = NEW.mode,
			language = NEW.language,
			pages_processed = NEW.pages_processed,
			summary_text = NEW.summary_text,
			executive_summary = NEW.executive_summary,
			bullets = NEW.bullets,
			highlights = NEW.highlights,
			qa_question = NEW.qa_question,
			qa_answer = NEW.qa_answer,
			processing_time = NEW.processing_time,
			last_summarized_at = NEW.created_at,
			updated_at = NOW()
		WHERE id = NEW.pdf_file_id;
		
		RETURN NEW;
	END;
	$$ LANGUAGE plpgsql;
	`

	if err := DB.Exec(triggerFunction).Error; err != nil {
		return err
	}

	// Create trigger
	trigger := `
	CREATE TRIGGER update_pdf_latest_summary
	AFTER INSERT ON summary_logs
	FOR EACH ROW
	EXECUTE FUNCTION update_pdf_latest_summary_func();
	`

	if err := DB.Exec(trigger).Error; err != nil {
		return err
	}

	log.Println("Database trigger created: update_pdf_latest_summary")
	return nil
}
