package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"pdf-summarizer-backend/database"
	"pdf-summarizer-backend/models"
	"strings"
	"time"
)

// CheckpointData stores partial processing results
type CheckpointData struct {
	ProcessedPages  []int                  `json:"processed_pages"`
	PartialResults  map[string]interface{} `json:"partial_results"`
	LastPage        int                    `json:"last_page"`
	ProcessedChunks int                    `json:"processed_chunks"` // Number of chunks processed
	TotalChunks     int                    `json:"total_chunks"`     // Total chunks in document
	LastChunk       int                    `json:"last_chunk"`       // Last chunk processed
}

// SaveCheckpoint saves job progress to database
func SaveCheckpoint(job *models.SummarizationJob, lastPage int, partialResult map[string]interface{}) error {
	// Load existing checkpoint
	var checkpoint CheckpointData
	if job.PartialResult != nil && *job.PartialResult != "" {
		if err := json.Unmarshal([]byte(*job.PartialResult), &checkpoint); err != nil {
			log.Printf("⚠️  Failed to parse existing checkpoint: %v", err)
			checkpoint = CheckpointData{
				ProcessedPages: []int{},
				PartialResults: make(map[string]interface{}),
			}
		}
	} else {
		checkpoint = CheckpointData{
			ProcessedPages: []int{},
			PartialResults: make(map[string]interface{}),
		}
	}

	// Update checkpoint
	checkpoint.LastPage = lastPage
	checkpoint.ProcessedPages = append(checkpoint.ProcessedPages, lastPage)
	
	// Update chunk tracking if provided
	if chunkInfo, ok := partialResult["_chunk_info"].(map[string]interface{}); ok {
		if processedChunks, ok := chunkInfo["processed_chunks"].(int); ok {
			checkpoint.ProcessedChunks = processedChunks
		}
		if totalChunks, ok := chunkInfo["total_chunks"].(int); ok {
			checkpoint.TotalChunks = totalChunks
		}
		if lastChunk, ok := chunkInfo["last_chunk"].(int); ok {
			checkpoint.LastChunk = lastChunk
		}
		// Remove chunk info from partial results (internal use only)
		delete(partialResult, "_chunk_info")
	}
	
	// Merge partial results
	for key, value := range partialResult {
		if existing, ok := checkpoint.PartialResults[key]; ok {
			// Append to existing result
			switch v := existing.(type) {
			case string:
				checkpoint.PartialResults[key] = v + "\n\n" + fmt.Sprintf("%v", value)
			case []interface{}:
				if newList, ok := value.([]interface{}); ok {
					checkpoint.PartialResults[key] = append(v, newList...)
				}
			default:
				checkpoint.PartialResults[key] = value
			}
		} else {
			checkpoint.PartialResults[key] = value
		}
	}

	// Save to database
	checkpointJSON, err := json.Marshal(checkpoint)
	if err != nil {
		return fmt.Errorf("failed to marshal checkpoint: %v", err)
	}

	checkpointStr := string(checkpointJSON)
	job.PartialResult = &checkpointStr
	job.LastProcessedPage = &lastPage

	if err := database.DB.Save(job).Error; err != nil {
		return fmt.Errorf("failed to save checkpoint: %v", err)
	}

	if checkpoint.TotalChunks > 0 {
		log.Printf("💾 Checkpoint saved: Job %d, Page %d, Chunk %d/%d", 
			job.ID, lastPage, checkpoint.ProcessedChunks, checkpoint.TotalChunks)
	} else {
		log.Printf("💾 Checkpoint saved: Job %d, Page %d", job.ID, lastPage)
	}
	return nil
}

// LoadCheckpoint loads existing checkpoint from database
func LoadCheckpoint(job *models.SummarizationJob) (*CheckpointData, error) {
	if job.PartialResult == nil || *job.PartialResult == "" {
		return &CheckpointData{
			ProcessedPages:  []int{},
			PartialResults:  make(map[string]interface{}),
			LastPage:        0,
			ProcessedChunks: 0,
			TotalChunks:     0,
			LastChunk:       0,
		}, nil
	}

	var checkpoint CheckpointData
	if err := json.Unmarshal([]byte(*job.PartialResult), &checkpoint); err != nil {
		return nil, fmt.Errorf("failed to parse checkpoint: %v", err)
	}

	if checkpoint.TotalChunks > 0 {
		log.Printf("Checkpoint loaded: Job %d, Last page %d, Chunk %d/%d", 
			job.ID, checkpoint.LastPage, checkpoint.ProcessedChunks, checkpoint.TotalChunks)
	} else {
		log.Printf("Checkpoint loaded: Job %d, Last page %d", job.ID, checkpoint.LastPage)
	}
	return &checkpoint, nil
}

