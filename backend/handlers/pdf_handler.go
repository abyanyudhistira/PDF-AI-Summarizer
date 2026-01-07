package handlers

import (
	"log"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/storage"
	"pdf-summarizer-backend/utils"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// UploadPDF handles PDF file upload to MinIO
func UploadPDF(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "No file uploaded")
	}

	// Validate file
	if err := utils.ValidateFile(file, config.AppConfig.MaxFileSize); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	// Generate unique filename
	uniqueFilename := utils.GenerateUniqueFilename(file.Filename)

	// Upload to MinIO
	objectPath, err := storage.UploadFile(file, uniqueFilename)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to upload file to storage")
	}

	// Extract PDF metadata (total pages) - simplified version
	var totalPages *int

	// Create database record
	pdfFile := models.PDFFile{
		Filename:         uniqueFilename,
		OriginalFilename: file.Filename,
		FilePath:         objectPath, // MinIO path: bucket/filename
		FileSize:         file.Size,
		TotalPages:       totalPages,
	}

	if err := database.DB.Create(&pdfFile).Error; err != nil {
		// Clean up MinIO file if database operation fails
		storage.DeleteFile(uniqueFilename)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to save file metadata")
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "File uploaded successfully", pdfFile)
}

// ListPDFs returns list of all uploaded PDFs
func ListPDFs(c *fiber.Ctx) error {
	var pdfs []models.PDFFile
	
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	offset := (page - 1) * limit

	if err := database.DB.Order("upload_date DESC").Offset(offset).Limit(limit).Find(&pdfs).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch PDFs")
	}

	// Add summary count for each PDF
	var responses []models.PDFFileResponse
	for _, pdf := range pdfs {
		var summaryCount int64
		database.DB.Model(&models.SummaryLog{}).Where("pdf_file_id = ?", pdf.ID).Count(&summaryCount)

		responses = append(responses, models.PDFFileResponse{
			ID:               pdf.ID,
			OriginalFilename: pdf.OriginalFilename,
			FileSize:         pdf.FileSize,
			FileSizeMB:       utils.GetFileSizeMB(pdf.FileSize),
			TotalPages:       pdf.TotalPages,
			UploadDate:       pdf.UploadDate,
			UploadedAt:       pdf.UploadDate,
			Mode:             pdf.Mode,
			Language:         pdf.Language,
			PagesProcessed:   pdf.PagesProcessed,
			SummaryText:      pdf.SummaryText,
			ExecutiveSummary: pdf.ExecutiveSummary,
			Bullets:          pdf.Bullets,
			Highlights:       pdf.Highlights,
			QAQuestion:       pdf.QAQuestion,
			QAAnswer:         pdf.QAAnswer,
			ProcessingTime:   pdf.ProcessingTime,
			LastSummarizedAt: pdf.LastSummarizedAt,
			SummaryCount:     summaryCount,
		})
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "PDFs fetched successfully", responses)
}

// GetPDF returns details of a specific PDF
func GetPDF(c *fiber.Ctx) error {
	id := c.Params("id")
	
	var pdf models.PDFFile
	if err := database.DB.First(&pdf, id).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "PDF not found")
	}

	var summaryCount int64
	database.DB.Model(&models.SummaryLog{}).Where("pdf_file_id = ?", pdf.ID).Count(&summaryCount)

	response := models.PDFFileResponse{
		ID:               pdf.ID,
		OriginalFilename: pdf.OriginalFilename,
		FileSize:         pdf.FileSize,
		FileSizeMB:       utils.GetFileSizeMB(pdf.FileSize),
		TotalPages:       pdf.TotalPages,
		UploadDate:       pdf.UploadDate,
		UploadedAt:       pdf.UploadDate,
		Mode:             pdf.Mode,
		Language:         pdf.Language,
		PagesProcessed:   pdf.PagesProcessed,
		SummaryText:      pdf.SummaryText,
		ExecutiveSummary: pdf.ExecutiveSummary,
		Bullets:          pdf.Bullets,
		Highlights:       pdf.Highlights,
		QAQuestion:       pdf.QAQuestion,
		QAAnswer:         pdf.QAAnswer,
		ProcessingTime:   pdf.ProcessingTime,
		LastSummarizedAt: pdf.LastSummarizedAt,
		SummaryCount:     summaryCount,
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "PDF fetched successfully", response)
}

// DeletePDF deletes a PDF from MinIO and database
func DeletePDF(c *fiber.Ctx) error {
	id := c.Params("id")
	
	var pdf models.PDFFile
	if err := database.DB.First(&pdf, id).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "PDF not found")
	}

	// Extract filename from MinIO path (bucket/filename)
	parts := strings.Split(pdf.FilePath, "/")
	filename := parts[len(parts)-1]

	// Delete from MinIO
	if err := storage.DeleteFile(filename); err != nil {
		// Log error but continue with database deletion
		log.Printf("Failed to delete file from MinIO: %v", err)
	}

	// Delete database record (summaries will be deleted automatically due to cascade)
	if err := database.DB.Delete(&pdf).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete PDF")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "PDF deleted successfully", nil)
}

// GetPDFStats returns statistics about PDFs
func GetPDFStats(c *fiber.Ctx) error {
	var totalPDFs int64
	var totalSummaries int64

	database.DB.Model(&models.PDFFile{}).Count(&totalPDFs)
	database.DB.Model(&models.SummaryLog{}).Count(&totalSummaries)

	stats := fiber.Map{
		"total_pdfs":      totalPDFs,
		"total_summaries": totalSummaries,
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Stats fetched successfully", stats)
}
