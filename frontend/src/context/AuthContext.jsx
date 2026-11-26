import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("finance_ai_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("finance_ai_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem("finance_ai_token");
      if (storedToken) {
        try {
          const profile = await authService.getMe();
          setUser(profile);
          localStorage.setItem("finance_ai_user", JSON.stringify(profile));
        } catch (err) {
          // Only invalidate session if the backend explicitly returned 401 Unauthorized
          if (err.response && err.response.status === 401) {
            console.warn("Session expired or token invalid, logging out:", err);
            setUser(null);
            setToken(null);
            localStorage.removeItem("finance_ai_token");
            localStorage.removeItem("finance_ai_user");
          } else {
            // Transient network error or backend cold starting: retain cached user profile
            console.warn("Network error during session verification, keeping cached profile:", err);
          }
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("finance_ai_token", data.access_token);
    localStorage.setItem("finance_ai_user", JSON.stringify(data.user));
    return data.user;
  };

  const register = async (...args) => {
    return await authService.register(...args);
  };

  const updateProfile = async (profileData) => {
    const updated = await authService.updateProfile(profileData);
    setUser(updated);
    localStorage.setItem("finance_ai_user", JSON.stringify(updated));
    return updated;
  };

  const changePassword = async (currentPassword, newPassword) => {
    return await authService.changePassword(currentPassword, newPassword);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("finance_ai_token");
      localStorage.removeItem("finance_ai_user");
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        login,
        register,
        updateProfile,
        changePassword,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

