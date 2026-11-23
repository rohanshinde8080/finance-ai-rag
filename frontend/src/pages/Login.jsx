import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export const Login = () => {
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
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password. Please try again.");
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
          </div>
          <div className="auth-subtitle">AI-Powered Financial Advisory & Regulatory Intelligence</div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-form-label">Email Address</label>
            <input
              type="email"
              required
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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

          <button type="submit" disabled={submitting} className="auth-button">
            {submitting ? "Signing in..." : "Sign In to FinanceAI"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create an account</Link>
          <div style={{ marginTop: "10px" }}>
            <Link to="/admin/login" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              Administrator Login →
            </Link>
          </div>
        </div>

        <div className="auth-demo-hint">
          <strong>Default Admin Demo:</strong> admin@financeai.com / AdminSecure#2026!
        </div>
      </div>
    </div>
  );
};

