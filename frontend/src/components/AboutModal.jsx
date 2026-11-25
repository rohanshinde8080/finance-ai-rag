import React from "react";
import { X, Info, Cpu, Database, ShieldCheck, Layers, GitBranch, ExternalLink, Globe } from "lucide-react";

export const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          maxWidth: "740px",
          maxHeight: "85vh",
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
                background: "linear-gradient(135deg, var(--accent-blue), var(--primary-navy))",
                color: "#FFF",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "16px",
              }}
            >
              F
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>About FinanceAI</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Domain-Specific Financial Assistant using Retrieval-Augmented Generation (RAG)
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

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Project Summary */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              Academic & Industry Background
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              FinanceAI is an enterprise-grade financial regulatory assistant built as an <strong>MCA Final Year Major Project</strong>. It addresses the critical challenge of hallucinations in LLMs by grounding every financial fact, tax slab, and policy rule directly in authoritative Indian documentation published by <strong>RBI, SEBI, CBIC, and the Income Tax Department</strong>.
            </p>
          </div>

          {/* Technical Architecture Specs */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
              System Architecture & Core Engineering
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "var(--bg-main)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--accent-blue)", marginBottom: "4px" }}>
                  <Layers size={14} /> PDF Ingestion & Chunking
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  PyMuPDF layout-preserving text extraction with recursive semantic chunking (800 chars, 100 overlap).
                </div>
              </div>

              <div style={{ background: "var(--bg-main)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--accent-blue)", marginBottom: "4px" }}>
                  <Database size={14} /> Dual-Vector Storage
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  PostgreSQL 16 + pgvector for persistent relational vectors, synchronized with FAISS in-memory index.
                </div>
              </div>

              <div style={{ background: "var(--bg-main)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--accent-blue)", marginBottom: "4px" }}>
                  <Cpu size={14} /> Dense Embeddings & LLM
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Sentence-Transformers (<code>all-MiniLM-L6-v2</code>) generating 384-dimensional dense vectors + Google Gemini 3.5 Flash Lite.
                </div>
              </div>

              <div style={{ background: "var(--bg-main)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--accent-blue)", marginBottom: "4px" }}>
                  <Globe size={14} /> Live Regulatory Fallback
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Gated confidence threshold (0.70). Sub-threshold queries automatically route to official government web domains via Tavily.
                </div>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div
            style={{
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 14px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <strong>Mandatory Legal & Financial Disclaimer:</strong> FinanceAI is an academic demonstration and AI research assistant based on publicly available documentation. It does NOT constitute certified financial, tax, investment, or legal advice. Consult certified Chartered Accountants (CAs) and SEBI-registered advisors for certified financial planning.
          </div>
        </div>
      </div>
    </div>
  );
};
