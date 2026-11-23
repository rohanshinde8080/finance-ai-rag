import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

export const CitationCard = ({ citation }) => {
  const [expanded, setExpanded] = useState(false);

  const matchPercent = Math.round((citation.similarity_score || 0) * 100);

  return (
    <div style={{
      background: "#FFF",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-md)",
      padding: "10px 14px",
      fontSize: "12px",
      boxShadow: "var(--shadow-sm)",
      transition: "border-color 0.2s"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <FileText size={16} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: "var(--primary-navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={citation.document_title}>
            {citation.document_title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span style={{
            background: "rgba(0, 141, 218, 0.12)",
            color: "var(--accent-blue)",
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
            fontWeight: 700,
            fontSize: "11px"
          }}>
            Page {citation.page_number}
          </span>

          <span style={{
            background: "rgba(16, 185, 129, 0.12)",
            color: "var(--accent-green)",
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
            fontWeight: 700,
            fontSize: "11px"
          }}>
            {matchPercent}% Match
          </span>

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              padding: "2px"
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{
          marginTop: "8px",
          padding: "8px 10px",
          background: "var(--bg-main)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          lineHeight: "1.4",
          fontFamily: "monospace",
          fontSize: "11px",
          borderLeft: "3px solid var(--accent-blue)"
        }}>
          "{citation.snippet}"
        </div>
      )}
    </div>
  );
};

