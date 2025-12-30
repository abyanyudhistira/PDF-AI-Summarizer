package handlers

import (
	"net/http"
	"path/filepath"
	"pdf-summarizer-backend/config"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"pdf-summarizer-backend/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UploadPDF handles PDF file upload
func UploadPDF(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file uploaded")
		return
	}

	// Validate file
	if err := utils.ValidateFile(file, config.AppConfig.MaxFileSize); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Generate unique filename
	uniqueFilename := utils.GenerateUniqueFilename(file.Filename)
	filePath := filepath.Join(config.AppConfig.UploadDir, uniqueFilename)

	// Save file
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save file")
		return
	}

	// Extract PDF metadata (total pages) - simplified version
	// In production, you might want to use a PDF library to get actual page count
	var totalPages *int

	// Create database record
	pdfFile := models.PDFFile{
		Filename:         uniqueFilename,
		OriginalFilename: file.Filename,
		FilePath:         filePath,
		FileSize:         file.Size,
		TotalPages:       totalPages,
	}

	if err := database.DB.Create(&pdfFile).Error; err != nil {
		// Clean up file if database operation fails
		utils.DeleteFile(filePath)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save file metadata")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "File uploaded successfully", pdfFile)
}

// ListPDFs returns list of all uploaded PDFs
func ListPDFs(c *gin.Context) {
	var pdfs []models.PDFFile
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset := (page - 1) * limit

	if err := database.DB.Order("upload_date DESC").Offset(offset).Limit(limit).Find(&pdfs).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch PDFs")
		return
	}

	// Add summary count for each PDF
	var responses []models.PDFFileResponse
	for _, pdf := range pdfs {
		var summaryCount int64
		database.DB.Model(&models.Summary{}).Where("pdf_file_id = ?", pdf.ID).Count(&summaryCount)

		responses = append(responses, models.PDFFileResponse{
			ID:               pdf.ID,
			OriginalFilename: pdf.OriginalFilename,
			FileSize:         pdf.FileSize,
			FileSizeMB:       utils.GetFileSizeMB(pdf.FileSize),
			TotalPages:       pdf.TotalPages,
			UploadDate:       pdf.UploadDate,
			SummaryCount:     summaryCount,
		})
	}

	utils.SuccessResponse(c, http.StatusOK, "PDFs fetched successfully", responses)
}

// GetPDF returns details of a specific PDF
func GetPDF(c *gin.Context) {
	id := c.Param("id")
	
	var pdf models.PDFFile
	if err := database.DB.First(&pdf, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "PDF not found")
		return
	}

	var summaryCount int64
	database.DB.Model(&models.Summary{}).Where("pdf_file_id = ?", pdf.ID).Count(&summaryCount)

	response := models.PDFFileResponse{
		ID:               pdf.ID,
		OriginalFilename: pdf.OriginalFilename,
		FileSize:         pdf.FileSize,
		FileSizeMB:       utils.GetFileSizeMB(pdf.FileSize),
		TotalPages:       pdf.TotalPages,
		UploadDate:       pdf.UploadDate,
		SummaryCount:     summaryCount,
	}

	utils.SuccessResponse(c, http.StatusOK, "PDF fetched successfully", response)
}

// DeletePDF deletes a PDF and all its summaries
func DeletePDF(c *gin.Context) {
	id := c.Param("id")
	
	var pdf models.PDFFile
	if err := database.DB.First(&pdf, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "PDF not found")
		return
	}

	// Delete physical file
	utils.DeleteFile(pdf.FilePath)

	// Delete database record (summaries will be deleted automatically due to cascade)
	if err := database.DB.Delete(&pdf).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete PDF")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "PDF deleted successfully", nil)
}

// GetPDFStats returns statistics about PDFs
func GetPDFStats(c *gin.Context) {
	var totalPDFs int64
	var totalSummaries int64

	database.DB.Model(&models.PDFFile{}).Count(&totalPDFs)
	database.DB.Model(&models.Summary{}).Count(&totalSummaries)

	stats := gin.H{
		"total_pdfs":      totalPDFs,
		"total_summaries": totalSummaries,
	}

	utils.SuccessResponse(c, http.StatusOK, "Stats fetched successfully", stats)
}
