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
} from "@fortawesome/free-solid-svg-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Utility function for safe date formatting
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString();
  } catch (error) {
    return 'Invalid Date';
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
    const response = await fetch(`${API_URL}/api/pdfs/${pdfId}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Summarization failed");
    }
    return response.json();
  },
};

// Markdown Components
const MarkdownComponents = {
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-inside space-y-1 ml-4 text-gray-200" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-inside space-y-1 ml-4 text-gray-200" {...props} />
  ),
  li: ({ node, ...props }) => <li className="mb-1 text-gray-200" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-white" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 text-white" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-2 mb-1 text-white" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
  p: ({ node, ...props }) => <p className="mb-2 text-gray-200" {...props} />,
};

export default function Home() {
  const [view, setView] = useState("library"); // library, upload, config, result, history
  const [pdfList, setPdfList] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [file, setFile] = useState(null);
  const [summaryHistory, setSummaryHistory] = useState([]);
  
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

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    try {
      const result = await api.getPDFs();
      setPdfList(result.data || []);
    } catch (err) {
      console.error("Failed to load PDFs:", err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".pdf")) {
        setError("Only PDF files are allowed");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
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
      setFile(null);
      await loadPDFs();
      setView("library");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPDF = async (pdf) => {
    setSelectedPDF(pdf);
    setError("");
    
    // Load summary history for this PDF
    try {
      const result = await api.getSummaries(pdf.id);
      setSummaryHistory(result.data || []);
      
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
    try {
      await api.deletePDF(id);
      await loadPDFs();
      if (selectedPDF?.id === id) {
        setSelectedPDF(null);
        setView("library");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    if (!confirm("Delete this summary?")) return;
    try {
      await api.deleteSummary(summaryId);
      // Reload summary history
      const result = await api.getSummaries(selectedPDF.id);
      setSummaryHistory(result.data || []);
    } catch (err) {
      setError(err.message);
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
      return;
    }

    setLoading(true);
    setError("");
    setSummary(null);

    try {
      const options = {
        mode,
        language,
        pages: pageRange === "custom" && customPages ? customPages : null,
        question: mode === "qa" ? question : null,
      };

      const result = await api.summarizePDF(selectedPDF.id, options);
      setSummary(result.data);
      setView("result");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 p-6 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faFilePdf} className="text-3xl text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">AI PDF Summarizer</h1>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Upload PDF dan AI akan membuat ringkasan menggunakan Golang + Python + Gemini AI.
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-2 mb-6">
          <button
            onClick={() => setView("library")}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              view === "library" ? "bg-red-600 text-white" : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            <FontAwesomeIcon icon={faBook} className="mr-2" />
            My Library
          </button>
          <button
            onClick={() => setView("upload")}
            className={`w-full text-left px-4 py-3 rounded-lg transition ${
              view === "upload" ? "bg-red-600 text-white" : "text-gray-300 hover:bg-gray-700"
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
              <h4 className="text-white font-medium text-sm mb-1">Simple Summary:</h4>
              <p className="text-gray-400 text-xs">Ringkasan sederhana dan mudah dipahami.</p>
            </div>
            <div>
              <h4 className="text-white font-medium text-sm mb-1">Structured Summary:</h4>
              <p className="text-gray-400 text-xs">Executive summary + key points + highlights.</p>
            </div>
            <div>
              <h4 className="text-white font-medium text-sm mb-1">Q&A Mode:</h4>
              <p className="text-gray-400 text-xs">Tanyakan pertanyaan tentang isi PDF.</p>
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
                <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 mt-1" />
                <div>
                  <h3 className="text-red-400 font-medium">Error</h3>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Library View */}
          {view === "library" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">My PDF Library</h2>
                <button
                  onClick={loadPDFs}
                  className="text-gray-400 hover:text-white transition"
                >
                  <FontAwesomeIcon icon={faSync} className="mr-2" />
                  Refresh
                </button>
              </div>

              {pdfList.length === 0 ? (
                <div className="text-center py-16">
                  <FontAwesomeIcon icon={faFilePdf} className="text-6xl text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg">No PDFs yet. Upload your first PDF!</p>
                  <button
                    onClick={() => setView("upload")}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition"
                  >
                    Upload PDF
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pdfList.map((pdf) => (
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
                            <span><FontAwesomeIcon icon={faFileAlt} className="mr-1" />{(pdf.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            <span><FontAwesomeIcon icon={faCalendar} className="mr-1" />{formatDate(pdf.uploaded_at)}</span>
                            <span><FontAwesomeIcon icon={faFileLines} className="mr-1" />{pdf.summary_count || 0} summaries</span>
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
              )}
            </div>
          )}

          {/* History View - Show existing summaries */}
          {view === "history" && selectedPDF && (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => setView("library")}
                  className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
                >
                  ← Back to Library
                </button>
                <h2 className="text-3xl font-bold text-white mb-2">Summary History</h2>
                <p className="text-gray-400">{selectedPDF.original_filename}</p>
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
                  <FontAwesomeIcon icon={faFileLines} className="text-6xl text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg mb-4">No summaries yet for this PDF</p>
                  <button
                    onClick={() => setView("config")}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition"
                  >
                    Create First Summary
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {summaryHistory.map((item) => (
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
                        {item.summary_text && item.summary_text.substring(0, 150)}
                        {item.executive_summary && item.executive_summary.substring(0, 150)}
                        {item.qa_answer && item.qa_answer.substring(0, 150)}
                        ...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload View */}
          {view === "upload" && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Upload New PDF</h2>
              <label
                htmlFor="file-upload"
                className="block border-2 border-dashed border-purple-500 rounded-2xl p-16 hover:border-purple-400 transition cursor-pointer bg-gray-800/50"
              >
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                    <FontAwesomeIcon icon={faCloudUploadAlt} className="text-4xl text-blue-400" />
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
                  onClick={() => summaryHistory.length > 0 ? setView("history") : setView("library")}
                  className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">Generate New Summary</h2>
                <p className="text-gray-400">PDF: {selectedPDF.original_filename}</p>
              </div>

              <div>
                <label className="text-white text-lg font-semibold mb-3 block">Mode</label>
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
                  <label className="text-white text-lg font-semibold mb-3 block">Question</label>
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
                <label className="text-white text-lg font-semibold mb-3 block">Language</label>
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
                <label className="text-white text-lg font-semibold mb-3 block">Page Range</label>
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
                {loading ? "Processing..." : "Generate Summary"}
              </button>
            </div>
          )}

          {/* Result View */}
          {view === "result" && summary && (
            <div className="space-y-4">
              <button
                onClick={() => setView("history")}
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
                    <p className="text-xs text-white/80">{selectedPDF?.original_filename}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        copyText(
                          summary.summary_text || summary.executive_summary || summary.qa_answer
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
                          summary.summary_text || summary.executive_summary || summary.qa_answer,
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
                        <h4 className="font-semibold mb-2 text-white">Executive Summary</h4>
                        <p className="text-gray-200 leading-relaxed whitespace-pre-line">
                          {summary.executive_summary}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 text-white">Key Points</h4>
                          <ul className="list-disc list-inside space-y-2 text-gray-300">
                            {summary.bullets &&
                              JSON.parse(summary.bullets).map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3 text-white">Highlights</h4>
                          <ul className="list-disc list-inside space-y-2 text-gray-300">
                            {summary.highlights &&
                              JSON.parse(summary.highlights).map((h, i) => (
                                <li key={i} className="italic">{h}</li>
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
                        <h4 className="font-semibold mb-2 text-white">Question:</h4>
                        <p className="text-gray-300">{summary.qa_question}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-white">Answer:</h4>
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
  );
}
