import React, { useState } from "react";
import { X, Bell, Check, Trash2, Calendar, AlertCircle, Info, Landmark } from "lucide-react";

export const NotificationsModal = ({ isOpen, onClose, notifications = [], onMarkRead, onMarkAllRead, onClearAll }) => {
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
          maxWidth: "700px",
          height: "560px",
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
              <Bell size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>Regulatory Notifications</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Tax deadlines, monetary policy releases & platform updates
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

        {/* Toolbar */}
        <div
          style={{
            padding: "10px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            {notifications.filter((n) => !n.read).length} Unread Alerts
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onMarkAllRead}
              style={{
                background: "transparent",
                color: "var(--accent-blue)",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              Mark all as read
            </button>
            <button
              onClick={onClearAll}
              style={{
                background: "transparent",
                color: "var(--accent-red)",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)" }}>
              <Bell size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px auto" }} />
              <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                All caught up!
              </h4>
              <p style={{ fontSize: "13px" }}>You have no pending financial notices or regulatory alerts.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    border: n.read ? "1px solid var(--border-color)" : "1px solid rgba(0, 141, 218, 0.3)",
                    background: n.read ? "var(--bg-main)" : "rgba(0, 141, 218, 0.04)",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div style={{ fontWeight: n.read ? 600 : 700, fontSize: "13px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      {!n.read && (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "var(--accent-blue)",
                            display: "inline-block",
                          }}
                        />
                      )}
                      {n.title}
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={11} /> {n.time}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
