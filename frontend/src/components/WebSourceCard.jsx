import React from "react";
import { Globe, ExternalLink } from "lucide-react";

export const WebSourceCard = ({ source }) => {
  return (
    <div style={{
      background: "#FFF",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-md)",
      padding: "10px 14px",
      fontSize: "12px",
      boxShadow: "var(--shadow-sm)"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Globe size={16} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 600, color: "var(--primary-navy)", display: "flex", alignItems: "center", gap: "4px" }}
          >
            {source.title} <ExternalLink size={12} />
          </a>
        </div>

        <span style={{
          background: "rgba(245, 158, 11, 0.12)",
          color: "var(--accent-amber)",
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          fontWeight: 700,
          fontSize: "10px",
          textTransform: "uppercase"
        }}>
          {source.domain || "Official Portal"}
        </span>
      </div>

      {source.snippet && (
        <div style={{ marginTop: "6px", color: "var(--text-secondary)", fontSize: "11px", lineHeight: "1.4" }}>
          {source.snippet}
        </div>
      )}
    </div>
  );
};

