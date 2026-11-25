import React, { useState, useEffect } from "react";
import { docService } from "../services/docService";
import { X, FileText, Search, Filter, BookOpen, Layers, Calendar, HardDrive, CheckCircle } from "lucide-react";

export const MyDocumentsModal = ({ isOpen, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const CATEGORIES = [
    "All",
    "Banking",
    "Taxation",
    "GST",
    "Insurance",
    "Mutual Funds",
    "Stock Market",
    "RBI Circulars",
    "Government Schemes"
  ];

  useEffect(() => {
    if (isOpen) {
      loadDocs();
    }
  }, [isOpen]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await docService.listDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "860px",
          height: "640px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-color)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-main)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(0, 141, 218, 0.12)",
                color: "var(--accent-blue)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>My Regulatory Documents</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Authoritative financial circulars and official publications indexed in the RAG vector store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            padding: "14px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            background: "var(--bg-card)",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "11px" }} />
            <input
              type="text"
              placeholder="Search by title, filename, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-main)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-main)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Document Grid / List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
              Loading indexed documents...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)" }}>
              <FileText size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px auto" }} />
              <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>No documents found</h4>
              <p style={{ fontSize: "13px" }}>
                {searchQuery ? "No documents match your search criteria." : "No documents have been indexed yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px",
                    background: "var(--bg-main)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span
                        style={{
                          background: "rgba(0, 141, 218, 0.12)",
                          color: "var(--accent-blue)",
                          padding: "3px 8px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {doc.category || "General"}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: doc.processing_status === "INDEXED" ? "var(--accent-green)" : "var(--accent-amber)",
                        }}
                      >
                        <CheckCircle size={12} /> {doc.processing_status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px", lineHeight: 1.4 }}>
                      {doc.title}
                    </h4>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                      {doc.original_filename}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <BookOpen size={13} /> {doc.total_pages || 1} Pages
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Layers size={13} /> {doc.total_chunks || 0} Chunks
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={13} /> {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
