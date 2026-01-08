"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faBook,
  faUpload,
  faTrash,
  faSync,
  faEye,
  faCopy,
  faDownload,
  faArrowLeft,
  faPlus,
  faCloudUploadAlt,
  faFileAlt,
  faCalendar,
  faFileLines,
  faStar,
  faExclamationCircle,
  faSearch,
  faBell,
  faTimes,
  faCheckCircle,
  faInfoCircle,
  faFilter,
  faSortAmountDown,
} from "@fortawesome/free-solid-svg-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Utility function for safe date formatting
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString();
  } catch (error) {
    return "Invalid Date";
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString();
  } catch (error) {
    return "Invalid Date";
  }
};

// API Client
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
    // Use async endpoint (with RabbitMQ queue) - now default
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

  // ===== NEW APIs - Job Management =====
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

  // ===== NEW APIs - Statistics =====
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

  // ===== NEW APIs - PDF Detail =====
  async getPDFDetail(id) {
    const response = await fetch(`${API_URL}/api/pdfs/${id}`);
    if (!response.ok) throw new Error("Failed to fetch PDF detail");
    return response.json();
  },

  // ===== NEW APIs - All Summaries =====
  async getAllSummaries(page = 1, limit = 50) {
    const response = await fetch(
      `${API_URL}/api/summaries?page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new Error("Failed to fetch all summaries");
    return response.json();
  },

  // ===== NEW APIs - Audit Logs =====
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

// Markdown Components
const MarkdownComponents = {
  ul: ({ node, ...props }) => (
    <ul
      className="list-disc list-inside space-y-1 ml-4 text-gray-200"
      {...props}
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className="list-decimal list-inside space-y-1 ml-4 text-gray-200"
      {...props}
    />
  ),
  li: ({ node, ...props }) => <li className="mb-1 text-gray-200" {...props} />,
  h1: ({ node, ...props }) => (
    <h1 className="text-xl font-bold mt-4 mb-2 text-white" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-lg font-bold mt-3 mb-2 text-white" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-md font-bold mt-2 mb-1 text-white" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  p: ({ node, ...props }) => <p className="mb-2 text-gray-200" {...props} />,
};

export default function Home() {
  const [view, setView] = useState("library"); // library, upload, config, result, history, jobs, stats
  const [pdfList, setPdfList] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [file, setFile] = useState(null);
  const [summaryHistory, setSummaryHistory] = useState([]);
  const [checkpointInfo, setCheckpointInfo] = useState(null);

  // New states for job management
  const [jobList, setJobList] = useState([]);
  const [stats, setStats] = useState(null);
  const [jobFilter, setJobFilter] = useState("all"); // all, pending, processing, completed, failed

  // New states for header
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // New states for sort & filter
  const [sortBy, setSortBy] = useState("latest"); // latest, oldest, name-asc, name-desc, size
  const [filterType, setFilterType] = useState("all"); // all, with-summary, no-summary
  const [filterDate, setFilterDate] = useState("all"); // all, today, week, month

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const itemsPerPage = 5; // Changed from 10 to 5

  // Configuration
  const [mode, setMode] = useState("simple");
  const [language, setLanguage] = useState("indonesian");
  const [pageRange, setPageRange] = useState("all");
  const [customPages, setCustomPages] = useState("");
  const [question, setQuestion] = useState("");

  // Results
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [currentJobId, setCurrentJobId] = useState(null);

  useEffect(() => {
    loadPDFs();
    loadStats();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, filterType, filterDate]);

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside notification or filter dropdowns
      const notifDropdown = document.getElementById("notification-dropdown");
      const filterDropdown = document.getElementById("filter-dropdown");
      const notifButton = document.getElementById("notification-button");
      const filterButton = document.getElementById("filter-button");

      if (
        showNotifications &&
        notifDropdown &&
        !notifDropdown.contains(event.target) &&
        notifButton &&
        !notifButton.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      if (
        showFilters &&
        filterDropdown &&
        !filterDropdown.contains(event.target) &&
        filterButton &&
        !filterButton.contains(event.target)
      ) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications, showFilters]);

  const loadPDFs = async () => {
    try {
      const result = await api.getPDFs();
      setPdfList(result.data || []);
    } catch (err) {
      console.error("Failed to load PDFs:", err);
    }
  };

  const loadStats = async () => {
    try {
      const result = await api.getPDFStats();
      setStats(result.data || null);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const loadJobs = async (status = null) => {
    try {
      const filters = status && status !== "all" ? { status } : {};
      const result = await api.listJobs(filters);
      setJobList(result.data || []);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  // Add notification
  const addNotification = (message, type = "info", action = null) => {
    const newNotif = {
      message,
      type,
      time: new Date().toLocaleTimeString(),
      action, // Optional action (e.g., "view-result")
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 10)); // Keep last 10
    setHasUnreadNotifications(true); // Mark as unread
  };

  // Filter, Sort PDFs by search query, type, and date
  const filteredPDFs = pdfList
    .filter((pdf) => {
      // Search filter
      const matchesSearch = pdf.original_filename
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Type filter
      let matchesType = true;
      if (filterType === "with-summary") {
        matchesType = pdf.summary_count > 0;
      } else if (filterType === "no-summary") {
        matchesType = pdf.summary_count === 0;
      }

      // Date filter
      let matchesDate = true;
      if (filterDate !== "all" && pdf.uploaded_at) {
        const uploadDate = new Date(pdf.uploaded_at);
        const now = new Date();
        const diffTime = now - uploadDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (filterDate === "today") {
          matchesDate = diffDays < 1;
        } else if (filterDate === "week") {
          matchesDate = diffDays < 7;
        } else if (filterDate === "month") {
          matchesDate = diffDays < 30;
        }
      }

      return matchesSearch && matchesType && matchesDate;
    })
    .sort((a, b) => {
      // Sort logic
      if (sortBy === "latest") {
        return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      } else if (sortBy === "oldest") {
        return new Date(a.uploaded_at) - new Date(b.uploaded_at);
      } else if (sortBy === "name-asc") {
        return a.original_filename.localeCompare(b.original_filename);
      } else if (sortBy === "name-desc") {
        return b.original_filename.localeCompare(a.original_filename);
      } else if (sortBy === "size") {
        return b.file_size - a.file_size;
      }
      return 0;
    });

  // Pagination for PDF list
  const totalPages = Math.ceil(filteredPDFs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPDFs = filteredPDFs.slice(startIndex, endIndex);

  // Pagination for summary history
  const totalSummaryPages = Math.ceil(summaryHistory.length / itemsPerPage);
  const summaryStartIndex = (summaryPage - 1) * itemsPerPage;
  const summaryEndIndex = summaryStartIndex + itemsPerPage;
  const paginatedSummaries = summaryHistory.slice(
    summaryStartIndex,
    summaryEndIndex
  );

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".pdf")) {
        setError("Only PDF files are allowed");
        addNotification("Only PDF files are allowed", "error");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        addNotification("File size must be less than 10MB", "error");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      await api.uploadPDF(file);
      addNotification(`PDF "${file.name}" uploaded successfully!`, "success");
      setFile(null);
      await loadPDFs();
      setView("library");
    } catch (err) {
      setError(err.message);
      addNotification(`Failed to upload "${file.name}": ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPDF = async (pdf) => {
    setSelectedPDF(pdf);
    setError("");
    setCheckpointInfo(null);
    setSummaryPage(1); // Reset summary pagination

    // Load summary history for this PDF
    try {
      const result = await api.getSummaries(pdf.id);
      setSummaryHistory(result.data || []);

      // Check if PDF has checkpoint
      try {
        const checkpointResult = await api.getPDFCheckpoint(pdf.id);
        if (checkpointResult.data && checkpointResult.data.has_checkpoint) {
          setCheckpointInfo(checkpointResult.data);
        }
      } catch (err) {
        console.error("Failed to fetch checkpoint:", err);
      }

      // If has summaries, show history first, otherwise go to config
      if (result.data && result.data.length > 0) {
        setView("history");
      } else {
        setView("config");
      }
    } catch (err) {
      console.error("Failed to load summaries:", err);
      setView("config");
    }
  };

  const handleDeletePDF = async (id) => {
    if (!confirm("Delete this PDF?")) return;
    const pdfToDelete = pdfList.find((p) => p.id === id);
    const filename = pdfToDelete?.original_filename || "PDF";
    
    try {
      await api.deletePDF(id);
      addNotification(`"${filename}" deleted successfully`, "success");
      await loadPDFs();
      if (selectedPDF?.id === id) {
        setSelectedPDF(null);
        setView("library");
      }
    } catch (err) {
      setError(err.message);
      addNotification(`Failed to delete "${filename}": ${err.message}`, "error");
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    if (!confirm("Delete this summary?")) return;
    try {
      await api.deleteSummary(summaryId);
      addNotification("Summary deleted successfully", "success");
      // Reload summary history
      const result = await api.getSummaries(selectedPDF.id);
      setSummaryHistory(result.data || []);
    } catch (err) {
      setError(err.message);
      addNotification(`Failed to delete summary: ${err.message}`, "error");
    }
  };

  const handleViewSummary = (summaryItem) => {
    setSummary(summaryItem);
    setMode(summaryItem.mode);
    setView("result");
  };

  const handleSummarize = async () => {
    if (!selectedPDF) return;
    if (mode === "qa" && !question.trim()) {
      setError("Please enter a question");
      addNotification("Please enter a question for Q&A mode", "error");
      return;
    }

    setLoading(true);
    setError("");
    setSummary(null);
    setCheckpointInfo(null);
    setProcessingStatus("Creating job...");
    setCurrentJobId(null);

    try {
      const options = {
        mode,
        language,
        pages: pageRange === "custom" && customPages ? customPages : null,
        question: mode === "qa" ? question : null,
      };

      // Create async job
      const result = await api.summarizePDF(selectedPDF.id, options);
      const jobId = result.data.id;
      setCurrentJobId(jobId);
      setProcessingStatus("Job created. Processing...");

      // Poll job status
      const pollInterval = setInterval(async () => {
        try {
          const jobResult = await api.getJobStatus(jobId);
          const job = jobResult.data;

          if (job.status === "completed") {
            clearInterval(pollInterval);
            setProcessingStatus("Completed! Loading summary...");

            // Get the summary
            if (job.summary_log_id) {
              const summaryResult = await api.getSummary(job.summary_log_id);
              setSummary(summaryResult.data);

              // Add success notification
              addNotification(
                `Summary for "${selectedPDF.original_filename}" completed! Click to view.`,
                "success",
                "view-result" // Action identifier
              );

              // Reload summary history
              try {
                const historyResult = await api.getSummaries(selectedPDF.id);
                setSummaryHistory(historyResult.data || []);
              } catch (err) {
                console.error("Failed to reload summary history:", err);
              }

              // Auto-redirect ONLY if still loading (user is waiting)
              // If loading is false, user has navigated away
              if (loading) {
                setView("result");
              }
              
              setLoading(false);
              setProcessingStatus("");
            }
          } else if (job.status === "failed") {
            clearInterval(pollInterval);
            setError(job.error_msg || "Summarization failed");
            
            // Try to fetch checkpoint info
            let hasCheckpoint = false;
            try {
              const checkpointResult = await api.getPDFCheckpoint(
                selectedPDF.id
              );
              if (
                checkpointResult.data &&
                checkpointResult.data.has_checkpoint
              ) {
                setCheckpointInfo(checkpointResult.data);
                hasCheckpoint = true;
              }
            } catch (checkpointErr) {
              console.error("Failed to fetch checkpoint info:", checkpointErr);
            }
            
            // Add notification with resume action if checkpoint exists
            if (hasCheckpoint) {
              addNotification(
                `⚠️ Summary failed for "${selectedPDF.original_filename}". Progress saved - you can resume.`,
                "error",
                "resume-job" // Action to resume
              );
            } else {
              addNotification(
                `❌ Summary failed for "${selectedPDF.original_filename}": ${job.error_msg || "Unknown error"}`,
                "error"
              );
            }
            
            setLoading(false);
            setProcessingStatus("");
          } else if (job.status === "processing") {
            setProcessingStatus("Processing PDF...");
          } else if (job.status === "pending") {
            setProcessingStatus("Waiting in queue...");
          }
        } catch (err) {
          console.error("Failed to poll job status:", err);
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 15 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (loading) {
          setError("Processing timeout. Please check job status later.");
          addNotification(
            `Processing timeout for "${selectedPDF.original_filename}". Please check job status later.`,
            "error"
          );
          setLoading(false);
          setProcessingStatus("");
        }
      }, 15 * 60 * 1000);
    } catch (err) {
      setError(err.message);
      addNotification(
        `Failed to create job for "${selectedPDF.original_filename}": ${err.message}`,
        "error"
      );
      setLoading(false);
      setProcessingStatus("");

      // Try to fetch checkpoint info if error occurred
      try {
        const checkpointResult = await api.getPDFCheckpoint(selectedPDF.id);
        if (checkpointResult.data && checkpointResult.data.has_checkpoint) {
          setCheckpointInfo(checkpointResult.data);
        }
      } catch (checkpointErr) {
        console.error("Failed to fetch checkpoint info:", checkpointErr);
      }
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 p-6 flex flex-col border-r border-gray-700">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faFilePdf}
                  className="text-3xl text-white"
                />
              </div>
              <h1 className="text-2xl font-bold text-white">
                AI PDF Summarizer
              </h1>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Upload PDF dan AI akan membuat ringkasan menggunakan Golang +
              Python + Gemini AI.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-2 mb-6">
            <button
              onClick={() => setView("library")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                view === "library"
                  ? "bg-red-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <FontAwesomeIcon icon={faBook} className="mr-2" />
              My Library
            </button>
            <button
              onClick={() => setView("upload")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                view === "upload"
                  ? "bg-red-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Upload PDF
            </button>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
              <h3 className="text-white font-semibold">Features</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium text-sm mb-1">
                  Simple Summary:
                </h4>
                <p className="text-gray-400 text-xs">
                  Ringkasan sederhana dan mudah dipahami.
                </p>
              </div>
              <div>
                <h4 className="text-white font-medium text-sm mb-1">
                  Structured Summary:
                </h4>
                <p className="text-gray-400 text-xs">
                  Executive summary + key points + highlights.
                </p>
              </div>
              <div>
                <h4 className="text-white font-medium text-sm mb-1">
                  Q&A Mode:
                </h4>
                <p className="text-gray-400 text-xs">
                  Tanyakan pertanyaan tentang isi PDF.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-gray-700">
            <div className="text-gray-400 text-sm">
              <p className="mb-2">Tech Stack:</p>
              <ul className="text-xs space-y-1">
                <li>• Golang (Fiber)</li>
                <li>• Python (FastAPI)</li>
                <li>• Google Gemini AI</li>
                <li>• PostgreSQL</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">

          <div className="max-w-4xl mx-auto">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-900/50 border border-red-500 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon
                    icon={faExclamationCircle}
                    className="text-red-400 mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium">Error</h3>
                    <p className="text-red-300 text-sm mt-1">{error}</p>

                    {/* Checkpoint Resume Info */}
                    {checkpointInfo && checkpointInfo.has_checkpoint && (
                      <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                        <div className="flex items-start gap-2">
                          <FontAwesomeIcon
                            icon={faSync}
                            className="text-yellow-400 mt-1"
                          />
                          <div>
                            <p className="text-yellow-300 font-medium text-sm">
                              Resume Available
                            </p>
                            <p className="text-yellow-200 text-xs mt-1">
                              Progress saved at page{" "}
                              {checkpointInfo.last_processed_page || 0}. Click
                              "Generate Summary" again to resume from where it
                              stopped.
                            </p>
                            {checkpointInfo.total_pages && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-yellow-200 mb-1">
                                  <span>Progress</span>
                                  <span>
                                    {checkpointInfo.last_processed_page || 0} /{" "}
                                    {checkpointInfo.total_pages} pages
                                  </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-yellow-500 h-2 rounded-full transition-all"
                                    style={{
                                      width: `${(
                                        ((checkpointInfo.last_processed_page ||
                                          0) /
                                          checkpointInfo.total_pages) *
                                        100
                                      ).toFixed(0)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Library View */}
            {view === "library" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-white">
                    My PDF Library
                  </h2>
                </div>

                            <header className="border-gray-700 sticky top-0 bg-gray-900 z-10 mb-6">
              {/* Search Bar Row */}
              <div className="flex items-center justify-center py-3">
                {/* Search Bar */}
                <div className="flex-1 max-w-3xl">
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search for anything..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-700 text-white pl-12 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Right Side - Filter & Notifications */}
                <div className="flex items-center gap-4 ml-6">
                  {/* Filter Button */}
                  <div className="relative">
                    <button
                      id="filter-button"
                      onClick={() => {
                        setShowFilters(!showFilters);
                        setShowNotifications(false); // Close notifications when opening filters
                      }}
                      className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      title="Sort & Filter"
                    >
                      <FontAwesomeIcon icon={faFilter} className="text-xl" />
                      {(sortBy !== "latest" ||
                        filterType !== "all" ||
                        filterDate !== "all") && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </button>

                    {/* Filter Dropdown */}
                    {showFilters && (
                    <div
                      id="filter-dropdown"
                      className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-semibold">
                            Sort & Filter
                          </h3>
                          <button
                            onClick={() => setShowFilters(false)}
                            className="text-gray-400 hover:text-white"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Sort Section */}
                        <div>
                          <label className="block text-gray-400 text-sm font-medium mb-2">
                            <FontAwesomeIcon
                              icon={faSortAmountDown}
                              className="mr-2"
                            />
                            Sort By
                          </label>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                          >
                            <option value="latest">Latest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                            <option value="size">File Size</option>
                          </select>
                        </div>

                        {/* Filter by Type */}
                        <div>
                          <label className="block text-gray-400 text-sm font-medium mb-2">
                            <FontAwesomeIcon icon={faFilter} className="mr-2" />
                            Filter by Type
                          </label>
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                          >
                            <option value="all">All Files</option>
                            <option value="with-summary">With Summary</option>
                            <option value="no-summary">No Summary</option>
                          </select>
                        </div>

                        {/* Filter by Date */}
                        <div>
                          <label className="block text-gray-400 text-sm font-medium mb-2">
                            <FontAwesomeIcon
                              icon={faCalendar}
                              className="mr-2"
                            />
                            Filter by Date
                          </label>
                          <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                          >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                          </select>
                        </div>

                        {/* Results Count */}
                        <div className="pt-3 border-t border-gray-700">
                          <p className="text-gray-400 text-sm text-center">
                            Showing {filteredPDFs.length}{" "}
                            {filteredPDFs.length === 1 ? "file" : "files"}
                          </p>
                        </div>

                        {/* Reset Button */}
                        {(sortBy !== "latest" ||
                          filterType !== "all" ||
                          filterDate !== "all") && (
                          <button
                            onClick={() => {
                              setSortBy("latest");
                              setFilterType("all");
                              setFilterDate("all");
                            }}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notification Bell */}
                <div className="relative">
                  <button
                    id="notification-button"
                    onClick={() => {
                      const newState = !showNotifications;
                      setShowNotifications(newState);
                      setShowFilters(false); // Close filters when opening notifications
                      if (newState) {
                        // Mark as read when opening
                        setHasUnreadNotifications(false);
                      }
                    }}
                    className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
                  >
                    <FontAwesomeIcon icon={faBell} className="text-xl" />
                    {hasUnreadNotifications && notifications.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div
                      id="notification-dropdown"
                      className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-semibold">
                            Notifications
                          </h3>
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="text-gray-400 hover:text-white"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-400">
                            <FontAwesomeIcon
                              icon={faBell}
                              className="text-4xl mb-2 opacity-50"
                            />
                            <p>No notifications</p>
                          </div>
                        ) : (
                          notifications.map((notif, index) => (
                            <div
                              key={index}
                              className="p-4 border-b border-gray-700 hover:bg-gray-700 transition"
                            >
                              <div className="flex items-start gap-3">
                                <FontAwesomeIcon
                                  icon={
                                    notif.type === "success"
                                      ? faCheckCircle
                                      : notif.type === "error"
                                      ? faExclamationCircle
                                      : faInfoCircle
                                  }
                                  className={`mt-1 ${
                                    notif.type === "success"
                                      ? "text-green-400"
                                      : notif.type === "error"
                                      ? "text-red-400"
                                      : "text-blue-400"
                                  }`}
                                />
                                <div className="flex-1">
                                  <p className="text-white text-sm">
                                    {notif.message}
                                  </p>
                                  <p className="text-gray-400 text-xs mt-1">
                                    {notif.time}
                                  </p>
                                  
                                  {/* Action Buttons */}
                                  {notif.action && (
                                    <div className="mt-2 flex gap-2">
                                      {notif.action === "view-result" && (
                                        <button
                                          onClick={() => {
                                            setView("result");
                                            setShowNotifications(false);
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition"
                                        >
                                          View Result
                                        </button>
                                      )}
                                      {notif.action === "resume-job" && (
                                        <button
                                          onClick={() => {
                                            setView("config");
                                            setShowNotifications(false);
                                          }}
                                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded transition flex items-center gap-1"
                                        >
                                          <FontAwesomeIcon icon={faSync} />
                                          Resume
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>


                {pdfList.length === 0 ? (
                  <div className="text-center py-16">
                    <FontAwesomeIcon
                      icon={faFilePdf}
                      className="text-6xl text-gray-600 mb-4"
                    />
                    <p className="text-gray-400 text-lg">
                      No PDFs yet. Upload your first PDF!
                    </p>
                    <button
                      onClick={() => setView("upload")}
                      className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition"
                    >
                      Upload PDF
                    </button>
                  </div>
                ) : filteredPDFs.length === 0 ? (
                  <div className="text-center py-16">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="text-6xl text-gray-600 mb-4"
                    />
                    <p className="text-gray-400 text-lg">
                      No PDFs found matching "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4">
                      {paginatedPDFs.map((pdf) => (
                        <div
                          key={pdf.id}
                          className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-red-500 transition cursor-pointer"
                          onClick={() => handleSelectPDF(pdf)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-2">
                                {pdf.original_filename}
                              </h3>
                              <div className="flex gap-4 text-sm text-gray-400">
                                <span>
                                  <FontAwesomeIcon
                                    icon={faFileAlt}
                                    className="mr-1"
                                  />
                                  {(pdf.file_size / 1024 / 1024).toFixed(2)} MB
                                </span>
                                <span>
                                  <FontAwesomeIcon
                                    icon={faCalendar}
                                    className="mr-1"
                                  />
                                  {formatDate(pdf.uploaded_at)}
                                </span>
                                <span>
                                  <FontAwesomeIcon
                                    icon={faFileLines}
                                    className="mr-1"
                                  />
                                  {pdf.summary_count || 0} summaries
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePDF(pdf.id);
                              }}
                              className="text-red-400 hover:text-red-300 px-3 py-1 rounded transition"
                            >
                              <FontAwesomeIcon icon={faTrash} className="mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination - Always show */}
                    <div className="mt-6 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>
                      
                      <div className="flex gap-1">
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-3 py-2 rounded-lg transition ${
                              currentPage === i + 1
                                ? "bg-red-500 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* History View - Show existing summaries */}
            {view === "history" && selectedPDF && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={async () => {
                      // Reload PDF list to update summary counts
                      await loadPDFs();
                      setView("library");
                    }}
                    className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
                  >
                    ← Back to Library
                  </button>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Summary History
                  </h2>
                  <p className="text-gray-400">
                    {selectedPDF.original_filename}
                  </p>
                </div>

                <div className="mb-6">
                  <button
                    onClick={() => setView("config")}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition"
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Generate New Summary
                  </button>
                </div>

                {summaryHistory.length === 0 ? (
                  <div className="text-center py-16 bg-gray-800 rounded-xl">
                    <FontAwesomeIcon
                      icon={faFileLines}
                      className="text-6xl text-gray-600 mb-4"
                    />
                    <p className="text-gray-400 text-lg mb-4">
                      No summaries yet for this PDF
                    </p>
                    <button
                      onClick={() => setView("config")}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition"
                    >
                      Create First Summary
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedSummaries.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
                                  {item.mode}
                                </span>
                                <span className="text-gray-400 text-sm">
                                  {item.language}
                                </span>
                                {item.pages_processed && (
                                  <span className="text-gray-400 text-sm">
                                    Pages: {item.pages_processed}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-sm">
                                Created: {formatDateTime(item.created_at)} •
                                Processing: {item.processing_time?.toFixed(2)}s
                              </p>
                              {item.qa_question && (
                                <p className="text-gray-300 text-sm mt-2">
                                  Q: {item.qa_question}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewSummary(item)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition"
                              >
                                <FontAwesomeIcon icon={faEye} className="mr-1" />
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteSummary(item.id)}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm transition"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </div>

                          {/* Preview */}
                          <div className="text-gray-300 text-sm line-clamp-2">
                            {item.summary_text &&
                              item.summary_text.substring(0, 150)}
                            {item.executive_summary &&
                              item.executive_summary.substring(0, 150)}
                            {item.qa_answer && item.qa_answer.substring(0, 150)}
                            ...
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination for Summary History - Always show */}
                    <div className="mt-6 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                        disabled={summaryPage === 1}
                        className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>
                      
                      <div className="flex gap-1">
                        {[...Array(totalSummaryPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setSummaryPage(i + 1)}
                            className={`px-3 py-2 rounded-lg transition ${
                              summaryPage === i + 1
                                ? "bg-purple-500 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setSummaryPage((p) => Math.min(totalSummaryPages, p + 1))}
                        disabled={summaryPage === totalSummaryPages}
                        className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Upload View */}
            {view === "upload" && (
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">
                  Upload New PDF
                </h2>
                <label
                  htmlFor="file-upload"
                  className="block border-2 border-dashed border-purple-500 rounded-2xl p-16 hover:border-purple-400 transition cursor-pointer bg-gray-800/50"
                >
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                      <FontAwesomeIcon
                        icon={faCloudUploadAlt}
                        className="text-4xl text-blue-400"
                      />
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">
                      {file ? file.name : "Drag & drop PDF file"}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">Maximum 10MB</p>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                </label>

                {file && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50 transition"
                    >
                      {loading ? "Uploading..." : "Upload PDF"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Configuration View */}
            {view === "config" && selectedPDF && (
              <div className="bg-gray-800 rounded-2xl p-8 space-y-6">
                <div>
                  <button
                    onClick={async () => {
                      // Reload summary history before going back
                      if (summaryHistory.length > 0) {
                        try {
                          const result = await api.getSummaries(selectedPDF.id);
                          setSummaryHistory(result.data || []);
                        } catch (err) {
                          console.error("Failed to reload summaries:", err);
                        }
                        setView("history");
                      } else {
                        setView("library");
                      }
                    }}
                    className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
                  >
                    ← Back
                  </button>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Generate New Summary
                  </h2>
                  <p className="text-gray-400">
                    PDF: {selectedPDF.original_filename}
                  </p>

                  {/* Checkpoint Resume Notification */}
                  {checkpointInfo && checkpointInfo.has_checkpoint && (
                    <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon
                          icon={faSync}
                          className="text-blue-400 mt-1"
                        />
                        <div>
                          <p className="text-blue-300 font-medium">
                            Resume from Checkpoint
                          </p>
                          <p className="text-blue-200 text-sm mt-1">
                            Previous attempt stopped at page{" "}
                            {checkpointInfo.last_processed_page || 0}.
                            Generating summary will continue from there to save
                            AI costs.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-white text-lg font-semibold mb-3 block">
                    Mode
                  </label>
                  <select
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="simple">Simple Summary</option>
                    <option value="structured">Structured Summary</option>
                    <option value="qa">Question & Answer</option>
                  </select>
                </div>

                {mode === "qa" && (
                  <div>
                    <label className="text-white text-lg font-semibold mb-3 block">
                      Question
                    </label>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Enter your question"
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-white text-lg font-semibold mb-3 block">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="english">English</option>
                    <option value="indonesian">Indonesian</option>
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                    <option value="german">German</option>
                  </select>
                </div>

                <div>
                  <label className="text-white text-lg font-semibold mb-3 block">
                    Page Range
                  </label>
                  <div className="flex gap-4 mb-3">
                    <button
                      onClick={() => setPageRange("all")}
                      className={`flex-1 px-6 py-3 rounded-xl border-2 font-medium transition ${
                        pageRange === "all"
                          ? "border-purple-500 bg-purple-500/10 text-white"
                          : "border-gray-600 bg-gray-700/50 text-gray-300"
                      }`}
                    >
                      All pages
                    </button>
                    <button
                      onClick={() => setPageRange("custom")}
                      className={`flex-1 px-6 py-3 rounded-xl border-2 font-medium transition ${
                        pageRange === "custom"
                          ? "border-purple-500 bg-purple-500/10 text-white"
                          : "border-gray-600 bg-gray-700/50 text-gray-300"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {pageRange === "custom" && (
                    <input
                      type="text"
                      value={customPages}
                      onChange={(e) => setCustomPages(e.target.value)}
                      placeholder="e.g., 1-5, 7, 9"
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                </div>

                <button
                  onClick={handleSummarize}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50 transition"
                >
                  {loading ? (
                    <span>
                      <FontAwesomeIcon
                        icon={faSync}
                        className="mr-2 animate-spin"
                      />
                      {processingStatus || "Processing..."}
                    </span>
                  ) : (
                    "Generate Summary"
                  )}
                </button>
              </div>
            )}

            {/* Result View */}
            {view === "result" && summary && (
              <div className="space-y-4">
                <button
                  onClick={async () => {
                    // Reload summary history before going back
                    try {
                      const result = await api.getSummaries(selectedPDF.id);
                      setSummaryHistory(result.data || []);
                    } catch (err) {
                      console.error("Failed to reload summaries:", err);
                    }
                    setView("history");
                  }}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                  Back to History
                </button>

                <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {mode === "simple" && "Simple Summary"}
                        {mode === "structured" && "Structured Summary"}
                        {mode === "qa" && "Q&A Result"}
                      </h3>
                      <p className="text-xs text-white/80">
                        {selectedPDF?.original_filename}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          copyText(
                            summary.summary_text ||
                              summary.executive_summary ||
                              summary.qa_answer
                          )
                        }
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition"
                      >
                        <FontAwesomeIcon icon={faCopy} className="mr-2" />
                        Copy
                      </button>
                      <button
                        onClick={() =>
                          downloadText(
                            summary.summary_text ||
                              summary.executive_summary ||
                              summary.qa_answer,
                            `${selectedPDF?.original_filename}-summary.txt`
                          )
                        }
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition"
                      >
                        <FontAwesomeIcon icon={faDownload} className="mr-2" />
                        Download
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-3 text-sm text-gray-400">
                      Processing time: {summary.processing_time?.toFixed(2)}s
                    </div>

                    {/* Simple Mode */}
                    {mode === "simple" && summary.summary_text && (
                      <div className="text-gray-200 leading-relaxed prose prose-invert max-w-none">
                        <ReactMarkdown components={MarkdownComponents}>
                          {summary.summary_text}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Structured Mode */}
                    {mode === "structured" && (
                      <div>
                        <div className="mb-6">
                          <h4 className="font-semibold mb-2 text-white">
                            Executive Summary
                          </h4>
                          <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                            {summary.executive_summary}
                          </p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3 text-white">
                              Key Points
                            </h4>
                            <ul className="list-disc list-inside space-y-2 text-gray-300">
                              {summary.bullets &&
                                JSON.parse(summary.bullets).map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3 text-white">
                              Highlights
                            </h4>
                            <ul className="list-disc list-inside space-y-2 text-gray-300">
                              {summary.highlights &&
                                JSON.parse(summary.highlights).map((h, i) => (
                                  <li key={i} className="italic">
                                    {h}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* QA Mode */}
                    {mode === "qa" && (
                      <div>
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2 text-white">
                            Question:
                          </h4>
                          <p className="text-gray-300">{summary.qa_question}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 text-white">
                            Answer:
                          </h4>
                          <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                            {summary.qa_answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
