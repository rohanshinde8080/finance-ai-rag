import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";

export const FeedbackModal = ({ messageId, initialRating, onClose, onSubmit }) => {
  const [rating, setRating] = useState(initialRating || 1);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(messageId, rating, comments);
      onClose();
    } catch (err) {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(11, 25, 44, 0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "#FFF",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        width: "90%",
        maxWidth: "420px",
        boxShadow: "var(--shadow-lg)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--primary-navy)" }}>Rate Response</h3>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => setRating(1)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "var(--radius-md)",
                border: rating === 1 ? "2px solid var(--accent-green)" : "1px solid var(--border-color)",
                background: rating === 1 ? "rgba(16, 185, 129, 0.1)" : "#FFF",
                color: rating === 1 ? "var(--accent-green)" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: 600
              }}
            >
              <ThumbsUp size={18} /> Helpful
            </button>

            <button
              type="button"
              onClick={() => setRating(-1)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "var(--radius-md)",
                border: rating === -1 ? "2px solid var(--accent-red)" : "1px solid var(--border-color)",
                background: rating === -1 ? "rgba(239, 68, 68, 0.1)" : "#FFF",
                color: rating === -1 ? "var(--accent-red)" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: 600
              }}
            >
              <ThumbsDown size={18} /> Inaccurate
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Additional feedback (Optional)
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us what was good or what could be improved..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                fontSize: "13px",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-blue)",
                color: "#FFF",
                fontWeight: 600,
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

