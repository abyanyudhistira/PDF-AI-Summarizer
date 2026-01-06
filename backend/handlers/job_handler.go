package handlers

import (
	"fmt"
	"log"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/queue"
	"pdf-summarizer-backend/utils"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// CreateSummarizationJob creates a new job in queue (async)
func CreateSummarizationJob(c *fiber.Ctx) error {
	// Get PDF ID from params
	pdfID := c.Params("id")

	// Get request body
	type JobRequest struct {
		Mode     string  `json:"mode"`     // simple, structured, multi, qa
		Language *string `json:"language"` // optional
		Pages    *string `json:"pages"`    // optional
		Question *string `json:"question"` // required for qa mode
	}

	var req JobRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Validate mode
	validModes := map[string]bool{
		"simple": true, "structured": true, "multi": true, "qa": true,
	}
	if !validModes[req.Mode] {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid mode")
	}

	// For QA mode, question is required
	if req.Mode == "qa" && (req.Question == nil || *req.Question == "") {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Question is required for QA mode")
	}

	// Check if PDF exists
	var pdf models.PDFFile
	if err := database.DB.First(&pdf, pdfID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "PDF not found")
	}

	// Get language
	language := "english"
	if req.Language != nil && *req.Language != "" {
		language = *req.Language
	}

	// Create job
	job := models.SummarizationJob{
		PDFFileID:  pdf.ID,
		Status:     models.JobStatusPending,
		Mode:       models.SummaryMode(req.Mode),
		Language:   language,
		Pages:      req.Pages,
		Question:   req.Question,
		MaxRetries: 3,
	}

	if err := database.DB.Create(&job).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create job")
	}

	// Publish job to RabbitMQ queue
	if err := queue.PublishJob(job.ID); err != nil {
		log.Printf("Failed to publish job to queue: %v", err)
		// Job is created but not queued - can be retried manually
	}

	// Return job info
	response := models.JobResponse{
		ID:          job.ID,
		PDFFileID:   job.PDFFileID,
		Status:      job.Status,
		Mode:        job.Mode,
		Language:    job.Language,
		Pages:       job.Pages,
		Question:    job.Question,
		RetryCount:  job.RetryCount,
		MaxRetries:  job.MaxRetries,
		CreatedAt:   job.CreatedAt,
		PDFFilename: pdf.OriginalFilename,
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Job created successfully. Processing will start shortly.", response)
}

// GetJob returns job status
func GetJob(c *fiber.Ctx) error {
	jobID := c.Params("jobId")

	var job models.SummarizationJob
	if err := database.DB.Preload("PDFFile").Preload("SummaryLog").First(&job, jobID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Job not found")
	}

	response := models.JobResponse{
		ID:           job.ID,
		PDFFileID:    job.PDFFileID,
		Status:       job.Status,
		Mode:         job.Mode,
		Language:     job.Language,
		Pages:        job.Pages,
		Question:     job.Question,
		RetryCount:   job.RetryCount,
		MaxRetries:   job.MaxRetries,
		ErrorMsg:     job.ErrorMsg,
		SummaryLogID: job.SummaryLogID,
		StartedAt:    job.StartedAt,
		CompletedAt:  job.CompletedAt,
		CreatedAt:    job.CreatedAt,
		PDFFilename:  job.PDFFile.OriginalFilename,
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Job fetched successfully", response)
}

// ListJobs returns all jobs with filters
func ListJobs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset := (page - 1) * limit

	status := c.Query("status") // pending, processing, completed, failed
	pdfID := c.Query("pdf_id")

	query := database.DB.Preload("PDFFile")

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if pdfID != "" {
		query = query.Where("pdf_file_id = ?", pdfID)
	}

	var jobs []models.SummarizationJob
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&jobs).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch jobs")
	}

	var responses []models.JobResponse
	for _, job := range jobs {
		responses = append(responses, models.JobResponse{
			ID:           job.ID,
			PDFFileID:    job.PDFFileID,
			Status:       job.Status,
			Mode:         job.Mode,
			Language:     job.Language,
			Pages:        job.Pages,
			Question:     job.Question,
			RetryCount:   job.RetryCount,
			MaxRetries:   job.MaxRetries,
			ErrorMsg:     job.ErrorMsg,
			SummaryLogID: job.SummaryLogID,
			StartedAt:    job.StartedAt,
			CompletedAt:  job.CompletedAt,
			CreatedAt:    job.CreatedAt,
			PDFFilename:  job.PDFFile.OriginalFilename,
		})
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Jobs fetched successfully", responses)
}

