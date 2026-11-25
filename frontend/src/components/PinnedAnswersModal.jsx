import React, { useState } from "react";
import { X, Pin, Trash2, Copy, Check, MessageSquare, BookOpen, ExternalLink } from "lucide-react";

export const PinnedAnswersModal = ({ isOpen, onClose, pinnedAnswers = [], onUnpin }) => {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = pinnedAnswers.filter(
    (item) =>
      item.question?.toLowerCase().includes(search.toLowerCase()) ||
      item.answer?.toLowerCase().includes(search.toLowerCase())
  );

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
          maxWidth: "800px",
          height: "600px",
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
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--accent-amber)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pin size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>Pinned Financial Answers</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Bookmarked grounded explanations and regulatory citations ({pinnedAnswers.length} saved)
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

        {/* Search */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border-color)" }}>
          <input
            type="text"
            placeholder="Search within pinned answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-main)",
              color: "var(--text-primary)",
              fontSize: "13px",
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)" }}>
              <Pin size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px auto" }} />
              <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                No pinned answers yet
              </h4>
              <p style={{ fontSize: "13px" }}>
                Click the 📌 Pin icon next to any assistant answer in the chat to bookmark it here for quick access!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "var(--bg-main)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-blue)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MessageSquare size={14} /> Q: {item.question}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleCopy(item.id, item.answer)}
                        title="Copy answer"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                          padding: "5px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {copiedId === item.id ? <Check size={13} color="var(--accent-green)" /> : <Copy size={13} />}
                        {copiedId === item.id ? "Copied" : "Copy"}
                      </button>
                      <button
                        onClick={() => onUnpin(item.id)}
                        title="Unpin"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                          padding: "5px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          color: "var(--accent-red)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Trash2 size={13} /> Unpin
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: "12px" }}>
                    {item.answer}
                  </p>

                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Pinned on {new Date(item.pinned_at || Date.now()).toLocaleDateString()}
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
