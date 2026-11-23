import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, LogOut, LayoutDashboard, MessageSquare } from "lucide-react";

export const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header style={{
      height: "64px",
      background: "var(--bg-card)",
      borderBottom: "1px solid var(--border-color)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      boxShadow: "var(--shadow-sm)",
      zIndex: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{
            background: "linear-gradient(135deg, #008DDA, #0B192C)",
            color: "#FFF",
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "18px"
          }}>
            F
          </div>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--primary-navy)", letterSpacing: "-0.5px" }}>
            Finance<span style={{ color: "var(--accent-blue)" }}>AI</span>
          </span>
        </Link>
        <span style={{
          background: "rgba(0, 141, 218, 0.1)",
          color: "var(--accent-blue)",
          padding: "3px 8px",
          borderRadius: "var(--radius-full)",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase"
        }}>
          RAG Verified
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {isAdmin && (
          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              to="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "transparent"
              }}
            >
              <MessageSquare size={16} /> User Chat
            </Link>
            <Link
              to="/admin/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 600,
                color: "#FFF",
                background: "var(--primary-navy)"
              }}
            >
              <LayoutDashboard size={16} /> Admin Portal
            </Link>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "12px", borderLeft: "1px solid var(--border-color)" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{user?.full_name}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{user?.email}</div>
          </div>

          <span style={{
            background: isAdmin ? "rgba(16, 185, 129, 0.15)" : "rgba(30, 62, 98, 0.1)",
            color: isAdmin ? "var(--accent-green)" : "var(--primary-slate)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase"
          }}>
            {user?.role}
          </span>

          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-red)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

