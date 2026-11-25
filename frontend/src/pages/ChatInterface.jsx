import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { CitationCard } from "../components/CitationCard";
import { WebSourceCard } from "../components/WebSourceCard";
import { FeedbackModal } from "../components/FeedbackModal";
import { SettingsModal } from "../components/SettingsModal";
import { MyDocumentsModal } from "../components/MyDocumentsModal";
import { FinancialInsightsModal } from "../components/FinancialInsightsModal";
import { PinnedAnswersModal } from "../components/PinnedAnswersModal";
import { NotificationsModal } from "../components/NotificationsModal";
import { HelpSupportModal } from "../components/HelpSupportModal";
import { AboutModal } from "../components/AboutModal";
import { chatService } from "../services/chatService";
import { Send, Copy, ThumbsUp, ThumbsDown, Check, AlertCircle, Sparkles, Pin } from "lucide-react";
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

  // --- Modal Navigation State ---
  const [activeModal, setActiveModal] = useState(null); // 'settings', 'documents', 'insights', 'pinned', 'notifications', 'help', 'about'
  const [settingsInitialTab, setSettingsInitialTab] = useState("profile");

  // --- Language State ---
  const [language, setLanguage] = useState(() => localStorage.getItem("finance_ai_lang") || "English");

  // --- Theme Initializer ---
  useEffect(() => {
    const savedTheme = localStorage.getItem("finance_ai_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // --- Pinned Answers State ---
  const [pinnedAnswers, setPinnedAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("finance_ai_pinned_answers") || "[]");
    } catch {
      return [];
    }
  });

  // --- Notifications State ---
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("finance_ai_notifications");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "notif-1",
        title: "Advance Tax 4th Installment Reminder",
        message: "The final installment (100%) of Advance Tax for FY 2026-27 is due on or before March 15. Check your tax computation in Financial Insights.",
        time: "Today",
        read: false,
      },
      {
        id: "notif-2",
        title: "RBI MPC Policy Rate Decision",
        message: "The Monetary Policy Committee has retained the policy repo rate at 6.50% to anchor medium-term retail inflation expectations.",
        time: "Yesterday",
        read: false,
      },
      {
        id: "notif-3",
        title: "New Tax Regime Standard Deduction",
        message: "Under Section 115BAC, the standard deduction for salaried individuals is enhanced to ₹75,000. Taxable income up to ₹7 Lakhs incurs zero tax with Section 87A rebate.",
        time: "3 days ago",
        read: true,
      },
      {
        id: "notif-4",
        title: "SEBI Derivative Margin Requirements",
        message: "SEBI framework mandates minimum contract size of ₹15 Lakhs on index options to limit retail speculative risk.",
        time: "1 week ago",
        read: true,
      },
    ];
  });

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

  const handleDeleteAllSessions = () => {
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
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
        selectedCategory,
        language
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
          question: textToSend,
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

  // --- Pinned Answers Actions ---
  const handleTogglePin = (assistantMsg) => {
    const alreadyPinned = pinnedAnswers.some((p) => p.id === assistantMsg.id);
    let updated;
    if (alreadyPinned) {
      updated = pinnedAnswers.filter((p) => p.id !== assistantMsg.id);
    } else {
      // Find corresponding user question
      const msgIndex = messages.findIndex((m) => m.id === assistantMsg.id);
      let userQuery = "Financial Query";
      if (msgIndex > 0 && messages[msgIndex - 1].sender === "user") {
        userQuery = messages[msgIndex - 1].content;
      } else if (assistantMsg.metadata?.question) {
        userQuery = assistantMsg.metadata.question;
      }

      const item = {
        id: assistantMsg.id,
        question: userQuery,
        answer: assistantMsg.content,
        citations: assistantMsg.metadata?.citations || [],
        source_type: assistantMsg.source_type,
        pinned_at: new Date().toISOString(),
      };
      updated = [item, ...pinnedAnswers];
    }
    setPinnedAnswers(updated);
    localStorage.setItem("finance_ai_pinned_answers", JSON.stringify(updated));
  };

  const handleUnpin = (pinId) => {
    const updated = pinnedAnswers.filter((p) => p.id !== pinId);
    setPinnedAnswers(updated);
    localStorage.setItem("finance_ai_pinned_answers", JSON.stringify(updated));
  };

  const isPinned = (msgId) => pinnedAnswers.some((p) => p.id === msgId);

  // --- Notifications Actions ---
  const handleMarkNotifRead = (id) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    localStorage.setItem("finance_ai_notifications", JSON.stringify(updated));
  };

  const handleMarkAllNotifsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("finance_ai_notifications", JSON.stringify(updated));
  };

  const handleClearAllNotifs = () => {
    setNotifications([]);
    localStorage.setItem("finance_ai_notifications", JSON.stringify([]));
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Open modal handler from sidebar
  const handleOpenModal = (modalName, initialTab = "profile") => {
    if (modalName === "settings") {
      setSettingsInitialTab(initialTab);
    }
    setActiveModal(modalName);
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
          onOpenModal={handleOpenModal}
          pinnedCount={pinnedAnswers.length}
          unreadNotifCount={unreadNotifCount}
        />

        <main className="chat-main">
          {selectedCategory && (
            <div
              style={{
                background: "rgba(0, 141, 218, 0.08)",
                borderBottom: "1px solid rgba(0, 141, 218, 0.2)",
                padding: "6px 24px",
                fontSize: "12px",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>
                Domain Filter Applied: <strong>{selectedCategory}</strong>
              </span>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  background: "transparent",
                  color: "var(--accent-blue)",
                  textDecoration: "underline",
                  fontSize: "11px",
                }}
              >
                Clear
              </button>
            </div>
          )}

          <div className="chat-messages-container">
            {messages.length === 0 ? (
              <div style={{ margin: "auto", maxWidth: "680px", textAlign: "center", padding: "40px 20px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    background: "linear-gradient(135deg, var(--accent-blue), var(--primary-navy))",
                    color: "#FFF",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
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
                            <span
                              style={{
                                background: "rgba(16, 185, 129, 0.12)",
                                color: "var(--accent-green)",
                                padding: "3px 8px",
                                borderRadius: "var(--radius-full)",
                                fontSize: "11px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              ✓ Document Grounded (Deterministic)
                            </span>
                          )}
                          {msg.source_type === "web" && (
                            <span
                              style={{
                                background: "rgba(245, 158, 11, 0.12)",
                                color: "var(--accent-amber)",
                                padding: "3px 8px",
                                borderRadius: "var(--radius-full)",
                                fontSize: "11px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
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
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "var(--text-secondary)",
                                textTransform: "uppercase",
                              }}
                            >
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
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "var(--text-secondary)",
                                textTransform: "uppercase",
                              }}
                            >
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

                        {/* Actions: Pin, Copy & Feedback */}
                        <div className="chat-actions-bar">
                          <button
                            className="chat-action-btn"
                            onClick={() => handleTogglePin(msg)}
                            title={isPinned(msg.id) ? "Unpin response" : "Pin response"}
                            style={{
                              color: isPinned(msg.id) ? "var(--accent-amber)" : "inherit",
                              fontWeight: isPinned(msg.id) ? 700 : 500,
                            }}
                          >
                            <Pin
                              size={14}
                              color={isPinned(msg.id) ? "var(--accent-amber)" : "currentColor"}
                              fill={isPinned(msg.id) ? "var(--accent-amber)" : "none"}
                            />
                            {isPinned(msg.id) ? "Pinned" : "Pin"}
                          </button>

                          <button
                            className="chat-action-btn"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            title="Copy answer"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check size={14} color="var(--accent-green)" />
                            ) : (
                              <Copy size={14} />
                            )}
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
                placeholder={
                  language === "Marathi"
                    ? "आर्थिक किंवा कर विषयक प्रश्न विचारा... (उदा. नवीन कर रचना FY 2026-27)"
                    : language === "Hindi"
                    ? "वित्तीय या कर संबंधित प्रश्न पूछें... (उदा. नई कर व्यवस्था FY 2026-27)"
                    : "Ask a financial regulation question... (e.g. RBI repo rate, 80C limits)"
                }
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!inputQuery.trim() || loading}
                title="Send query"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* --- ALL WORKING MODALS --- */}

      {/* 1. Settings Modal (Includes all 8 tabs: Profile, Password, Theme, Language, Chat Prefs, Privacy, Delete History, Notification Prefs) */}
      <SettingsModal
        isOpen={activeModal === "settings"}
        onClose={() => setActiveModal(null)}
        initialTab={settingsInitialTab}
        onDeleteAllSessions={handleDeleteAllSessions}
        onLanguageChange={(newLang) => setLanguage(newLang)}
      />

      {/* 2. My Documents Modal */}
      <MyDocumentsModal
        isOpen={activeModal === "documents"}
        onClose={() => setActiveModal(null)}
      />

      {/* 3. Financial Insights Modal */}
      <FinancialInsightsModal
        isOpen={activeModal === "insights"}
        onClose={() => setActiveModal(null)}
      />

      {/* 4. Pinned Answers Modal */}
      <PinnedAnswersModal
        isOpen={activeModal === "pinned"}
        onClose={() => setActiveModal(null)}
        pinnedAnswers={pinnedAnswers}
        onUnpin={handleUnpin}
      />

      {/* 5. Notifications Modal */}
      <NotificationsModal
        isOpen={activeModal === "notifications"}
        onClose={() => setActiveModal(null)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
        onMarkAllRead={handleMarkAllNotifsRead}
        onClearAll={handleClearAllNotifs}
      />

      {/* 6. Help & Support Modal */}
      <HelpSupportModal
        isOpen={activeModal === "help"}
        onClose={() => setActiveModal(null)}
      />

      {/* 7. About FinanceAI Modal */}
      <AboutModal
        isOpen={activeModal === "about"}
        onClose={() => setActiveModal(null)}
      />

      {/* 8. Feedback Modal */}
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
