import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "../utils/errorHandler";
import "../styles/auth.css";

export const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register, login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/\d/.test(password) && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError("Password must contain at least one digit or special character (e.g. 1, 2, #, @, !).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords are identical.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        gender: gender || null,
        mobile_number: mobileNumber.trim() || null,
        date_of_birth: dateOfBirth || null,
      });
      await login(email.trim().toLowerCase(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please check your details."));
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
          <div className="auth-subtitle">Create a User Account</div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-form-label">Full Name *</label>
            <input
              type="text"
              required
              className="auth-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rohan Sharma"
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-form-label">Email Address *</label>
            <input
              type="email"
              required
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div className="auth-form-row">
            <div className="auth-form-group">
              <label className="auth-form-label">Gender</label>
              <select
                className="auth-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="auth-form-group">
              <label className="auth-form-label">Date of Birth</label>
              <input
                type="date"
                className="auth-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form-group">
            <label className="auth-form-label">Mobile Number</label>
            <input
              type="tel"
              className="auth-input"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          <div className="auth-form-row">
            <div className="auth-form-group">
              <label className="auth-form-label">Password *</label>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
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

            <div className="auth-form-group">
              <label className="auth-form-label">Confirm Password *</label>
              <div className="auth-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="auth-button">
            {submitting ? "Creating Account..." : "Register Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already registered? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

