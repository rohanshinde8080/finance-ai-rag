/**
 * Safely extracts a clean, human-readable error message string from any Axios error,
 * preventing React runtime crashes when the backend returns structured Pydantic validation arrays.
 */
export const getErrorMessage = (err, fallback = "An unexpected error occurred. Please try again.") => {
  if (!err) return fallback;

  // 1. Network / Connection errors (server down, CORS blocked, socket closed, timeout)
  if (!err.response) {
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      return "Request timed out. The server took too long to respond. Please try again.";
    }
    return "Unable to connect to the backend server. Please verify your connection or check that the server is online.";
  }

  const detail = err.response.data?.detail;

  // 2. Direct string detail (standard FastAPI HTTPException)
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  // 3. FastAPI / Pydantic validation error array (status 422)
  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        let msg = item.msg || item.message || JSON.stringify(item);
        // Clean up common Pydantic v1/v2 prefixes
        msg = msg.replace(/^Value error,\s*/i, "").replace(/^Assertion failed,\s*/i, "");
        // Capitalize first letter
        return msg.charAt(0).toUpperCase() + msg.slice(1);
      }
      return String(item);
    });
    return messages.join(". ");
  }

  // 4. Object detail (e.g. { message: "..." })
  if (detail && typeof detail === "object") {
    if (detail.message) return String(detail.message);
    if (detail.error) return String(detail.error);
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  // 5. HTTP status-specific fallbacks
  const status = err.response.status;
  if (status === 401) return "Invalid email or password.";
  if (status === 403) return "Access denied. Your account lacks required permissions or is inactive.";
  if (status === 404) return "Requested resource was not found.";
  if (status === 409) return "An account with this email already exists.";
  if (status === 422) return "Please check your inputs and ensure all required fields are correctly formatted.";
  if (status >= 500) return "Server encountered an internal error. Please try again shortly.";

  return err.message || fallback;
};
