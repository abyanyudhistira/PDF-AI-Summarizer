package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	DBHost          string
	DBPort          string
	DBUser          string
	DBPassword      string
	DBName          string
	DBSSLMode       string
	AIServiceURL    string
	AITimeout       int64  // AI service timeout in seconds
	MaxFileSize     int64
	UploadDir       string
	RabbitMQURL     string
	MinioEndpoint   string
	MinioAccessKey  string
	MinioSecretKey  string
	MinioBucket     string
	MinioUseSSL     bool
}

var AppConfig *Config

func LoadConfig() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	maxFileSize, _ := strconv.ParseInt(getEnv("MAX_FILE_SIZE", "10485760"), 10, 64)
	minioUseSSL, _ := strconv.ParseBool(getEnv("MINIO_USE_SSL", "false"))
	aiTimeout, _ := strconv.ParseInt(getEnv("AI_TIMEOUT", "600"), 10, 64) // Default 10 minutes

	AppConfig = &Config{
		Port:           getEnv("PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "admin"),
		DBPassword:     getEnv("DB_PASSWORD", "admin123"),
		DBName:         getEnv("DB_NAME", "pdf_summarizer"),
		DBSSLMode:      getEnv("DB_SSLMODE", "disable"),
		AIServiceURL:   getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		AITimeout:      aiTimeout,
		MaxFileSize:    maxFileSize,
		UploadDir:      getEnv("UPLOAD_DIR", "./uploads"),
		RabbitMQURL:    getEnv("RABBITMQ_URL", "amqp://admin:admin123@localhost:5672/"),
		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", "admin"),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", "admin123"),
		MinioBucket:    getEnv("MINIO_BUCKET", "pdf-files"),
		MinioUseSSL:    minioUseSSL,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
