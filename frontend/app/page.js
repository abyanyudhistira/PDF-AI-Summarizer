"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wordCount = summary ? summary.trim().split(/\s+/).length : 0;

  const copySummary = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
    } catch {}
  };

  const downloadSummary = () => {
    if (!summary) return;
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file
      ? `${file.name.replace(/\.pdf$/i, "")}-summary.txt`
      : "summary.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setError("");
      setSummary("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/summarize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to summarize PDF");
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            PDF AI Summarizer
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Upload your PDF document and get a concise summary powered by AI.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Upload PDF
              </label>
              <label
                htmlFor="file-upload"
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors cursor-pointer w-full"
              >
                <div className="space-y-1 text-center w-full">
                  <svg
                    className="mx-auto h-12 w-12 text-red-500"
                    viewBox="0 0 64 64"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <rect
                      x="20"
                      y="12"
                      width="24"
                      height="32"
                      rx="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      d="M36 12v8h8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <rect
                      x="22"
                      y="32"
                      width="20"
                      height="10"
                      rx="2"
                      fill="currentColor"
                    />
                    <text
                      x="32"
                      y="39"
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="700"
                      fill="#ffffff"
                    >
                      PDF
                    </text>
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <div>
                      <p className="pl-1">Upload a file or drag and drop</p>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">PDF up to 10MB</p>
                </div>
              </label>
            </div>

            {file && (
              <div className="text-sm text-gray-500 text-center">
                Selected file:{" "}
                <span className="font-medium text-gray-900">{file.name}</span>
              </div>
            )}

            <div>
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  loading || !file ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Summarizing...
                  </>
                ) : (
                  "Summarize PDF"
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div className="bg-white shadow-lg sm:rounded-xl overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 bg-red-600 text-white">
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect
                    x="5"
                    y="3"
                    width="10"
                    height="14"
                    rx="2"
                    fill="#fff"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M13 3v4h4" fill="#fff" />
                  <rect
                    x="7"
                    y="12"
                    width="6"
                    height="4"
                    rx="1"
                    fill="currentColor"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold">PDF Summary</h3>
                  {file && <p className="text-xs opacity-80">{file.name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copySummary}
                  className="inline-flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <rect x="3" y="3" width="13" height="13" rx="2"></rect>
                  </svg>
                  Copy
                </button>
                <button
                  onClick={downloadSummary}
                  className="inline-flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 3v12m0 0l4-4m-4 4l-4-4"></path>
                    <path d="M4 19h16"></path>
                  </svg>
                  Download
                </button>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-3 text-sm text-gray-500">
                ~{wordCount} words
              </div>
              <div className="text-gray-800 leading-relaxed whitespace-pre-line">
                {summary}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
