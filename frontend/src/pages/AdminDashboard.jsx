import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../services/adminService";
import {
  Users,
  FileText,
  Database,
  MessageSquare,
  Globe,
  ThumbsUp,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Clock,
  Activity,
  CheckCircle2,
} from "lucide-react";

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [statsData, logsData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAuditLogs(0, 8),
      ]);
      setStats(statsData);
      setAuditLogs(logsData.items || []);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
      setError("Failed to fetch real-time administration statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <RefreshCw className="spin" size={32} style={{ color: "var(--accent-blue)" }} />
        <p style={{ marginTop: "12px", color: "var(--text-secondary)", fontSize: "14px" }}>
          Aggregating telemetry and vector statistics...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-title-row">
        <div>
          <h1 className="admin-page-title">System Overview & Telemetry</h1>
          <p className="admin-page-subtitle">
            Real-time monitoring of FAISS vector indices, document grounding rates, and user engagement.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#FFF",
            border: "1px solid var(--border-color)",
            padding: "8px 16px",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--primary-navy)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={15} className={refreshing ? "spin" : ""} />
          <span>{refreshing ? "Refreshing..." : "Refresh Telemetry"}</span>
        </button>
      </div>

      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          color: "var(--accent-red)",
          padding: "12px 18px",
          borderRadius: "var(--radius-md)",
          fontSize: "13px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <ShieldAlert size={16} />
          {error}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span>REGISTERED USERS</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(0, 141, 218, 0.1)", color: "var(--accent-blue)" }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value">{stats?.total_users ?? 0}</div>
          <div className="stat-trend">Active MCA Project Accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>INDEXED DOCUMENTS</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-green)" }}>
              <FileText size={18} />
            </div>
          </div>
          <div className="stat-value">
            {stats?.total_indexed_documents ?? 0} <span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 500 }}>/ {stats?.total_documents ?? 0}</span>
          </div>
          <div className="stat-trend">{stats?.total_chunks ?? 0} Total Text Chunks</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>FAISS VECTOR INDEX</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(11, 25, 44, 0.08)", color: "var(--primary-navy)" }}>
              <Database size={18} />
            </div>
          </div>
          <div className="stat-value">{stats?.total_vectors_in_memory ?? 0}</div>
          <div className="stat-trend">384-Dim Normalized L2 Embeddings</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>ASSISTANT QUERIES</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(245, 158, 11, 0.1)", color: "var(--accent-amber)" }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="stat-value">{stats?.total_queries ?? 0}</div>
          <div className="stat-trend">Across {stats?.total_conversations ?? 0} Sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>WEB FALLBACK RATE</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(30, 62, 98, 0.1)", color: "var(--primary-slate)" }}>
              <Globe size={18} />
            </div>
          </div>
          <div className="stat-value">{stats?.web_fallback_rate_pct ?? 0}%</div>
          <div className="stat-trend">
            {stats?.web_fallback_queries ?? 0} Web vs {stats?.document_grounded_queries ?? 0} Doc Grounded
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>USER SATISFACTION</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-green)" }}>
              <ThumbsUp size={18} />
            </div>
          </div>
          <div className="stat-value">{stats?.user_satisfaction_rate_pct ?? 100}%</div>
          <div className="stat-trend">
            +{stats?.positive_feedback_count ?? 0} Positive / -{stats?.negative_feedback_count ?? 0} Negative
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div style={{
        background: "#FFF",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        border: "1px solid var(--border-color)",
        marginBottom: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--primary-navy)" }}>Admin Management Modules</div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Quick access to ingest PDFs, audit accounts, or review user ratings.</div>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/admin/documents"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--accent-blue)",
              color: "#FFF",
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <FileText size={16} /> Ingest Financial PDF <ArrowRight size={14} />
          </Link>
          <Link
            to="/admin/users"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFF",
              border: "1px solid var(--border-color)",
              color: "var(--primary-navy)",
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Users size={16} /> Manage Users
          </Link>
          <Link
            to="/admin/feedback"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFF",
              border: "1px solid var(--border-color)",
              color: "var(--primary-navy)",
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ThumbsUp size={16} /> Review Feedback
          </Link>
        </div>
      </div>

      {/* Recent Security & Ingestion Audit Logs */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} style={{ color: "var(--accent-blue)" }} />
            <span className="admin-card-title">Recent System Audit & Operations Log</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Auto-recorded in PostgreSQL `audit_logs`</span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Operator</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                  No recent audit entries logged.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span style={{
                      background: log.action.includes("DELETE") ? "rgba(239, 68, 68, 0.1)" : "rgba(0, 141, 218, 0.1)",
                      color: log.action.includes("DELETE") ? "var(--accent-red)" : "var(--accent-blue)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--primary-navy)" }}>
                    {log.entity_type} {log.entity_id ? `(#${log.entity_id.substring(0, 8)})` : ""}
                  </td>
                  <td>{log.user_email || "System"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{log.ip_address || "127.0.0.1"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