// ClearCheckpoint clears checkpoint data (after successful completion)
func ClearCheckpoint(job *models.SummarizationJob) error {
	job.PartialResult = nil
	job.LastProcessedPage = nil
	
	if err := database.DB.Save(job).Error; err != nil {
		return fmt.Errorf("failed to clear checkpoint: %v", err)
	}

	log.Printf("Checkpoint cleared: Job %d", job.ID)
	return nil
}

// ProcessJobWithCheckpoint processes job with checkpoint/resume capability
func ProcessJobWithCheckpoint(jobID uint) error {
	var job models.SummarizationJob
	if err := database.DB.Preload("PDFFile").First(&job, jobID).Error; err != nil {
		return err
	}

	// Load checkpoint
	checkpoint, err := LoadCheckpoint(&job)
	if err != nil {
		log.Printf("Failed to load checkpoint: %v, starting fresh", err)
		checkpoint = &CheckpointData{
			ProcessedPages: []int{},
			PartialResults: make(map[string]interface{}),
			LastPage:       0,
		}
	}

	// Check if resuming
	isResume := checkpoint.LastPage > 0
	if isResume {
		if checkpoint.TotalChunks > 0 {
			log.Printf("Resuming job %d from page %d, chunk %d/%d", 
				job.ID, checkpoint.LastPage, checkpoint.ProcessedChunks, checkpoint.TotalChunks)
		} else {
			log.Printf("Resuming job %d from page %d", job.ID, checkpoint.LastPage)
		}
	}

	// Update status to processing
	now := time.Now()
	job.Status = models.JobStatusProcessing
	job.StartedAt = &now
	database.DB.Save(&job)

	// For simple implementation, we process the whole PDF
	// In production, you might want to split by page ranges
	startTime := time.Now()
	
	result, err := callAIService(
		job.PDFFile.FilePath,
		string(job.Mode),
		&job.Language,
		job.Pages,
		job.Question,
	)

	if err != nil {
		// Save checkpoint before failing
		if checkpoint.LastPage > 0 {
			// We have partial progress, save it
			SaveCheckpoint(&job, checkpoint.LastPage, checkpoint.PartialResults)
		}

		// Check if error is permanent (no point retrying)
		isPermanentError := false
		errMsg := err.Error()
		
		// Permanent errors that should not be retried
		permanentErrors := []string{
			"specified key does not exist",  // MinIO file not found
			"file not found",
			"invalid file format",
			"file too large",
			"could not extract text",        // PDF extraction error
			"corrupted",
			"encrypted",
		}
		
		for _, permErr := range permanentErrors {
			if strings.Contains(strings.ToLower(errMsg), permErr) {
				isPermanentError = true
				log.Printf("Permanent error detected for job %d: %s", job.ID, permErr)
				break
			}
		}

		// Increment retry count
		job.RetryCount++
		job.ErrorMsg = &errMsg

		// Mark as failed if:
		// 1. Permanent error (no retry)
		// 2. Max retries reached
		if isPermanentError || job.RetryCount >= job.MaxRetries {
			job.Status = models.JobStatusFailed
			completedAt := time.Now()
			job.CompletedAt = &completedAt
			
			if isPermanentError {
				log.Printf("Job %d failed permanently: %s", job.ID, errMsg)
			} else {
				log.Printf("Job %d failed after %d retries. Checkpoint saved at page %d", 
					job.ID, job.MaxRetries, checkpoint.LastPage)
			}
		} else {
			// Reset to pending for retry
			job.Status = models.JobStatusPending
			job.StartedAt = nil
			log.Printf("Job %d will retry (attempt %d/%d). Will resume from page %d", 
				job.ID, job.RetryCount+1, job.MaxRetries, checkpoint.LastPage)
		}

		database.DB.Save(&job)
		return err
	}

	// Merge with checkpoint results if resuming
	if isResume && len(checkpoint.PartialResults) > 0 {
		log.Printf("Merging checkpoint results with new results")
		for key, value := range checkpoint.PartialResults {
			if _, exists := result[key]; !exists {
				result[key] = value
			}
		}
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
			bulletsJSON, _ := json.Marshal(bullets)
			bulletsStr := string(bulletsJSON)
			summaryLog.Bullets = &bulletsStr
		}
		if highlights, ok := result["highlights"].([]interface{}); ok {
			highlightsJSON, _ := json.Marshal(highlights)
			highlightsStr := string(highlightsJSON)
			summaryLog.Highlights = &highlightsStr
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

	// Clear checkpoint and mark as completed
	ClearCheckpoint(&job)
	
	completedAt := time.Now()
	job.Status = models.JobStatusCompleted
	job.CompletedAt = &completedAt
	job.SummaryLogID = &summaryLog.ID
	database.DB.Save(&job)

	log.Printf("Job %d completed successfully", job.ID)
	return nil
}
