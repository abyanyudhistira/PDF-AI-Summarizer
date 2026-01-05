package handlers

import (
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetMonitoringStats returns comprehensive monitoring statistics
func GetMonitoringStats(c *fiber.Ctx) error {
	var stats models.MonitoringStats

	// Get total counts
	database.DB.Model(&models.RequestLog{}).Count(&stats.TotalRequests)
	database.DB.Model(&models.PDFFile{}).Count(&stats.TotalPDFs)
	database.DB.Model(&models.Summary{}).Count(&stats.TotalSummaries)
	database.DB.Model(&models.ErrorLog{}).Count(&stats.TotalErrors)

	// Get average response time
	database.DB.Model(&models.RequestLog{}).
		Select("AVG(response_time)").
		Scan(&stats.AvgResponseTime)

	// Get average processing time
	database.DB.Model(&models.Summary{}).
		Select("AVG(processing_time)").
		Scan(&stats.AvgProcessingTime)

	// Get total storage used
	database.DB.Model(&models.PDFFile{}).
		Select("SUM(file_size)").
		Scan(&stats.TotalStorageUsed)

	// Get today's stats
	today := time.Now().Truncate(24 * time.Hour)
	database.DB.Model(&models.RequestLog{}).
		Where("created_at >= ?", today).
		Count(&stats.RequestsToday)

	database.DB.Model(&models.PDFFile{}).
		Where("upload_date >= ?", today).
		Count(&stats.PDFsToday)

	database.DB.Model(&models.Summary{}).
		Where("created_at >= ?", today).
		Count(&stats.SummariesToday)

	database.DB.Model(&models.ErrorLog{}).
		Where("created_at >= ?", today).
		Count(&stats.ErrorsToday)

	// Get top endpoints
	var topEndpoints []models.EndpointStat
	database.DB.Model(&models.RequestLog{}).
		Select("path as endpoint, COUNT(*) as request_count, AVG(response_time) as avg_time").
		Group("path").
		Order("request_count DESC").
		Limit(10).
		Scan(&topEndpoints)
	stats.TopEndpoints = topEndpoints

	// Get recent errors
	var recentErrors []models.ErrorLog
	database.DB.Order("created_at DESC").
		Limit(10).
		Find(&recentErrors)
	stats.RecentErrors = recentErrors

	return utils.SuccessResponse(c, fiber.StatusOK, "Monitoring stats fetched successfully", stats)
}

// GetRequestLogs returns paginated request logs
func GetRequestLogs(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	offset := (page - 1) * limit

	var logs []models.RequestLog
	var total int64

	query := database.DB.Model(&models.RequestLog{})

	// Filter by method
	if method := c.Query("method"); method != "" {
		query = query.Where("method = ?", method)
	}

	// Filter by status code
	if statusCode := c.QueryInt("status_code", 0); statusCode > 0 {
		query = query.Where("status_code = ?", statusCode)
	}

	// Filter by date range
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	query.Count(&total)
	query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs)

	return utils.SuccessResponse(c, fiber.StatusOK, "Request logs fetched successfully", fiber.Map{
		"logs":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetErrorLogs returns paginated error logs
func GetErrorLogs(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	offset := (page - 1) * limit

	var logs []models.ErrorLog
	var total int64

	query := database.DB.Model(&models.ErrorLog{})

	// Filter by error type
	if errorType := c.Query("error_type"); errorType != "" {
		query = query.Where("error_type = ?", errorType)
	}

	// Filter by date range
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}

	query.Count(&total)
	query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs)

	return utils.SuccessResponse(c, fiber.StatusOK, "Error logs fetched successfully", fiber.Map{
		"logs":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetSystemMetrics returns system performance metrics
func GetSystemMetrics(c *fiber.Ctx) error {
	period := c.Query("period", "24h") // 24h, 7d, 30d

	var duration time.Duration
	switch period {
	case "24h":
		duration = 24 * time.Hour
	case "7d":
		duration = 7 * 24 * time.Hour
	case "30d":
		duration = 30 * 24 * time.Hour
	default:
		duration = 24 * time.Hour
	}

	startTime := time.Now().Add(-duration)

	// Get metrics for the period
	var metrics []models.SystemMetric
	database.DB.Where("recorded_at >= ?", startTime).
		Order("recorded_at ASC").
		Find(&metrics)

	// If no metrics, calculate current metrics
	if len(metrics) == 0 {
		var metric models.SystemMetric
		database.DB.Model(&models.RequestLog{}).Count(&metric.TotalRequests)
		database.DB.Model(&models.PDFFile{}).Count(&metric.TotalPDFs)
		database.DB.Model(&models.Summary{}).Count(&metric.TotalSummaries)
		database.DB.Model(&models.ErrorLog{}).Count(&metric.TotalErrors)
		database.DB.Model(&models.RequestLog{}).Select("AVG(response_time)").Scan(&metric.AvgResponseTime)
		database.DB.Model(&models.Summary{}).Select("AVG(processing_time)").Scan(&metric.AvgProcessingTime)
		database.DB.Model(&models.PDFFile{}).Select("SUM(file_size)").Scan(&metric.TotalStorageUsed)
		metric.RecordedAt = time.Now()

		metrics = append(metrics, metric)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "System metrics fetched successfully", metrics)
}

// ClearOldLogs clears logs older than specified days
func ClearOldLogs(c *fiber.Ctx) error {
	days := c.QueryInt("days", 30)
	cutoffDate := time.Now().AddDate(0, 0, -days)

	// Delete old request logs
	var deletedRequests int64
	database.DB.Where("created_at < ?", cutoffDate).
		Delete(&models.RequestLog{}).
		Count(&deletedRequests)

	// Delete old error logs
	var deletedErrors int64
	database.DB.Where("created_at < ?", cutoffDate).
		Delete(&models.ErrorLog{}).
		Count(&deletedErrors)

	return utils.SuccessResponse(c, fiber.StatusOK, "Old logs cleared successfully", fiber.Map{
		"deleted_requests": deletedRequests,
		"deleted_errors":   deletedErrors,
		"cutoff_date":      cutoffDate,
	})
}

// RecordSystemMetric manually records current system metrics
func RecordSystemMetric(c *fiber.Ctx) error {
	var metric models.SystemMetric

	database.DB.Model(&models.RequestLog{}).Count(&metric.TotalRequests)
	database.DB.Model(&models.PDFFile{}).Count(&metric.TotalPDFs)
	database.DB.Model(&models.Summary{}).Count(&metric.TotalSummaries)
	database.DB.Model(&models.ErrorLog{}).Count(&metric.TotalErrors)
	database.DB.Model(&models.RequestLog{}).Select("AVG(response_time)").Scan(&metric.AvgResponseTime)
	database.DB.Model(&models.Summary{}).Select("AVG(processing_time)").Scan(&metric.AvgProcessingTime)
	database.DB.Model(&models.PDFFile{}).Select("SUM(file_size)").Scan(&metric.TotalStorageUsed)
	metric.RecordedAt = time.Now()

	if err := database.DB.Create(&metric).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to record metric")
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "System metric recorded successfully", metric)
}
