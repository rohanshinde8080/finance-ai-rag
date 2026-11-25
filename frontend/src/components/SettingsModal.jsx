import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { chatService } from "../services/chatService";
import {
  X,
  User,
  Key,
  Moon,
  Sun,
  Globe,
  Sliders,
  Shield,
  Trash2,
  Bell,
  Check,
  AlertTriangle,
  Download,
  Save,
  CheckCircle2
} from "lucide-react";

export const SettingsModal = ({
  isOpen,
  onClose,
  initialTab = "profile",
  onDeleteAllSessions,
  onLanguageChange
}) => {
  const { user, updateProfile, changePassword, logout } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Profile State
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth ? String(user.date_of_birth).split("T")[0] : "");

  // 2. Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 3. Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem("finance_ai_theme") || "light");

  // 4. Language State
  const [language, setLanguage] = useState(() => localStorage.getItem("finance_ai_lang") || "English");

  // 5. Chat Preferences State
  const [chatPrefs, setChatPrefs] = useState(() => {
    const saved = localStorage.getItem("finance_ai_chat_prefs");
    return saved
      ? JSON.parse(saved)
      : {
          responseStyle: "balanced", // concise, balanced, detailed
          autoExpandCitations: true,
          webFallback: true,
          confidenceThreshold: 70,
        };
  });

  // 7. Delete confirmation modal state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 8. Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const saved = localStorage.getItem("finance_ai_notif_prefs");
    return saved
      ? JSON.parse(saved)
      : {
          rbiCirculars: true,
          taxDeadlines: true,
          marketAlerts: false,
          systemUpdates: true,
          emailDigest: false,
        };
  });

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setGender(user.gender || "");
      setMobileNumber(user.mobile_number || "");
      setDateOfBirth(user.date_of_birth ? String(user.date_of_birth).split("T")[0] : "");
    }
  }, [user]);

  if (!isOpen) return null;

  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg("");
    } else {
      setSuccessMsg(msg);
      setErrorMsg("");
    }
    setTimeout(() => {
      setSuccessMsg("");
      setErrorMsg("");
    }, 4000);
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        full_name: fullName,
        gender: gender || null,
        mobile_number: mobileNumber || null,
        date_of_birth: dateOfBirth || null,
      });
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update profile.", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters long.", true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", true);
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully!");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to change password.", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Theme Change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("finance_ai_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    showToast(`Theme changed to ${newTheme === "dark" ? "Dark Mode" : "Light Mode"}`);
  };

  // Handle Language Change
  const handleLangChange = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem("finance_ai_lang", newLang);
    if (onLanguageChange) onLanguageChange(newLang);
    showToast(`Language set to ${newLang}. RAG responses will adapt.`);
  };

  // Handle Chat Prefs Save
  const handleChatPrefToggle = (key, value) => {
    const updated = { ...chatPrefs, [key]: value };
    setChatPrefs(updated);
    localStorage.setItem("finance_ai_chat_prefs", JSON.stringify(updated));
  };

  // Handle Notif Prefs Save
  const handleNotifPrefToggle = (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem("finance_ai_notif_prefs", JSON.stringify(updated));
  };

  // Handle Delete All History
  const handleDeleteAllHistory = async () => {
    setLoading(true);
    try {
      await chatService.deleteAllSessions();
      if (onDeleteAllSessions) onDeleteAllSessions();
      setConfirmDelete(false);
      showToast("All chat conversations have been permanently deleted.");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to clear chat history.", true);
    } finally {
      setLoading(false);
    }
  };

  // Export User Data as JSON
  const handleExportData = async () => {
    try {
      const sessions = await chatService.listSessions();
      const exportObject = {
        exported_at: new Date().toISOString(),
        profile: user,
        language,
        theme,
        chat_preferences: chatPrefs,
        total_sessions: sessions.length,
        sessions,
      };
      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance_ai_userdata_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("User data archive downloaded successfully!");
    } catch (err) {
      showToast("Failed to export data: " + err.message, true);
    }
  };

  const navItems = [
    { id: "profile", label: "1. My Profile", icon: User },
    { id: "password", label: "2. Change Password", icon: Key },
    { id: "theme", label: "3. Theme (Dark / Light)", icon: theme === "dark" ? Moon : Sun },
    { id: "language", label: "4. Language", icon: Globe },
    { id: "chat", label: "5. Chat Preferences", icon: Sliders },
    { id: "privacy", label: "6. Privacy & Security", icon: Shield },
    { id: "history", label: "7. Delete Chat History", icon: Trash2 },
    { id: "notifications", label: "8. Notification Preferences", icon: Bell },
  ];

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
          maxWidth: "840px",
          height: "620px",
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
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>Settings & Preferences</h2>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
              Configure your account, appearance, languages, and RAG preferences
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--accent-green)",
              padding: "10px 24px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              color: "var(--accent-red)",
              padding: "10px 24px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <AlertTriangle size={16} /> {errorMsg}
          </div>
        )}

        {/* Body (Split Nav & Content) */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Settings Sidebar */}
          <div
            style={{
              width: "240px",
              background: "var(--bg-main)",
              borderRight: "1px solid var(--border-color)",
              padding: "12px 8px",
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#FFF" : "var(--text-primary)",
                    background: isActive ? "var(--accent-blue)" : "transparent",
                    marginBottom: "4px",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {/* 1. My Profile */}
            {activeTab === "profile" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Personal Profile
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Manage your personal identity information registered in FinanceAI.
                </p>

                <form onSubmit={handleProfileSubmit}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ""}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-main)",
                        color: "var(--text-muted)",
                        fontSize: "13px",
                        cursor: "not-allowed",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohan Sharma"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-card)",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                        }}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-card)",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      background: "var(--accent-blue)",
                      color: "#FFF",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Save size={16} /> {loading ? "Saving..." : "Save Profile Changes"}
                  </button>
                </form>
              </div>
            )}

            {/* 2. Change Password */}
            {activeTab === "password" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Change Password
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Ensure your account is protected with a strong, complex password.
                </p>

                <form onSubmit={handlePasswordSubmit}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      New Password * (minimum 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      background: "var(--primary-navy)",
                      color: "#FFF",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Key size={16} /> {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}

            {/* 3. Theme */}
            {activeTab === "theme" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Theme & Visual Appearance
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Select the visual theme for your FinanceAI workspace.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {/* Light Card */}
                  <div
                    onClick={() => handleThemeChange("light")}
                    style={{
                      border: theme === "light" ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      cursor: "pointer",
                      background: "#FFFFFF",
                      color: "#0F172A",
                      position: "relative",
                      transition: "all 0.2s",
                      boxShadow: theme === "light" ? "var(--shadow-md)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <Sun size={20} color="#F59E0B" />
                      <span style={{ fontWeight: 700, fontSize: "14px" }}>Light Mode</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748B" }}>
                      Crisp, high-contrast white & light slate interface ideal for daytime research.
                    </p>
                    {theme === "light" && (
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          background: "var(--accent-blue)",
                          color: "#FFF",
                          borderRadius: "var(--radius-full)",
                          width: "20px",
                          height: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={12} />
                      </div>
                    )}
                  </div>

                  {/* Dark Card */}
                  <div
                    onClick={() => handleThemeChange("dark")}
                    style={{
                      border: theme === "dark" ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      cursor: "pointer",
                      background: "#0F2038",
                      color: "#F8FAFC",
                      position: "relative",
                      transition: "all 0.2s",
                      boxShadow: theme === "dark" ? "var(--shadow-md)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <Moon size={20} color="#008DDA" />
                      <span style={{ fontWeight: 700, fontSize: "14px" }}>Dark Mode</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#94A3B8" }}>
                      Deep navy & midnight palette that reduces eye strain in low-light conditions.
                    </p>
                    {theme === "dark" && (
                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          background: "var(--accent-blue)",
                          color: "#FFF",
                          borderRadius: "var(--radius-full)",
                          width: "20px",
                          height: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Language */}
            {activeTab === "language" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Language / भाषा / भाषा निवडा
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Choose the preferred language for AI explanations and financial regulations.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { code: "English", native: "English", desc: "Default financial explanations in English with official regulatory citations." },
                    { code: "Marathi", native: "मराठी (Marathi)", desc: "सर्व आर्थिक माहिती, कर नियम आणि आरबीआय परिपत्रके मराठीत समजून घ्या." },
                    { code: "Hindi", native: "हिंदी (Hindi)", desc: "वित्तीय नियम, आयकर स्लैब और बैंकिंग दिशानिर्देश सरल हिंदी में प्राप्त करें।" },
                  ].map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <div
                        key={lang.code}
                        onClick={() => handleLangChange(lang.code)}
                        style={{
                          border: isSelected ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          padding: "14px 16px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(0, 141, 218, 0.06)" : "var(--bg-card)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                            {lang.native}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {lang.desc}
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              background: "var(--accent-blue)",
                              color: "#FFF",
                              borderRadius: "var(--radius-full)",
                              width: "22px",
                              height: "22px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Chat Preferences */}
            {activeTab === "chat" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Chat & RAG Response Preferences
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Tailor how the RAG model synthesizes financial answers.
                </p>

                {/* Response Style */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                    Explanation Detail Level
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    {["concise", "balanced", "detailed"].map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handleChatPrefToggle("responseStyle", style)}
                        style={{
                          padding: "10px",
                          borderRadius: "var(--radius-sm)",
                          border: chatPrefs.responseStyle === style ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                          background: chatPrefs.responseStyle === style ? "rgba(0, 141, 218, 0.1)" : "var(--bg-card)",
                          color: "var(--text-primary)",
                          textTransform: "capitalize",
                          fontWeight: chatPrefs.responseStyle === style ? 700 : 500,
                          fontSize: "13px",
                        }}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Expand Citations */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--border-color)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Auto-Expand Source Citations</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Automatically expand verified document page citations with answers</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={chatPrefs.autoExpandCitations}
                    onChange={(e) => handleChatPrefToggle("autoExpandCitations", e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                </div>

                {/* Web Fallback */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--border-color)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Official Web Fallback</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Query official government portals if internal vector similarity is below 0.70</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={chatPrefs.webFallback}
                    onChange={(e) => handleChatPrefToggle("webFallback", e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                </div>
              </div>
            )}

            {/* 6. Privacy & Security */}
            {activeTab === "privacy" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Privacy & Data Governance
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  FinanceAI enforces strict zero-leakage enterprise data protection.
                </p>

                <div style={{ background: "var(--bg-main)", borderRadius: "var(--radius-md)", padding: "16px", marginBottom: "16px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "13px", color: "var(--accent-green)", marginBottom: "6px" }}>
                    <Shield size={16} /> End-to-End Cryptographic Security
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    User passwords are encrypted with bcrypt rounds. Authenticated sessions operate using JWT tokens with automatic expiry and per-user row isolation.
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                    Export Personal Data
                  </h4>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    Download a full JSON archive of your personal profile, preferences, and conversations.
                  </p>
                  <button
                    onClick={handleExportData}
                    style={{
                      padding: "8px 14px",
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Download size={14} /> Export My Data (JSON)
                  </button>
                </div>
              </div>
            )}

            {/* 7. Delete Chat History */}
            {activeTab === "history" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--accent-red)" }}>
                  Delete Chat History
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Permanently purge all your past conversations and stored messages from the database.
                </p>

                <div
                  style={{
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    background: "rgba(239, 68, 68, 0.05)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px", color: "var(--accent-red)", marginBottom: "6px" }}>
                    <AlertTriangle size={18} /> Irreversible Action
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Once deleted, all your chat sessions, historical queries, citations, and conversation logs will be permanently erased from PostgreSQL and cannot be recovered.
                  </p>
                </div>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      padding: "10px 18px",
                      background: "var(--accent-red)",
                      color: "#FFF",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Trash2 size={16} /> Delete All Chat History
                  </button>
                ) : (
                  <div style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
                      Are you absolutely sure you want to delete ALL past conversations?
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={handleDeleteAllHistory}
                        disabled={loading}
                        style={{
                          padding: "8px 16px",
                          background: "var(--accent-red)",
                          color: "#FFF",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {loading ? "Deleting..." : "Yes, Purge Everything"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          padding: "8px 16px",
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8. Notification Preferences */}
            {activeTab === "notifications" && (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Notification Preferences
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                  Configure what financial alerts and compliance updates you receive.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { key: "rbiCirculars", title: "RBI & Monetary Policy Notices", desc: "Alerts when the Reserve Bank of India updates Repo rates or banking directions" },
                    { key: "taxDeadlines", title: "Income Tax & GST Deadlines", desc: "Reminders for Advance Tax quarterly installments and ITR filing due dates" },
                    { key: "marketAlerts", title: "SEBI Regulatory Disclosures", desc: "Updates on equity market derivatives, mutual fund NAV rules, and trading norms" },
                    { key: "systemUpdates", title: "FinanceAI Engine Upgrades", desc: "Notifications when new regulatory documents or embedding indices are published" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        background: "var(--bg-main)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{item.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs[item.key]}
                        onChange={() => handleNotifPrefToggle(item.key)}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
