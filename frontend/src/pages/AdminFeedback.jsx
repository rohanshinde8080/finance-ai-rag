import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import {
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  MessageCircle,
  FileText,
  Globe,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export const AdminFeedback = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await adminService.getFeedbackSummary(50);
      setData(res);
    } catch (err) {
      console.error("Failed to load feedback summary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  return (
    <div>
      <div className="admin-title-row">
        <div>
          <h1 className="admin-page-title">User Feedback & Answer Quality</h1>
          <p className="admin-page-subtitle">
            Inspect real user ratings on generated financial advice, qualitative commentary, and ground-truth confidence.
          </p>
        </div>
        <button
          onClick={fetchFeedback}
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
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: "28px" }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span>TOTAL RATINGS</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(0, 141, 218, 0.1)", color: "var(--accent-blue)" }}>
              <MessageCircle size={18} />
            </div>
          </div>
          <div className="stat-value">{data?.total_feedback_count ?? 0}</div>
          <div className="stat-trend">Submitted by active users</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>POSITIVE RATINGS</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-green)" }}>
              <ThumbsUp size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "var(--accent-green)" }}>
            {data?.positive_count ?? 0}
          </div>
          <div className="stat-trend">Accurate & helpful responses</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>NEGATIVE RATINGS</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)" }}>
              <ThumbsDown size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "var(--accent-red)" }}>
            {data?.negative_count ?? 0}
          </div>
          <div className="stat-trend">Flags for manual review</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>SATISFACTION SCORE</span>
            <div className="stat-icon-wrapper" style={{ background: "rgba(11, 25, 44, 0.08)", color: "var(--primary-navy)" }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div className="stat-value">{data?.satisfaction_rate_pct ?? 100}%</div>
          <div className="stat-trend">Target: &gt; 85% for MCA standard</div>
        </div>
      </div>

      {/* Feedback Submissions Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ThumbsUp size={18} style={{ color: "var(--accent-blue)" }} />
            <span className="admin-card-title">Recent Feedback Submissions</span>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Rating</th>
              <th>User</th>
              <th>Grounding Source</th>
              <th>User Comment</th>
              <th>AI Answer Excerpt</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>
                  <RefreshCw className="spin" size={20} style={{ margin: "0 auto 8px" }} />
                  <div>Loading feedback logs...</div>
                </td>
              </tr>
            ) : !data?.recent_feedbacks || data.recent_feedbacks.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "36px", color: "var(--text-secondary)" }}>
                  <HelpCircle size={32} style={{ color: "var(--border-color)", margin: "0 auto 8px" }} />
                  <p>No feedback submissions recorded yet.</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Users can submit thumbs up / down feedback directly from the chat assistant.
                  </p>
                </td>
              </tr>
            ) : (
              data.recent_feedbacks.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.rating > 0 ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "var(--accent-green)",
                        padding: "3px 8px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}>
                        <ThumbsUp size={12} /> HELPFUL
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(239, 68, 68, 0.12)",
                        color: "var(--accent-red)",
                        padding: "3px 8px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}>
                        <ThumbsDown size={12} /> UNHELPFUL
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--primary-navy)" }}>{item.user_email}</td>
                  <td>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                    }}>
                      {item.source_type === "rag_document" ? (
                        <>
                          <FileText size={12} style={{ color: "var(--accent-blue)" }} /> Document RAG
                        </>
                      ) : item.source_type === "tavily_web" ? (
                        <>
                          <Globe size={12} style={{ color: "var(--accent-amber)" }} /> Tavily Web
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} /> General
                        </>
                      )}
                    </span>
                  </td>
                  <td style={{ maxWidth: "240px", color: "var(--text-primary)" }}>
                    {item.comments ? (
                      <span style={{ fontStyle: "italic" }}>"{item.comments}"</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>No comment</span>
                    )}
                  </td>
                  <td style={{ maxWidth: "300px", color: "var(--text-secondary)", fontSize: "12px" }}>
                    <div style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {item.message_content}
                    </div>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

