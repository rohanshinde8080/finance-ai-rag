import React, { useState, useEffect } from "react";
import { docService } from "../services/docService";
import { getErrorMessage } from "../utils/errorHandler";
import {
  FileText,
  UploadCloud,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  FileCheck,
  Search,
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "Banking", label: "Banking & RBI Guidelines" },
  { value: "Taxation", label: "Income Tax & Rules" },
  { value: "GST", label: "GST Rules & Regulations" },
  { value: "Insurance", label: "Insurance Policies (IRDAI)" },
  { value: "Mutual Funds", label: "Mutual Funds (SEBI)" },
  { value: "Stock Market", label: "Stock Market (SEBI)" },
  { value: "RBI Circulars", label: "RBI Circulars" },
  { value: "Government Schemes", label: "Government Financial Schemes" },
  { value: "General", label: "General & Personal Finance" },
];

export const AdminDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Upload state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Banking");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const catParam = selectedCategory === "all" ? null : selectedCategory;
      const data = await docService.listDocuments(0, 100, catParam);
      setDocuments(data.items || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setUploadMessage({ type: "error", text: "Only PDF documents are supported for RAG ingestion." });
        setFile(null);
        return;
      }
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
      setUploadMessage(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadMessage({ type: "error", text: "Please select a valid PDF file." });
      return;
    }
    if (!title.trim()) {
      setUploadMessage({ type: "error", text: "Please enter a descriptive document title." });
      return;
    }

    try {
      setUploading(true);
      setUploadMessage(null);
      const response = await docService.uploadDocument(file, title, uploadCategory);
      setUploadMessage({
        type: "success",
        text: response.message || `Successfully ingested "${response.title}" into ${response.category}.`,
      });
      setFile(null);
      setTitle("");
      // Reset file input
      const fileInput = document.getElementById("pdf-file-input");
      if (fileInput) fileInput.value = "";
      fetchDocuments();
    } catch (err) {
      console.error("Upload error", err);
      const errDetail = getErrorMessage(err, "Document ingestion failed. Please check file formatting.");
      setUploadMessage({ type: "error", text: errDetail });
    } finally {
      setUploading(false);
    }
  };

  const handleReprocess = async (docId) => {
    try {
      setActionLoadingId(docId);
      await docService.reprocessDocument(docId);
      await fetchDocuments();
    } catch (err) {
      console.error("Reprocess error", err);
      alert("Failed to reprocess document: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (docId, docTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${docTitle}"? All associated vector embeddings in PostgreSQL and FAISS will be purged.`)) {
      return;
    }
    try {
      setActionLoadingId(docId);
      await docService.deleteDocument(docId);
      await fetchDocuments();
    } catch (err) {
      console.error("Delete error", err);
      alert("Failed to delete document: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div>
      <div className="admin-title-row">
        <div>
          <h1 className="admin-page-title">Document Ingestion & RAG Knowledge Base</h1>
          <p className="admin-page-subtitle">
            Upload financial PDFs. The pipeline extracts text via PyMuPDF, chunks clauses, and synchronizes embeddings into PostgreSQL pgvector and FAISS.
          </p>
        </div>
      </div>

      {/* PDF Upload Card */}
      <div className="admin-card" style={{ marginBottom: "28px" }}>
        <div className="admin-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UploadCloud size={18} style={{ color: "var(--accent-blue)" }} />
            <span className="admin-card-title">Ingest Financial Document (PDF)</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Supports up to 25MB • Strict Magic Byte Verified</span>
        </div>

        <form onSubmit={handleUpload} style={{ padding: "24px" }}>
          {uploadMessage && (
            <div style={{
              background: uploadMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: uploadMessage.type === "success" ? "var(--accent-green)" : "var(--accent-red)",
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              {uploadMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {uploadMessage.text}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "16px", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--primary-navy)", marginBottom: "6px" }}>
                DOCUMENT TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Circular on Customer Service in Banks"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--primary-navy)", marginBottom: "6px" }}>
                FINANCIAL CATEGORY
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  fontSize: "13px",
                  background: "#FFF",
                }}
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--primary-navy)", marginBottom: "6px" }}>
                SELECT PDF FILE
              </label>
              <input
                id="pdf-file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                required
                style={{
                  width: "100%",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              style={{
                background: "var(--accent-blue)",
                color: "#FFF",
                padding: "10px 22px",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw className="spin" size={15} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Ingest & Vectorize</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Document Library Table */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCheck size={18} style={{ color: "var(--accent-blue)" }} />
            <span className="admin-card-title">Indexed Knowledge Base ({filteredDocs.length} Documents)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "7px 12px 7px 30px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  fontSize: "12px",
                  width: "200px",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={14} style={{ color: "var(--text-muted)" }} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  fontSize: "12px",
                  background: "#FFF",
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>Pages</th>
              <th>Chunks</th>
              <th>Size</th>
              <th>Status</th>
              <th>Indexed At</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>
                  <RefreshCw className="spin" size={20} style={{ margin: "0 auto 8px" }} />
                  <div>Loading document registry...</div>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                  <FileText size={32} style={{ color: "var(--border-color)", margin: "0 auto 8px" }} />
                  <p>No financial documents found matching the filter criteria.</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Upload a PDF document above to start indexing financial guidance.
                  </p>
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--primary-navy)", fontSize: "13px" }}>{doc.title}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{doc.file_name}</div>
                  </td>
                  <td>
                    <span style={{
                      background: "rgba(30, 62, 98, 0.08)",
                      color: "var(--primary-slate)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}>
                      {doc.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>{doc.total_pages}</td>
                  <td style={{ fontWeight: 600, color: "var(--accent-blue)" }}>{doc.total_chunks}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{formatFileSize(doc.file_size)}</td>
                  <td>
                    <span className={`status-badge ${doc.status.toLowerCase()}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button
                        onClick={() => handleReprocess(doc.id)}
                        disabled={actionLoadingId === doc.id}
                        title="Reprocess chunks & rebuild vectors"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border-color)",
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--primary-navy)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        <RefreshCw size={13} className={actionLoadingId === doc.id ? "spin" : ""} />
                        <span>Re-index</span>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        disabled={actionLoadingId === doc.id}
                        title="Delete document and purge vectors"
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "none",
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--accent-red)",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

