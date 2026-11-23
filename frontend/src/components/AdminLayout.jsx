import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { LayoutDashboard, FileText, Users, ThumbsUp } from "lucide-react";
import "../styles/admin.css";

export const AdminLayout = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)" }}>
      <Navbar />
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div style={{ padding: "8px 12px 14px", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Administration
          </div>
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/admin/documents"
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <FileText size={18} />
            <span>Documents & RAG</span>
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <Users size={18} />
            <span>Users & Access</span>
          </NavLink>
          <NavLink
            to="/admin/feedback"
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <ThumbsUp size={18} />
            <span>User Feedback</span>
          </NavLink>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

