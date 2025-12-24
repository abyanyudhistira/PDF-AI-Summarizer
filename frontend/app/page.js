"use client";

import { useState } from "react";

export default function Home() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("simple"); // simple | structured | multi | qa
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

  const copySummary = async () => copyText(summary);
  const copyExec = async () =>
    copyText(structured ? structured.executive_summary : "");

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
      file?.name?.replace(/\.pdf$/i, "") || structured?.filename || "summary";
    downloadText(summary, `${base}-summary.txt`);
  };

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    setFile(list[0] || null);
    setError("");
    setSummary("");
    setStructured(null);
    setMultiResult(null);
    setQaAnswer("");
  };

  const handleSubmit = async () => {
    setError("");
    setSummary("");
    setStructured(null);
    setMultiResult(null);
    setQaAnswer("");

    if (mode === "multi") {
      if (!files.length) {
        setError("Pilih minimal satu PDF.");
        return;
      }
      await summarizeMulti();
      return;
    }

    if (!file) {
      setError("Pilih file PDF terlebih dahulu.");
      return;
    }

    if (mode === "simple") await summarizeSimple();
    else if (mode === "structured") await summarizeStructured();
    else if (mode === "qa") await askQuestion();
  };

  const summarizeSimple = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${backendUrl}/summarize`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Gagal meringkas PDF");
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const summarizeStructured = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${backendUrl}/summarize-structured`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Gagal meringkas terstruktur");
      }
      const data = await response.json();
      setStructured(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const summarizeMulti = async () => {
    setLoading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f, f.name));
    try {
      const response = await fetch(`${backendUrl}/summarize-multi`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Gagal meringkas banyak PDF");
      }
      const data = await response.json();
      setMultiResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!qaQuestion.trim()) {
      setError("Tulis pertanyaan terlebih dahulu.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("question", qaQuestion);
    try {
      const response = await fetch(`${backendUrl}/qa`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Gagal menjawab pertanyaan");
      }
      const data = await response.json();
      setQaAnswer(data.answer);
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
        filename: structured.filename || (file ? file.name : "result"),
        executive_summary: structured.executive_summary || "",
        bullets: structured.bullets || [],
        highlights: structured.highlights || [],
        qa_pairs: qaAnswer
          ? [{ question: qaQuestion, answer: qaAnswer }]
          : [],
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center text-black">
          <h1 className="text-4xl font-extrabold text-black sm:text-5xl">
            PDF AI Summarizer
          </h1>
          <p className="mt-3 text-xl text-black">
            Unggah PDF dan dapatkan ringkasan, bullet, Q&amp;A, dan export.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-black">
                Upload PDF
              </label>
              <label
                htmlFor="file-upload"
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors cursor-pointer w-full"
              >
                <div className="space-y-1 text-center w-full text-black">
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
                  <div className="flex text-sm text-black justify-center">
                    <div>
                      <p className="pl-1 text-black">
                        Upload file (bisa pilih banyak) atau drag &amp; drop
                      </p>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf"
                        multiple
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-black">PDF sampai 10MB</p>
                </div>
              </label>
            </div>

            {files.length > 0 && (
              <div className="text-sm text-black">
                Dipilih:
                <ul className="mt-1 list-disc list-inside">
                  {files.map((f) => (
                    <li key={f.name} className="text-black">
                      {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-black">
                Mode
              </label>
              <select
                className="border rounded-md px-2 py-1 text-sm text-black"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="simple">Ringkasan sederhana</option>
                <option value="structured">Executive &amp; bullets</option>
                <option value="multi">Multi PDF</option>
                <option value="qa">Q&amp;A</option>
              </select>
            </div>

            {mode === "qa" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pertanyaan
                </label>
                <input
                  type="text"
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="Tulis pertanyaan berdasarkan isi PDF"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  (mode === "multi" ? files.length === 0 : !file) ||
                  (mode === "qa" && !qaQuestion.trim())
                }
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
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
                    Memproses...
                  </>
                ) : mode === "simple" ? (
                  "Ringkas PDF"
                ) : mode === "structured" ? (
                  "Buat Executive & Bullets"
                ) : mode === "multi" ? (
                  "Ringkas Multi PDF"
                ) : (
                  "Jawab Q&A"
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

        {summary && mode === "simple" && (
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
              <div className="mb-3 text-sm text-black">
                ~{wordCount} words
              </div>
              <div className="text-black leading-relaxed whitespace-pre-line">
                {summary}
              </div>
            </div>
          </div>
        )}

        {structured && mode === "structured" && (
          <div className="bg-white shadow-lg sm:rounded-xl overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 bg-indigo-600 text-white">
              <div>
                <h3 className="text-lg font-semibold">Executive Summary</h3>
                <p className="text-xs opacity-80">{structured.filename}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyExec}
                  className="inline-flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
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
                  className="inline-flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Download
                </button>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="text-black leading-relaxed whitespace-pre-line">
                {structured.executive_summary}
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-black">Bullets</h4>
                  <ul className="list-disc list-inside space-y-1 text-black">
                    {(structured.bullets || []).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-black">Highlights</h4>
                  <ul className="list-disc list-inside space-y-1 text-black">
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
                  className="px-3 py-2 bg-gray-800 text-white rounded-md text-sm"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => exportData("txt")}
                  className="px-3 py-2 bg-gray-800 text-white rounded-md text-sm"
                >
                  Export TXT
                </button>
                <button
                  onClick={() => exportData("csv")}
                  className="px-3 py-2 bg-gray-800 text-white rounded-md text-sm"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {multiResult && mode === "multi" && (
          <div className="space-y-6">
            {(multiResult.items || []).map((item, idx) => (
              <div
                key={idx}
                className="bg-white shadow sm:rounded-xl overflow-hidden border border-gray-200"
              >
                <div className="px-4 py-4 sm:px-6 bg-indigo-600 text-white">
                  <h3 className="text-lg font-semibold">{item.filename}</h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <h4 className="font-semibold mb-2">Executive Summary</h4>
                  <p className="whitespace-pre-line text-black">
                    {item.executive_summary}
                  </p>
                  <div className="mt-4 grid sm:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2 text-black">Bullets</h4>
                      <ul className="list-disc list-inside space-y-1 text-black">
                        {(item.bullets || []).map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Highlights</h4>
                      <ul className="list-disc list-inside space-y-1 text-black">
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
            <div className="bg-white shadow sm:rounded-xl overflow-hidden border border-gray-200">
              <div className="px-4 py-4 sm:px-6 bg-indigo-600 text-white">
                <h3 className="text-lg font-semibold">Ringkasan Gabungan</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <p className="whitespace-pre-line text-black">
                  {multiResult.combined_summary}
                </p>
              </div>
            </div>
          </div>
        )}

        {qaAnswer && mode === "qa" && (
          <div className="bg-white shadow sm:rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 py-4 sm:px-6 bg-indigo-600 text-white">
              <h3 className="text-lg font-semibold">Jawaban</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <p className="whitespace-pre-line text-black">{qaAnswer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
