import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.listUsers(0, 100, search);
      setUsers(data.items || []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      setMessage({ type: "error", text: "You cannot deactivate your own administrative account." });
      return;
    }

    try {
      setUpdatingId(user.id);
      setMessage(null);
      const newStatus = !user.is_active;
      await adminService.updateUserStatus(user.id, newStatus);
      setMessage({
        type: "success",
        text: `User ${user.email} is now ${newStatus ? "Activated" : "Deactivated"}.`,
      });
      await fetchUsers();
    } catch (err) {
      console.error("Failed to update status", err);
      const errDetail = err.response?.data?.detail || "Status update failed.";
      setMessage({ type: "error", text: errDetail });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="admin-title-row">
        <div>
          <h1 className="admin-page-title">User Accounts & Access Control</h1>
          <p className="admin-page-subtitle">
            Manage student & client accounts, inspect active chat session counts, and toggle account activation.
          </p>
        </div>
      </div>

      {message && (
        <div style={{
          background: message.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: message.type === "success" ? "var(--accent-green)" : "var(--accent-red)",
          padding: "12px 18px",
          borderRadius: "var(--radius-md)",
          fontSize: "13px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={18} style={{ color: "var(--accent-blue)" }} />
            <span className="admin-card-title">Registered Users ({users.length})</span>
          </div>

          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Filter by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "7px 12px 7px 30px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                fontSize: "12px",
                width: "240px",
              }}
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Full Name & Email</th>
              <th>System Role</th>
              <th>Chat Sessions</th>
              <th>Registration Date</th>
              <th>Account Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>
                  <RefreshCw className="spin" size={20} style={{ margin: "0 auto 8px" }} />
                  <div>Loading user directory...</div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--primary-navy)", fontSize: "13px" }}>
                        {u.full_name} {isSelf && <span style={{ fontSize: "11px", color: "var(--accent-blue)" }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{u.email}</div>
                    </td>
                    <td>
                      <span style={{
                        background: u.role === "admin" ? "rgba(16, 185, 129, 0.12)" : "rgba(30, 62, 98, 0.08)",
                        color: u.role === "admin" ? "var(--accent-green)" : "var(--primary-slate)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                        <MessageSquare size={13} />
                        <span>{u.session_count || 0}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: u.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: u.is_active ? "var(--accent-green)" : "var(--accent-red)",
                      }}>
                        {u.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {u.is_active ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={updatingId === u.id || isSelf}
                        style={{
                          background: u.is_active ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                          color: u.is_active ? "var(--accent-red)" : "var(--accent-green)",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: isSelf ? "not-allowed" : "pointer",
                          opacity: isSelf ? 0.5 : 1,
                        }}
                      >
                        {updatingId === u.id ? (
                          "Updating..."
                        ) : u.is_active ? (
                          "Deactivate"
                        ) : (
                          "Activate"
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

