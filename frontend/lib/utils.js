/**
 * Utility functions for formatting and data manipulation
 */

// Date formatting
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString();
  } catch (error) {
    return "Invalid Date";
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString();
  } catch (error) {
    return "Invalid Date";
  }
};

// Text operations
export const copyText = async (text, addNotification) => {
  try {
    await navigator.clipboard.writeText(text);
    if (addNotification) {
      addNotification("✅ Text copied to clipboard!", "success");
    }
  } catch (err) {
    console.error("Failed to copy:", err);
    if (addNotification) {
      addNotification("❌ Failed to copy text", "error");
    }
  }
};

export const downloadText = (text, filename, addNotification) => {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (addNotification) {
    addNotification(`✅ Downloaded as ${filename}`, "success");
  }
};

// Export functions
export const exportToJSON = (summaryData, selectedPDF, filename, addNotification) => {
  try {
    const exportData = {
      pdf_filename: selectedPDF?.original_filename || "Unknown",
      summary_mode: summaryData.mode,
      language: summaryData.language,
      created_at: summaryData.created_at,
      processing_time: summaryData.processing_time,
      pages_processed: summaryData.pages_processed,
      summary: {}
    };

    if (summaryData.mode === "simple") {
      exportData.summary.text = summaryData.summary_text;
    } else if (summaryData.mode === "structured") {
      exportData.summary.executive_summary = summaryData.executive_summary;
      exportData.summary.key_points = summaryData.bullets ? JSON.parse(summaryData.bullets) : [];
      exportData.summary.highlights = summaryData.highlights ? JSON.parse(summaryData.highlights) : [];
    } else if (summaryData.mode === "qa") {
      exportData.summary.question = summaryData.qa_question;
      exportData.summary.answer = summaryData.qa_answer;
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (addNotification) {
      addNotification(`✅ Exported as ${filename}`, "success");
    }
  } catch (err) {
    console.error("Failed to export JSON:", err);
    if (addNotification) {
      addNotification("❌ Failed to export JSON", "error");
    }
  }
};

export const exportToCSV = (summaryData, selectedPDF, filename, addNotification) => {
  try {
    let csvContent = "";
    
    csvContent += "Field,Value\n";
    csvContent += `"PDF Filename","${(selectedPDF?.original_filename || "Unknown").replace(/"/g, '""')}"\n`;
    csvContent += `"Summary Mode","${summaryData.mode}"\n`;
    csvContent += `"Language","${summaryData.language}"\n`;
    csvContent += `"Created At","${summaryData.created_at}"\n`;
    csvContent += `"Processing Time","${summaryData.processing_time}s"\n`;
    csvContent += `"Pages Processed","${summaryData.pages_processed || 'N/A'}"\n`;
    csvContent += "\n";

    if (summaryData.mode === "simple") {
      csvContent += `"Summary Text","${(summaryData.summary_text || "").replace(/"/g, '""').replace(/\n/g, ' ')}"\n`;
    } else if (summaryData.mode === "structured") {
      csvContent += `"Executive Summary","${(summaryData.executive_summary || "").replace(/"/g, '""').replace(/\n/g, ' ')}"\n`;
      csvContent += "\n";
      
      const bullets = summaryData.bullets ? JSON.parse(summaryData.bullets) : [];
      csvContent += "Key Points\n";
      bullets.forEach((bullet, i) => {
        csvContent += `"${i + 1}","${bullet.replace(/"/g, '""')}"\n`;
      });
      csvContent += "\n";
      
      const highlights = summaryData.highlights ? JSON.parse(summaryData.highlights) : [];
      csvContent += "Highlights\n";
      highlights.forEach((highlight, i) => {
        csvContent += `"${i + 1}","${highlight.replace(/"/g, '""')}"\n`;
      });
    } else if (summaryData.mode === "qa") {
      csvContent += `"Question","${(summaryData.qa_question || "").replace(/"/g, '""')}"\n`;
      csvContent += `"Answer","${(summaryData.qa_answer || "").replace(/"/g, '""').replace(/\n/g, ' ')}"\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (addNotification) {
      addNotification(`✅ Exported as ${filename}`, "success");
    }
  } catch (err) {
    console.error("Failed to export CSV:", err);
    if (addNotification) {
      addNotification("❌ Failed to export CSV", "error");
    }
  }
};
