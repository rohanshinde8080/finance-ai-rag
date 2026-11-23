import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { CitationCard } from "../components/CitationCard";
import { WebSourceCard } from "../components/WebSourceCard";
import { FeedbackModal } from "../components/FeedbackModal";
import { chatService } from "../services/chatService";
import { Send, Copy, ThumbsUp, ThumbsDown, Check, AlertCircle, Sparkles } from "lucide-react";
import "../styles/chat.css";

const SUGGESTED_PROMPTS = [
  "What are the tax slabs under New Tax Regime for FY 2026-27?",
  "How does an RBI Repo Rate increase impact home loan EMIs?",
  "What is the maximum investment deduction limit under Section 80C?",
  "What are the GST rates applicable to health and term life insurance?",
  "Explain the difference between Mutual Fund Direct vs Regular plans.",
];

export const ChatInterface = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load user sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await chatService.listSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const data = await chatService.getSession(sessionId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await chatService.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewSession();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleSendMessage = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    setInputQuery("");

    // Optimistic user message
    const tempUserMsg = {
      id: "temp-" + Date.now(),
      sender: "user",
      content: textToSend,
      source_type: "direct",
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await chatService.askQuestion(
        activeSessionId,
        textToSend,
        selectedCategory
      );

      // If new session created on the fly
      if (!activeSessionId) {
        setActiveSessionId(res.session_id);
        loadSessions();
      }

      // Assistant response message
      const assistantMsg = {
        id: res.assistant_message_id,
        sender: "assistant",
        content: res.answer,
        source_type: res.source_type,
        metadata: {
          citations: res.citations,
          web_sources: res.web_sources,
          confidence_score: res.confidence_score,
          disclaimer: res.disclaimer,
        },
        created_at: res.created_at,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: "err-" + Date.now(),
        sender: "assistant",
        content: "Sorry, I encountered an error processing your query. Please check your backend connection.",
        source_type: "fallback",
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content, messageId) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFeedbackSubmit = async (messageId, rating, comments) => {
    await chatService.submitFeedback(messageId, rating, comments);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Navbar />

      <div className="chat-layout">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <main className="chat-main">
          {selectedCategory && (
            <div style={{
              background: "rgba(0, 141, 218, 0.08)",
              borderBottom: "1px solid rgba(0, 141, 218, 0.2)",
              padding: "6px 24px",
              fontSize: "12px",
              color: "var(--accent-blue)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>Domain Filter Applied: <strong>{selectedCategory}</strong></span>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{ background: "transparent", color: "var(--accent-blue)", textDecoration: "underline", fontSize: "11px" }}
              >
                Clear
              </button>
            </div>
          )}

          <div className="chat-messages-container">
            {messages.length === 0 ? (
              <div style={{ margin: "auto", maxWidth: "680px", textAlign: "center", padding: "40px 20px" }}>
                <div style={{
                  width: "56px",
                  height: "56px",
                  background: "linear-gradient(135deg, var(--accent-blue), var(--primary-navy))",
                  color: "#FFF",
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                  boxShadow: "var(--shadow-md)"
                }}>
                  <Sparkles size={28} />
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--primary-navy)", marginBottom: "8px" }}>
                  How can FinanceAI assist you today?
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6" }}>
                  Ask questions about Indian banking, Income Tax, GST, RBI circulars, insurance, and mutual funds. All responses are verified against uploaded regulatory circulars with deterministic citations.
                </p>

                <div className="chat-chips-container" style={{ justifyContent: "center" }}>
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      className="chat-chip"
                      onClick={() => handleSendMessage(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === "user";
                const citations = msg.metadata?.citations || [];
                const webSources = msg.metadata?.web_sources || [];
                const disclaimer = msg.metadata?.disclaimer;

                return (
                  <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                    {isUser ? (
                      <div className="chat-content-user">{msg.content}</div>
                    ) : (
                      <div className="chat-content-assistant">
                        {/* Grounding Source Badge */}
                        <div style={{ marginBottom: "10px" }}>
                          {msg.source_type === "document" && (
                            <span style={{
                              background: "rgba(16, 185, 129, 0.12)",
                              color: "var(--accent-green)",
                              padding: "3px 8px",
                              borderRadius: "var(--radius-full)",
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase"
                            }}>
                              ✓ Document Grounded (Deterministic)
                            </span>
                          )}
                          {msg.source_type === "web" && (
                            <span style={{
                              background: "rgba(245, 158, 11, 0.12)",
                              color: "var(--accent-amber)",
                              padding: "3px 8px",
                              borderRadius: "var(--radius-full)",
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase"
                            }}>
                              🌐 Verified Web Fallback (Official Portals)
                            </span>
                          )}
                        </div>

                        {/* Text Content */}
                        <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                          {msg.content}
                        </div>

                        {/* Document Citations */}
                        {citations.length > 0 && (
                          <div className="chat-citations-section">
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                              Official Sources & Page Citations ({citations.length})
                            </span>
                            {citations.map((c, i) => (
                              <CitationCard key={i} citation={c} />
                            ))}
                          </div>
                        )}

                        {/* Web Sources */}
                        {webSources.length > 0 && (
                          <div className="chat-citations-section">
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                              Official Web Sources ({webSources.length})
                            </span>
                            {webSources.map((w, i) => (
                              <WebSourceCard key={i} source={w} />
                            ))}
                          </div>
                        )}

                        {/* Disclaimer */}
                        {disclaimer && (
                          <div className="chat-disclaimer">
                            <AlertCircle size={14} style={{ flexShrink: 0 }} />
                            <span>{disclaimer}</span>
                          </div>
                        )}

                        {/* Actions: Copy & Feedback */}
                        <div className="chat-actions-bar">
                          <button
                            className="chat-action-btn"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            title="Copy answer"
                          >
                            {copiedMessageId === msg.id ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
                            {copiedMessageId === msg.id ? "Copied" : "Copy"}
                          </button>

                          <button
                            className="chat-action-btn"
                            onClick={() => setFeedbackTarget({ messageId: msg.id, rating: 1 })}
                            title="Helpful response"
                          >
                            <ThumbsUp size={14} /> Helpful
                          </button>

                          <button
                            className="chat-action-btn"
                            onClick={() => setFeedbackTarget({ messageId: msg.id, rating: -1 })}
                            title="Inaccurate response"
                          >
                            <ThumbsDown size={14} /> Inaccurate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="chat-bubble assistant">
                <div className="chat-content-assistant" style={{ width: "fit-content" }}>
                  <div className="typing-dots">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="chat-input-wrapper">
            <form
              className="chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <textarea
                className="chat-textarea"
                rows={1}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask a financial regulation question (e.g., Section 80C limits, Repo rate, GST exemptions)..."
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="chat-send-btn"
                title="Send query"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </main>
      </div>

      {feedbackTarget && (
        <FeedbackModal
          messageId={feedbackTarget.messageId}
          initialRating={feedbackTarget.rating}
          onClose={() => setFeedbackTarget(null)}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
};

