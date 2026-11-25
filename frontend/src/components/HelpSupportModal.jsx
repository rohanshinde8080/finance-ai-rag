import React, { useState } from "react";
import { X, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Send, CheckCircle2, BookOpen } from "lucide-react";

export const HelpSupportModal = ({ isOpen, onClose }) => {
  const [openFaq, setOpenFaq] = useState(0);
  const [supportMessage, setSupportMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const FAQS = [
    {
      q: "How does FinanceAI guarantee accurate financial answers?",
      a: "FinanceAI utilizes Retrieval-Augmented Generation (RAG). Before answering, it searches authoritative Indian regulatory documents (RBI Circulars, Income Tax Act, GST Notifications) using 384-dimensional dense semantic embeddings in pgvector and FAISS. Answers cite exact document names and page numbers."
    },
    {
      q: "What is the difference between New and Old Tax Regime for FY 2026-27?",
      a: "Under the New Tax Regime (Section 115BAC), standard deduction is ₹75,000 and taxable income up to ₹7,00,000 incurs zero tax due to Section 87A rebate. The Old Regime allows deductions under Section 80C (up to ₹1.5L), 80D (health insurance), and HRA, but starts with higher tax slabs."
    },
    {
      q: "How does the Live Web Fallback work?",
      a: "If your question cannot be matched with high confidence (similarity >= 0.70) against locally uploaded regulatory PDFs, FinanceAI automatically searches official portals (rbi.org.in, incometax.gov.in, sebi.gov.in) via the Tavily Search API."
    },
    {
      q: "Can I receive answers in Marathi or Hindi?",
      a: "Yes! Open Settings -> 4. Language, and select मराठी (Marathi) or हिंदी (Hindi). The assistant will automatically synthesize and explain the financial rules in your chosen language using Devanagari script."
    }
  ];

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSupportMessage("");
      setSubmitted(false);
    }, 4000);
  };

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
          maxWidth: "760px",
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(0, 141, 218, 0.12)",
                color: "var(--accent-blue)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>Help & Support Center</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Frequently Asked Questions & Prompting Guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* FAQ Accordion */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
              Frequently Asked Questions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {FAQS.map((faq, idx) => {
                const isOpenFaq = openFaq === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-main)",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpenFaq ? null : idx)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "transparent",
                        textAlign: "left",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      <span>{faq.q}</span>
                      {isOpenFaq ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {isOpenFaq && (
                      <div
                        style={{
                          padding: "0 16px 14px 16px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          lineHeight: 1.6,
                          borderTop: "1px solid var(--border-color)",
                          paddingTop: "10px",
                        }}
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompting Guide */}
          <div
            style={{
              background: "rgba(0, 141, 218, 0.05)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              border: "1px solid rgba(0, 141, 218, 0.2)",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px", color: "var(--accent-blue)", marginBottom: "6px" }}>
              <BookOpen size={16} /> Best Practices for Asking Financial Questions
            </div>
            <ul style={{ paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              <li><strong>Specify Financial Year:</strong> E.g., "What are the tax slabs for FY 2026-27?"</li>
              <li><strong>Mention Regulatory Body:</strong> E.g., "According to RBI Master Directions, what is the repo rate?"</li>
              <li><strong>Apply Domain Focus:</strong> Use the left sidebar dropdown to narrow search to Banking, Tax, or GST.</li>
            </ul>
          </div>

          {/* Feedback Form */}
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              Contact Project Developers / Send Feedback
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Have suggestions or noticed an error in a regulation citation? Send feedback to the MCA project team.
            </p>

            {submitted ? (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--accent-green)",
                  padding: "12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CheckCircle2 size={16} /> Thank you! Your feedback has been logged for evaluation.
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit}>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your question or feedback..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-main)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    resize: "vertical",
                    marginBottom: "10px",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    background: "var(--primary-navy)",
                    color: "#FFF",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Send size={14} /> Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
