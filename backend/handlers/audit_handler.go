package handlers

import (
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/utils"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// ListAuditLogs returns audit logs with filters
func ListAuditLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset := (page - 1) * limit

	action := c.Query("action")   // filter by action
	status := c.Query("status")   // filter by status
	resource := c.Query("resource") // filter by resource

	query := database.DB.Model(&models.AuditLog{})

	if action != "" {
		query = query.Where("action LIKE ?", "%"+action+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if resource != "" {
		query = query.Where("resource LIKE ?", "%"+resource+"%")
	}

	var logs []models.AuditLog
	var total int64

	query.Count(&total)

	if err := query.Order("timestamp DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch audit logs")
	}

	var responses []models.AuditLogResponse
	for _, log := range logs {
		responses = append(responses, models.AuditLogResponse{
			ID:        log.ID,
			Timestamp: log.Timestamp,
			Action:    log.Action,
			Resource:  log.Resource,
			Details:   log.Details,
			IPAddress: log.IPAddress,
			Status:    log.Status,
			Duration:  log.Duration,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    responses,
		"pagination": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetAuditStats returns audit statistics
func GetAuditStats(c *fiber.Ctx) error {
	var totalLogs int64
	var successLogs int64
	var failedLogs int64

	database.DB.Model(&models.AuditLog{}).Count(&totalLogs)
	database.DB.Model(&models.AuditLog{}).Where("status = ?", "success").Count(&successLogs)
	database.DB.Model(&models.AuditLog{}).Where("status = ?", "failed").Count(&failedLogs)

	// Get most common actions
	type ActionCount struct {
		Action string
		Count  int64
	}
	var topActions []ActionCount
	database.DB.Model(&models.AuditLog{}).
		Select("action, COUNT(*) as count").
		Group("action").
		Order("count DESC").
		Limit(10).
		Scan(&topActions)

	stats := fiber.Map{
		"total_logs":   totalLogs,
		"success_logs": successLogs,
		"failed_logs":  failedLogs,
		"top_actions":  topActions,
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Stats fetched successfully", stats)
}

// DeleteOldAuditLogs deletes logs older than specified days
func DeleteOldAuditLogs(c *fiber.Ctx) error {
	days, _ := strconv.Atoi(c.Query("days", "30"))

	result := database.DB.Where("timestamp < NOW() - INTERVAL '? days'", days).
		Delete(&models.AuditLog{})

	if result.Error != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete old logs")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Old logs deleted successfully", fiber.Map{
		"deleted_count": result.RowsAffected,
	})
}
