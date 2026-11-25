import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Filter,
  FileText,
  TrendingUp,
  Pin,
  Bell,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  ChevronDown,
  ChevronRight,
  Search,
  History
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  selectedCategory,
  onSelectCategory,
  onOpenModal,
  pinnedCount = 0,
  unreadNotifCount = 0,
}) => {
  const { user, logout } = useAuth();
  const [historySearch, setHistorySearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);

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

  const filteredSessions = sessions.filter((s) =>
    (s.title || "").toLowerCase().includes(historySearch.toLowerCase())
  );

  const menuItems = [
    {
      id: "new_chat",
      label: "New Chat",
      icon: Plus,
      action: onNewSession,
      color: "var(--accent-blue)",
    },
    {
      id: "chat_history",
      label: "Chat History",
      icon: History,
      action: () => setHistoryOpen(!historyOpen),
      badge: sessions.length > 0 ? String(sessions.length) : null,
    },
    {
      id: "my_documents",
      label: "My Documents",
      icon: FileText,
      action: () => onOpenModal && onOpenModal("documents"),
    },
    {
      id: "financial_insights",
      label: "Financial Insights",
      icon: TrendingUp,
      action: () => onOpenModal && onOpenModal("insights"),
    },
    {
      id: "pinned_answers",
      label: "Pinned Answers",
      icon: Pin,
      action: () => onOpenModal && onOpenModal("pinned"),
      badge: pinnedCount > 0 ? String(pinnedCount) : null,
      badgeColor: "var(--accent-amber)",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      action: () => onOpenModal && onOpenModal("notifications"),
      badge: unreadNotifCount > 0 ? String(unreadNotifCount) : null,
      badgeColor: "var(--accent-red)",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      action: () => onOpenModal && onOpenModal("settings", "profile"),
    },
    {
      id: "help_support",
      label: "Help & Support",
      icon: HelpCircle,
      action: () => onOpenModal && onOpenModal("help"),
    },
    {
      id: "about_financeai",
      label: "About FinanceAI",
      icon: Info,
      action: () => onOpenModal && onOpenModal("about"),
    },
  ];

  return (
    <aside
      style={{
        width: "290px",
        height: "calc(100vh - 64px)",
        background: "var(--primary-navy)",
        color: "#FFF",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* 1. New Conversation Primary Action */}
      <div style={{ padding: "16px 14px 10px 14px" }}>
        <button
          onClick={onNewSession}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "linear-gradient(135deg, var(--accent-blue), #0070B8)",
            color: "#FFF",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontWeight: 600,
            fontSize: "13px",
            boxShadow: "0 2px 6px rgba(0, 141, 218, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          <Plus size={18} /> New Conversation
        </button>
      </div>

      {/* 2. Domain Focus Filter */}
      <div style={{ padding: "0 14px 10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
          <Filter size={11} /> DOMAIN FOCUS
        </div>
        <select
          value={selectedCategory || "All Categories"}
          onChange={(e) => onSelectCategory(e.target.value === "All Categories" ? null : e.target.value)}
          style={{
            width: "100%",
            padding: "7px 10px",
            background: "var(--primary-slate)",
            color: "#FFF",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "var(--radius-sm)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat} style={{ background: "var(--primary-navy)", color: "#FFF" }}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Core Working Menu Options */}
      <div style={{ padding: "0 8px 8px 8px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={item.action}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                color: "rgba(255, 255, 255, 0.82)",
                fontSize: "13px",
                fontWeight: 500,
                transition: "all 0.15s ease",
                marginBottom: "2px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "#FFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.82)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Icon size={16} color={item.color || "rgba(255, 255, 255, 0.65)"} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    background: item.badgeColor || "rgba(255, 255, 255, 0.15)",
                    color: "#FFF",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full)",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Chat History Section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <div
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            padding: "10px 14px 6px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            fontSize: "11px",
            color: "var(--text-muted)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <span>Recent History</span>
          {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {historyOpen && (
          <>
            {sessions.length > 5 && (
              <div style={{ padding: "0 10px 6px 10px" }}>
                <div style={{ position: "relative" }}>
                  <Search size={12} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: "8px", top: "7px" }} />
                  <input
                    type="text"
                    placeholder="Filter conversations..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "5px 8px 5px 26px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "var(--radius-sm)",
                      color: "#FFF",
                      fontSize: "11px",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 10px 6px" }}>
              {filteredSessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 12px", color: "var(--text-muted)", fontSize: "12px" }}>
                  {sessions.length === 0 ? "No past chats yet.\nAsk a question to start!" : "No matching chats."}
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectSession(s.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "2px",
                        cursor: "pointer",
                        background: isActive ? "var(--primary-slate)" : "transparent",
                        color: isActive ? "#FFF" : "rgba(255, 255, 255, 0.75)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
                        <MessageSquare
                          size={14}
                          color={isActive ? "var(--accent-blue)" : "rgba(255, 255, 255, 0.4)"}
                          style={{ flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={s.title}
                        >
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
                          color: "rgba(255, 255, 255, 0.35)",
                          padding: "3px",
                          display: "flex",
                          alignItems: "center",
                          borderRadius: "4px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-red)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.35)")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* 5. Bottom User Identity & Logout Bar */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(0, 0, 0, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          onClick={() => onOpenModal && onOpenModal("settings", "profile")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            overflow: "hidden",
            cursor: "pointer",
          }}
          title="Open Profile Settings"
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent-blue), #0B192C)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#FFF",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.full_name || "User Account"}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to log out?")) {
              logout();
            }
          }}
          title="Log Out"
          style={{
            background: "transparent",
            color: "rgba(255, 255, 255, 0.6)",
            padding: "6px",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent-red)";
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
