import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";
import "../styles/auth.css";

export const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role !== "admin") {
        setError("Access Denied: This account does not possess administrator privileges.");
        return;
      }
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid admin credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container" style={{ background: "linear-gradient(135deg, #050C17 0%, #0F2542 100%)" }}>
      <div className="auth-card" style={{ borderTop: "4px solid var(--accent-green)" }}>
        <div className="auth-header">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--accent-green)", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", marginBottom: "8px" }}>
            <ShieldAlert size={16} /> Restricted Access
          </div>
          <div className="auth-brand">
            Finance<span style={{ color: "var(--accent-blue)" }}>AI</span> Admin
          </div>
          <div className="auth-subtitle">Administrator Portal Authentication</div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-form-label">Admin Email</label>
            <input
              type="email"
              required
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@financeai.com"
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-form-label">Password</label>
            <input
              type="password"
              required
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="auth-button"
            style={{ background: "var(--primary-navy)" }}
          >
            {submitting ? "Authenticating..." : "Authorize Admin Session"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" style={{ color: "var(--text-muted)" }}>← Return to User Login</Link>
        </div>

        <div className="auth-demo-hint">
          <strong>Default Admin:</strong> admin@financeai.com / AdminSecure#2026!
        </div>
      </div>
    </div>
  );
};

