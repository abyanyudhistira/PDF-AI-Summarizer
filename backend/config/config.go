package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	DBSSLMode     string
	AIServiceURL  string
	MaxFileSize   int64
	UploadDir     string
	RabbitMQURL   string
}

var AppConfig *Config

func LoadConfig() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	maxFileSize, _ := strconv.ParseInt(getEnv("MAX_FILE_SIZE", "10485760"), 10, 64)

	AppConfig = &Config{
		Port:         getEnv("PORT", "8080"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DBUser:       getEnv("DB_USER", "admin"),
		DBPassword:   getEnv("DB_PASSWORD", "admin123"),
		DBName:       getEnv("DB_NAME", "pdf_summarizer"),
		DBSSLMode:    getEnv("DB_SSLMODE", "disable"),
		AIServiceURL: getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		MaxFileSize:  maxFileSize,
		UploadDir:    getEnv("UPLOAD_DIR", "./uploads"),
		RabbitMQURL:  getEnv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
