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
	err := DB.AutoMigrate(
		&models.PDFFile{},
		&models.Summary{},
		&models.RequestLog{},
		&models.SystemMetric{},
		&models.ErrorLog{},
	)

	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("✅ Database migration completed")
}
