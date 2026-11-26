import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Sparkles, Shield } from "lucide-react";
import { getErrorMessage } from "../utils/errorHandler";
import "../styles/auth.css";

export const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleFillDemo = () => {
    setEmail("admin@financeai.com");
    setPassword("AdminSecure#2026!");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login(email.trim().toLowerCase(), password);
      if (user.role !== "admin") {
        setError("Access Denied: This account does not possess administrator privileges.");
        return;
      }
      navigate("/admin/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid admin credentials. Please verify your email and password."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <div className="auth-brand-badge">F</div>
            FinanceAI
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--accent-blue)",
                background: "rgba(0, 141, 218, 0.12)",
                padding: "3px 8px",
                borderRadius: "6px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Shield size={12} /> Admin
            </span>
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
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="AdminSecure#2026!"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "14px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleFillDemo}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-blue)",
                fontSize: "12px",
                cursor: "pointer",
                padding: "2px 0",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 600
              }}
            >
              <Sparkles size={13} /> Auto-fill Admin Credentials
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="auth-button"
          >
            {submitting ? "Authenticating..." : "Authorize Admin Session"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" style={{ color: "var(--text-muted)" }}>← Return to User Login</Link>
        </div>
      </div>
    </div>
  );
};

