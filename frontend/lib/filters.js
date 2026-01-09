/**
 * Filter and sort logic for PDFs and Summaries
 */

// Filter and sort PDFs
export const filterAndSortPDFs = (
  pdfList,
  searchQuery,
  sortBy,
  filterType,
  filterDate
) => {
  return pdfList
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
};

// Filter and sort summaries
export const filterAndSortSummaries = (
  summaryHistory,
  summarySortBy,
  summaryFilterMode,
  summaryFilterLanguage,
  summaryFilterDate
) => {
  return summaryHistory
    .filter((summary) => {
      // Filter by mode
      let matchesMode = true;
      if (summaryFilterMode !== "all") {
        matchesMode = summary.mode === summaryFilterMode;
      }

      // Filter by language
      let matchesLanguage = true;
      if (summaryFilterLanguage !== "all") {
        matchesLanguage = summary.language === summaryFilterLanguage;
      }

      // Filter by date
      let matchesDate = true;
      if (summaryFilterDate !== "all" && summary.created_at) {
        const createdDate = new Date(summary.created_at);
        const now = new Date();
        const diffTime = now - createdDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (summaryFilterDate === "today") {
          matchesDate = diffDays < 1;
        } else if (summaryFilterDate === "week") {
          matchesDate = diffDays < 7;
        } else if (summaryFilterDate === "month") {
          matchesDate = diffDays < 30;
        }
      }

      return matchesMode && matchesLanguage && matchesDate;
    })
    .sort((a, b) => {
      if (summarySortBy === "latest") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (summarySortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (summarySortBy === "mode") {
        return a.mode.localeCompare(b.mode);
      } else if (summarySortBy === "processing-time") {
        return (b.processing_time || 0) - (a.processing_time || 0);
      }
      return 0;
    });
};

// Pagination helper
export const paginate = (items, currentPage, itemsPerPage) => {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    totalPages,
    startIndex,
    endIndex,
  };
};
