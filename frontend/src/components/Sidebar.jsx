import React from "react";
import { Plus, MessageSquare, Trash2, Filter } from "lucide-react";

export const Sidebar = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  selectedCategory,
  onSelectCategory,
}) => {
  const CATEGORIES = [
    "All Categories",
    "Banking",
    "Taxation",
    "GST",
    "Insurance",
    "Mutual Funds",
    "Stock Market",
    "RBI Circulars",
    "Government Schemes"
  ];

  return (
    <aside style={{
      width: "280px",
      height: "calc(100vh - 64px)",
      background: "var(--primary-navy)",
      color: "#FFF",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid rgba(255, 255, 255, 0.1)",
      flexShrink: 0
    }}>
      {/* New Chat Button */}
      <div style={{ padding: "16px 16px 12px 16px" }}>
        <button
          onClick={onNewSession}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "var(--accent-blue)",
            color: "#FFF",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontWeight: 600,
            fontSize: "14px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-blue-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-blue)")}
        >
          <Plus size={18} /> New Conversation
        </button>
      </div>

      {/* Category Domain Filter */}
      <div style={{ padding: "0 16px 12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
          <Filter size={12} /> DOMAIN FOCUS
        </div>
        <select
          value={selectedCategory || "All Categories"}
          onChange={(e) => onSelectCategory(e.target.value === "All Categories" ? null : e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "var(--primary-slate)",
            color: "#FFF",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px"
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat} style={{ background: "var(--primary-navy)", color: "#FFF" }}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div style={{ padding: "0 16px 6px 16px", fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
        Recent History
      </div>

      {/* Sessions List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px 8px" }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)", fontSize: "13px" }}>
            No past conversations yet.<br />Start by asking a question!
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "4px",
                  cursor: "pointer",
                  background: isActive ? "var(--primary-slate)" : "transparent",
                  color: isActive ? "#FFF" : "rgba(255, 255, 255, 0.75)",
                  transition: "background 0.15s"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                  <MessageSquare size={16} color={isActive ? "var(--accent-blue)" : "rgba(255, 255, 255, 0.5)"} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={s.title}>
                    {s.title}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this conversation?")) {
                      onDeleteSession(s.id);
                    }
                  }}
                  title="Delete conversation"
                  style={{
                    background: "transparent",
                    color: "rgba(255, 255, 255, 0.4)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-red)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

