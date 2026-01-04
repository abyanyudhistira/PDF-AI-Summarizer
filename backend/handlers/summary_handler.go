package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// SummarizePDF handles PDF summarization by calling Python AI service
func SummarizePDF(c *fiber.Ctx) error {
	// Get PDF ID from params
	pdfID := c.Params("id")

	// Get request body
	type SummarizeRequest struct {
		Mode     string  `json:"mode"`     // simple, structured, multi, qa
		Language *string `json:"language"` // optional
		Pages    *string `json:"pages"`    // optional, e.g., "1-5, 7, 9"
		Question *string `json:"question"` // required for qa mode
	}

	var req SummarizeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Validate mode
	validModes := map[string]bool{
		"simple": true, "structured": true, "multi": true, "qa": true,
	}
	if !validModes[req.Mode] {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid mode. Must be: simple, structured, multi, or qa")
	}

	// For QA mode, question is required
	if req.Mode == "qa" && (req.Question == nil || *req.Question == "") {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Question is required for QA mode")
	}

	// Get PDF from database
	var pdf models.PDFFile
	if err := database.DB.First(&pdf, pdfID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "PDF not found")
	}

	// Start timing
	startTime := time.Now()

	// Call Python AI service
	result, err := callAIService(pdf.FilePath, req.Mode, req.Language, req.Pages, req.Question)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, fmt.Sprintf("AI service error: %s", err.Error()))
	}

	// Calculate processing time
	processingTime := time.Since(startTime).Seconds()

	// Save summary to database
	summary := models.Summary{
		PDFFileID:      pdf.ID,
		Mode:           models.SummaryMode(req.Mode),
		Language:       getLanguage(req.Language),
		PagesProcessed: req.Pages,
		ProcessingTime: processingTime,
	}

	// Map result based on mode
	switch req.Mode {
	case "simple":
		if summaryText, ok := result["summary"].(string); ok {
			summary.SummaryText = &summaryText
		}
	case "structured":
		if execSummary, ok := result["executive_summary"].(string); ok {
			summary.ExecutiveSummary = &execSummary
		}
		if bullets, ok := result["bullets"].([]interface{}); ok {
			bulletsJSON, _ := json.Marshal(bullets)
			bulletsStr := string(bulletsJSON)
			summary.Bullets = &bulletsStr
		}
		if highlights, ok := result["highlights"].([]interface{}); ok {
			highlightsJSON, _ := json.Marshal(highlights)
			highlightsStr := string(highlightsJSON)
			summary.Highlights = &highlightsStr
		}
	case "multi":
		if combinedSummary, ok := result["combined_summary"].(string); ok {
			summary.SummaryText = &combinedSummary
		}
		if execSummary, ok := result["executive_summary"].(string); ok {
			summary.ExecutiveSummary = &execSummary
		}
	case "qa":
		if answer, ok := result["answer"].(string); ok {
			summary.QAAnswer = &answer
		}
		summary.QAQuestion = req.Question
	}

	// Save to database
	if err := database.DB.Create(&summary).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to save summary")
	}

	// Prepare response
	response := models.SummaryResponse{
		ID:               summary.ID,
		PDFFileID:        summary.PDFFileID,
		Mode:             summary.Mode,
		Language:         summary.Language,
		PagesProcessed:   summary.PagesProcessed,
		SummaryText:      summary.SummaryText,
		ExecutiveSummary: summary.ExecutiveSummary,
		Bullets:          summary.Bullets,
		Highlights:       summary.Highlights,
		QAQuestion:       summary.QAQuestion,
		QAAnswer:         summary.QAAnswer,
		ProcessingTime:   summary.ProcessingTime,
		CreatedAt:        summary.CreatedAt,
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Summary created successfully", response)
}

