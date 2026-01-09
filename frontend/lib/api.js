/**
 * API Client for PDF Summarizer
 * Handles all backend API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const api = {
  async getPDFs() {
    const response = await fetch(`${API_URL}/api/pdfs`);
    if (!response.ok) throw new Error("Failed to fetch PDFs");
    return response.json();
  },

  async uploadPDF(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_URL}/api/pdfs/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }
    return response.json();
  },

  async deletePDF(id) {
    const response = await fetch(`${API_URL}/api/pdfs/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete PDF");
    return response.json();
  },

  async getSummaries(pdfId) {
    const response = await fetch(`${API_URL}/api/pdfs/${pdfId}/summaries`);
    if (!response.ok) throw new Error("Failed to fetch summaries");
    return response.json();
  },

  async deleteSummary(summaryId) {
    const response = await fetch(`${API_URL}/api/summaries/${summaryId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete summary");
    return response.json();
  },

  async summarizePDF(pdfId, options) {
    const response = await fetch(`${API_URL}/api/pdfs/${pdfId}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create summarization job");
    }
    return response.json();
  },

  async getJobStatus(jobId) {
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`);
    if (!response.ok) throw new Error("Failed to fetch job status");
    return response.json();
  },

  async getCheckpoint(jobId) {
    const response = await fetch(
      `${API_URL}/api/test/jobs/${jobId}/checkpoint`
    );
    if (!response.ok) throw new Error("Failed to fetch checkpoint");
    return response.json();
  },

  async getPDFCheckpoint(pdfId) {
    const response = await fetch(
      `${API_URL}/api/test/pdfs/${pdfId}/checkpoint`
    );
    if (!response.ok) throw new Error("Failed to fetch PDF checkpoint");
    return response.json();
  },

  async getSummary(summaryId) {
    const response = await fetch(`${API_URL}/api/summaries/${summaryId}`);
    if (!response.ok) throw new Error("Failed to fetch summary");
    return response.json();
  },

  async listJobs(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/api/jobs?${params}`);
    if (!response.ok) throw new Error("Failed to fetch jobs");
    return response.json();
  },

  async retryJob(jobId) {
    const response = await fetch(`${API_URL}/api/jobs/${jobId}/retry`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to retry job");
    return response.json();
  },

  async deleteJob(jobId) {
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete job");
    return response.json();
  },

  async getPDFStats() {
    const response = await fetch(`${API_URL}/api/pdfs/stats/count`);
    if (!response.ok) throw new Error("Failed to fetch PDF stats");
    return response.json();
  },

  async getAuditStats() {
    const response = await fetch(`${API_URL}/api/audit/stats`);
    if (!response.ok) throw new Error("Failed to fetch audit stats");
    return response.json();
  },

  async getPDFDetail(id) {
    const response = await fetch(`${API_URL}/api/pdfs/${id}`);
    if (!response.ok) throw new Error("Failed to fetch PDF detail");
    return response.json();
  },

  async getAllSummaries(page = 1, limit = 50) {
    const response = await fetch(
      `${API_URL}/api/summaries?page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new Error("Failed to fetch all summaries");
    return response.json();
  },

  async getAuditLogs(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/api/audit/logs?${params}`);
    if (!response.ok) throw new Error("Failed to fetch audit logs");
    return response.json();
  },

  async cleanupAuditLogs(days = 30) {
    const response = await fetch(
      `${API_URL}/api/audit/logs/cleanup?days=${days}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) throw new Error("Failed to cleanup audit logs");
    return response.json();
  },
};

export default api;
