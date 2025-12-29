"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

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
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const [files, setFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [outputType, setOutputType] = useState("notes");
  const [language, setLanguage] = useState("english");
  const [noteLength, setNoteLength] = useState("in-depth");
  const [noteStructure, setNoteStructure] = useState("outline");
  const [pageRange, setPageRange] = useState("all");
  const [customPages, setCustomPages] = useState("");
  const [mode, setMode] = useState("simple");
  const [summary, setSummary] = useState("");
  const [structured, setStructured] = useState(null);
  const [multiResult, setMultiResult] = useState(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wordCount = summary ? summary.trim().split(/\s+/).length : 0;

  const copyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const downloadText = (text, name = "summary.txt") => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadSummary = () => {
    const base =
      files[0]?.name?.replace(/\.pdf$/i, "") ||
      structured?.filename ||
      "summary";
    downloadText(summary, `${base}-summary.txt`);
  };

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length > 0) {
      setPendingFiles(list);
      setShowConfirmModal(true);
    }
    e.target.value = '';
  };

  const confirmUpload = () => {
    setFiles(pendingFiles);
    setShowConfirmModal(false);
    setShowConfigMenu(true);
    setError("");
    setSummary("");
    setStructured(null);
    setMultiResult(null);
    setQaAnswer("");
  };

  const handleSaveAndContinue = () => {
    setShowConfigMenu(false);
    setPendingFiles([]);
  };

  const handleBackToUpload = () => {
    setFiles([]);
    setSummary("");
    setStructured(null);
    setMultiResult(null);
    setQaAnswer("");
    setError("");
  };

  const cancelUpload = () => {
    setShowConfirmModal(false);
    setPendingFiles([]);
  };

  const fetchAPI = async (endpoint, formData, errorMsg) => {
    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorMsg);
    }
    return response.json();
  };

  const handleSubmit = async () => {
    setError("");
    setSummary("");
    setStructured(null);
    setMultiResult(null);
    setQaAnswer("");

    if (!files.length) {
      setError("Pilih minimal satu PDF.");
      return;
    }

    if (mode === "qa" && !qaQuestion.trim()) {
      setError("Tulis pertanyaan terlebih dahulu.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f, f.name));
    if (mode === "qa") formData.append("question", qaQuestion);
    
    // Add selected language to formData
    formData.append("language", language);

    try {
      const endpoints = {
        simple: ["/summarize", "Gagal meringkas PDF"],
        structured: ["/summarize-structured", "Gagal meringkas terstruktur"],
        multi: ["/summarize-multi", "Gagal meringkas banyak PDF"],
        qa: ["/qa", "Gagal menjawab pertanyaan"],
      };

      const [endpoint, errorMsg] = endpoints[mode];
      const data = await fetchAPI(endpoint, formData, errorMsg);

      if (mode === "simple") setSummary(data.summary);
      else if (mode === "structured") setStructured(data);
      else if (mode === "multi") setMultiResult(data);
      else if (mode === "qa") setQaAnswer(data.answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format) => {
    try {
      if (!structured) {
        setError("Tidak ada data untuk diexport.");
        return;
      }
      const payload = {
        filename: structured.filename || files[0]?.name || "result",
        executive_summary: structured.executive_summary || "",
        bullets: structured.bullets || [],
        highlights: structured.highlights || [],
        qa_pairs: qaAnswer ? [{ question: qaQuestion, answer: qaAnswer }] : [],
        format,
      };
      const resp = await fetch(`${backendUrl}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || "Export gagal");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payload.filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex relative">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 p-6 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">AI PDF Summarizer</h1>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Upload any PDF & AI will make notes & flashcards instantly. This AI will read your PDF and tell you all the important
            stuff in it.
          </p>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <h3 className="text-white font-semibold">Examples</h3>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-white font-medium text-sm mb-1">
                Reading Comprehension:
              </h4>
              <p className="text-gray-400 text-xs">
                Summarize a nonfiction article on ecosystems for 5th-grade
                science and generate key takeaways.
              </p>
            </div>

            <div>
              <h4 className="text-white font-medium text-sm mb-1">
                Study Support:
              </h4>
              <p className="text-gray-400 text-xs">
                Upload a biology textbook chapter and create flashcards for high
                school test prep.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-700">
          <div className="text-gray-400 text-sm">
            <p className="mb-2">Ready to summarize your PDF?</p>
            <p className="text-xs">Upload a file to get started.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          {/* Upload Area */}
          {!summary && !structured && !multiResult && !qaAnswer && (
            <div className="space-y-6">
              <label
                htmlFor="file-upload"
                className="block border-2 border-dashed border-purple-500 rounded-2xl p-16 hover:border-purple-400 transition-colors cursor-pointer bg-gray-800/50"
              >
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-2">
                    Drag & drop a PDF file to upload
                  </h3>
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload').click()}
                    className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Select files
                  </button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>
              </label>
              <div className="text-center">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !files.length}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading ? "Processing..." : "Generate Summary"}
                </button>
              </div>

              {files.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">
                    Selected Files:
                  </h4>
                  <ul className="space-y-1">
                    {files.map((f) => (
                      <li
                        key={f.name}
                        className="text-gray-300 text-sm flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                        {f.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-900/50 border border-red-500 p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-red-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-red-400 font-medium">Error</h3>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {summary && mode === "simple" && (
            <div className="space-y-4">
              <button
                onClick={handleBackToUpload}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Upload
              </button>
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-6 w-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      PDF Summary
                    </h3>
                    {files[0] && (
                      <p className="text-xs text-white/80">{files[0].name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(summary)}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={downloadSummary}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-3 text-sm text-gray-400">
                  ~{wordCount} words
                </div>
                <div className="text-gray-200 leading-relaxed prose prose-invert max-w-none">
                  <ReactMarkdown components={MarkdownComponents}>
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
            </div>
          )}

          {structured && mode === "structured" && (
            <div className="space-y-4">
              <button
                onClick={handleBackToUpload}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Upload
              </button>
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Executive Summary
                  </h3>
                  <p className="text-xs text-white/80">{structured.filename}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(structured?.executive_summary)}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() =>
                      downloadText(
                        structured.executive_summary,
                        `${structured.filename || "summary"}-executive.txt`
                      )
                    }
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="text-gray-200 leading-relaxed whitespace-pre-line mb-6">
                  {structured.executive_summary}
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-white">Bullets</h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      {(structured.bullets || []).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-white">
                      Highlights
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      {(structured.highlights || []).map((h, i) => (
                        <li key={i} className="italic">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => exportData("json")}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => exportData("txt")}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Export TXT
                  </button>
                  <button
                    onClick={() => exportData("csv")}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}

          {multiResult && mode === "multi" && (
            <div className="space-y-6">
              <button
                onClick={handleBackToUpload}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Upload
              </button>
              {(multiResult.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700"
                >
                  <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
                    <h3 className="text-lg font-semibold text-white">
                      {item.filename}
                    </h3>
                  </div>
                  <div className="p-6">
                    <h4 className="font-semibold mb-2 text-white">
                      Executive Summary
                    </h4>
                    <p className="whitespace-pre-line text-gray-300 mb-4">
                      {item.executive_summary}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2 text-white">
                          Bullets
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                          {(item.bullets || []).map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-white">
                          Highlights
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-300">
                          {(item.highlights || []).map((h, i) => (
                            <li key={i} className="italic">
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
                  <h3 className="text-lg font-semibold text-white">
                    Ringkasan Gabungan
                  </h3>
                </div>
                <div className="p-6">
                  <div className="text-gray-200 leading-relaxed prose prose-invert max-w-none">
                    <ReactMarkdown components={MarkdownComponents}>
                      {multiResult.combined_summary}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}

          {qaAnswer && mode === "qa" && (
            <div className="space-y-4">
              <button
                onClick={handleBackToUpload}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Upload
              </button>
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
                <h3 className="text-lg font-semibold text-white">Jawaban</h3>
              </div>
              <div className="p-6">
                <p className="whitespace-pre-line text-gray-200">{qaAnswer}</p>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Menu */}
      {showConfigMenu && files.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
            {/* Header */}
            <div className="bg-gray-900 px-6 py-4 flex items-center justify-between border-b border-gray-700">
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1">Press save to continue</p>
                <div className="bg-gray-700 rounded-full h-2 w-full">
                  <div className="bg-gray-600 h-2 rounded-full w-0"></div>
                </div>
              </div>
              <button
                onClick={handleSaveAndContinue}
                className="ml-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
              >
                Save & continue
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Title */}
              <div>
                <label className="text-white text-lg font-semibold mb-3 block">
                  Title
                </label>
                <input
                  type="text"
                  value={files[0]?.name || ""}
                  readOnly
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 text-sm"
                />
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-white text-lg font-semibold mb-3 block">
                  Select Mode
                </label>
                <select
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="simple">Concise</option>
                  <option value="structured">Executive &amp; bullets</option>
                  <option value="multi">Multi PDF</option>
                  <option value="qa">Q&amp;A</option>
                </select>
              </div>

              {/* Q&A Question Input */}
              {mode === "qa" && (
                <div>
                  <label className="text-white text-lg font-semibold mb-3 block">
                    Your Question
                  </label>
                  <input
                    type="text"
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    placeholder="Tulis pertanyaan berdasarkan isi PDF"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Language */}
              <div>
                <label className="text-white text-lg font-semibold mb-3 block">
                  What language do you want us to create in?
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="english">English</option>
                  <option value="indonesian">Indonesian</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                </select>
              </div>

              {/* Note Length */}
              <div>
                <label className="text-white text-lg font-semibold mb-3 block">
                  How long should the note be?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setNoteLength("in-depth")}
                    className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                      noteLength === "in-depth"
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    In-depth Notes
                  </button>
                  <button
                    onClick={() => setNoteLength("concise")}
                    className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                      noteLength === "concise"
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Concise Summary
                  </button>
                </div>
              </div>

              {/* Note Structure */}
              <div>
                <label className="text-white text-lg font-semibold mb-3 block">
                  How would you like your notes to be structured?
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setNoteStructure("outline")}
                    className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                      noteStructure === "outline"
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Outline Format
                  </button>
                  <button
                    onClick={() => setNoteStructure("paragraph")}
                    className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                      noteStructure === "paragraph"
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Paragraph Format
                  </button>
                  <button
                    onClick={() => setNoteStructure("by-page")}
                    className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                      noteStructure === "by-page"
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    By file page
                  </button>
                </div>
              </div>

              {/* Page Range */}
              <div>
                <label className="text-white text-lg font-semibold mb-3 block">
                  What pages would you like?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPageRange("all")}
                    className={`flex-1 px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                      pageRange === "all"
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    All pages
                  </button>
                  <button
                    onClick={() => setPageRange("custom")}
                    className={`flex-1 px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                      pageRange === "custom"
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    Custom range
                  </button>
                  {pageRange === "custom" && (
                    <input
                      type="text"
                      value={customPages}
                      onChange={(e) => setCustomPages(e.target.value)}
                      placeholder="1-5, 7, 9"
                      className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">
                Please confirm this is the file you'd like to upload
              </h2>
              <p className="text-gray-400 text-sm">
                The uploading may take a few seconds depending on file size.
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto">
              {pendingFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg mb-2 last:mb-0"
                >
                  <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-7 h-7 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmUpload}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={cancelUpload}
                className="w-full bg-transparent hover:bg-gray-700 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}