// callAIService sends PDF to Python AI service and returns the result
func callAIService(filePath, mode string, language, pages, question *string) (map[string]interface{}, error) {
	// Determine endpoint based on mode
	endpoint := ""
	switch mode {
	case "simple":
		endpoint = "/summarize"
	case "structured":
		endpoint = "/summarize-structured"
	case "multi":
		endpoint = "/summarize-multi"
	case "qa":
		endpoint = "/qa"
	}

	url := config.AppConfig.AIServiceURL + endpoint

	// Open PDF file
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF file: %w", err)
	}
	defer file.Close()

	// Create multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add file
	part, err := writer.CreateFormFile("files", filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := io.Copy(part, file); err != nil {
		return nil, fmt.Errorf("failed to copy file: %w", err)
	}

	// Add optional fields
	if language != nil && *language != "" {
		writer.WriteField("language", *language)
	}
	if pages != nil && *pages != "" {
		writer.WriteField("pages", *pages)
	}
	if question != nil && *question != "" {
		writer.WriteField("question", *question)
	}

	writer.Close()

	// Create request
	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Send request
	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI service returned error: %s", string(respBody))
	}

	// Parse response
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return result, nil
}

// getLanguage returns language string, defaults to "english"
func getLanguage(lang *string) string {
	if lang != nil && *lang != "" {
		return strings.ToLower(*lang)
	}
	return "english"
}

// ListSummaries returns list of summaries for a specific PDF
func ListSummaries(c *fiber.Ctx) error {
	pdfID := c.Params("id")

	var summaries []models.Summary
	if err := database.DB.Where("pdf_file_id = ?", pdfID).Order("created_at DESC").Find(&summaries).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch summaries")
	}

	var responses []models.SummaryResponse
	for _, summary := range summaries {
		responses = append(responses, models.SummaryResponse{
			ID:               summary.ID,
			PDFFileID:        summary.PDFFileID,
			Mode:             summary.Mode,
			Language:         summary.Language,
			PagesProcessed:   summary.PagesProcessed,
			SummaryText:      summary.SummaryText,
			ExecutiveSummary: summary.ExecutiveSummary,
			Bullets:          summary.Bullets,
			Highlights:       summary.Highlights,
			QAQuestion:       summary.QAQuestion,
			QAAnswer:         summary.QAAnswer,
			ProcessingTime:   summary.ProcessingTime,
			CreatedAt:        summary.CreatedAt,
		})
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Summaries fetched successfully", responses)
}

// GetSummary returns a specific summary
func GetSummary(c *fiber.Ctx) error {
	summaryID := c.Params("summaryId")

	var summary models.Summary
	if err := database.DB.Preload("PDFFile").First(&summary, summaryID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Summary not found")
	}

	response := models.SummaryResponse{
		ID:               summary.ID,
		PDFFileID:        summary.PDFFileID,
		Mode:             summary.Mode,
		Language:         summary.Language,
		PagesProcessed:   summary.PagesProcessed,
		SummaryText:      summary.SummaryText,
		ExecutiveSummary: summary.ExecutiveSummary,
		Bullets:          summary.Bullets,
		Highlights:       summary.Highlights,
		QAQuestion:       summary.QAQuestion,
		QAAnswer:         summary.QAAnswer,
		ProcessingTime:   summary.ProcessingTime,
		CreatedAt:        summary.CreatedAt,
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Summary fetched successfully", response)
}

// DeleteSummary deletes a specific summary
func DeleteSummary(c *fiber.Ctx) error {
	summaryID := c.Params("summaryId")

	var summary models.Summary
	if err := database.DB.First(&summary, summaryID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Summary not found")
	}

	if err := database.DB.Delete(&summary).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete summary")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Summary deleted successfully", nil)
}

// GetAllSummaries returns all summaries with pagination
func GetAllSummaries(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset := (page - 1) * limit

	var summaries []models.Summary
	if err := database.DB.Preload("PDFFile").Order("created_at DESC").Offset(offset).Limit(limit).Find(&summaries).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch summaries")
	}

	var responses []models.SummaryResponse
	for _, summary := range summaries {
		responses = append(responses, models.SummaryResponse{
			ID:               summary.ID,
			PDFFileID:        summary.PDFFileID,
			Mode:             summary.Mode,
			Language:         summary.Language,
			PagesProcessed:   summary.PagesProcessed,
			SummaryText:      summary.SummaryText,
			ExecutiveSummary: summary.ExecutiveSummary,
			Bullets:          summary.Bullets,
			Highlights:       summary.Highlights,
			QAQuestion:       summary.QAQuestion,
			QAAnswer:         summary.QAAnswer,
			ProcessingTime:   summary.ProcessingTime,
			CreatedAt:        summary.CreatedAt,
		})
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Summaries fetched successfully", responses)
}