// RetryJob manually retry a failed job
func RetryJob(c *fiber.Ctx) error {
	jobID := c.Params("jobId")

	var job models.SummarizationJob
	if err := database.DB.First(&job, jobID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Job not found")
	}

	// Only retry failed jobs
	if job.Status != models.JobStatusFailed {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Only failed jobs can be retried")
	}

	// Reset job status
	job.Status = models.JobStatusPending
	job.ErrorMsg = nil
	job.StartedAt = nil

	if err := database.DB.Save(&job).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retry job")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Job queued for retry", nil)
}

// DeleteJob deletes a job
func DeleteJob(c *fiber.Ctx) error {
	jobID := c.Params("jobId")

	var job models.SummarizationJob
	if err := database.DB.First(&job, jobID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Job not found")
	}

	// Don't delete processing jobs
	if job.Status == models.JobStatusProcessing {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Cannot delete processing job")
	}

	if err := database.DB.Delete(&job).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete job")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Job deleted successfully", nil)
}

// ProcessJob processes a single job (called by worker)
func ProcessJob(jobID uint) error {
	var job models.SummarizationJob
	if err := database.DB.Preload("PDFFile").First(&job, jobID).Error; err != nil {
		return err
	}

	// Update status to processing
	now := time.Now()
	job.Status = models.JobStatusProcessing
	job.StartedAt = &now
	database.DB.Save(&job)

	// Call AI service (reuse existing logic from summary_handler.go)
	startTime := time.Now()
	result, err := callAIService(
		job.PDFFile.FilePath,
		string(job.Mode),
		&job.Language,
		job.Pages,
		job.Question,
	)

	if err != nil {
		// Handle error - retry or mark as failed
		job.RetryCount++
		errMsg := err.Error()
		job.ErrorMsg = &errMsg

		if job.RetryCount >= job.MaxRetries {
			job.Status = models.JobStatusFailed
			completedAt := time.Now()
			job.CompletedAt = &completedAt
		} else {
			// Reset to pending for retry
			job.Status = models.JobStatusPending
			job.StartedAt = nil
		}

		database.DB.Save(&job)
		return err
	}

	// Save summary to database
	processingTime := time.Since(startTime).Seconds()

	summaryLog := models.SummaryLog{
		PDFFileID:      job.PDFFileID,
		Mode:           job.Mode,
		Language:       job.Language,
		PagesProcessed: job.Pages,
		ProcessingTime: processingTime,
	}

	// Map result based on mode
	switch string(job.Mode) {
	case "simple":
		if summaryText, ok := result["summary"].(string); ok {
			summaryLog.SummaryText = &summaryText
		}
	case "structured":
		if execSummary, ok := result["executive_summary"].(string); ok {
			summaryLog.ExecutiveSummary = &execSummary
		}
		if bullets, ok := result["bullets"].([]interface{}); ok {
			bulletsJSON := fmt.Sprintf("%v", bullets)
			summaryLog.Bullets = &bulletsJSON
		}
		if highlights, ok := result["highlights"].([]interface{}); ok {
			highlightsJSON := fmt.Sprintf("%v", highlights)
			summaryLog.Highlights = &highlightsJSON
		}
	case "qa":
		if answer, ok := result["answer"].(string); ok {
			summaryLog.QAAnswer = &answer
		}
		summaryLog.QAQuestion = job.Question
	}

	// Save summary
	if err := database.DB.Create(&summaryLog).Error; err != nil {
		errMsg := fmt.Sprintf("Failed to save summary: %s", err.Error())
		job.ErrorMsg = &errMsg
		job.Status = models.JobStatusFailed
		database.DB.Save(&job)
		return err
	}

	// Update job as completed
	completedAt := time.Now()
	job.Status = models.JobStatusCompleted
	job.CompletedAt = &completedAt
	job.SummaryLogID = &summaryLog.ID
	database.DB.Save(&job)
	
	return nil
}
