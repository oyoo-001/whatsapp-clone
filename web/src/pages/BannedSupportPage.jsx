import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ShieldAlert,
  Send,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Copy,
  ExternalLink,
  Loader2,
  User,
} from "lucide-react";
import { io } from "socket.io-client";
import { Colors } from "../styles/theme";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";
const API_BASE = (import.meta.env.VITE_API_URL || "") + "/api";

const BannedSupportPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Form state
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+254");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const countryCodes = [
    { code: "+254", name: "KE", label: "Kenya" },
    { code: "+1", name: "US", label: "USA/Canada" },
    { code: "+44", name: "UK", label: "United Kingdom" },
    { code: "+91", name: "IN", label: "India" },
    { code: "+234", name: "NG", label: "Nigeria" },
    { code: "+27", name: "ZA", label: "South Africa" },
    { code: "+256", name: "UG", label: "Uganda" },
    { code: "+255", name: "TZ", label: "Tanzania" },
    { code: "+233", name: "GH", label: "Ghana" },
    { code: "+20", name: "EG", label: "Egypt" },
    { code: "+251", name: "ET", label: "Ethiopia" },
    { code: "+212", name: "MA", label: "Morocco" },
    { code: "+92", name: "PK", label: "Pakistan" },
    { code: "+880", name: "BD", label: "Bangladesh" },
    { code: "+63", name: "PH", label: "Philippines" },
    { code: "+62", name: "ID", label: "Indonesia" },
    { code: "+86", name: "CN", label: "China" },
    { code: "+81", name: "JP", label: "Japan" },
    { code: "+82", name: "KR", label: "South Korea" },
    { code: "+33", name: "FR", label: "France" },
    { code: "+49", name: "DE", label: "Germany" },
    { code: "+39", name: "IT", label: "Italy" },
    { code: "+34", name: "ES", label: "Spain" },
    { code: "+55", name: "BR", label: "Brazil" },
    { code: "+52", name: "MX", label: "Mexico" },
    { code: "+61", name: "AU", label: "Australia" },
  ];

  // Live chat state
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [ticketIdDisplay, setTicketIdDisplay] = useState(null);
  const [supportToken, setSupportToken] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);

  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const submitRequest = async (e) => {
    e.preventDefault();
    setError("");
    const localNum = phone.trim().replace(/^0+/, "");
    if (!localNum) { setError("Phone number is required"); return; }
    const fullPhone = countryCode + localNum;
    if (!message.trim()) { setError("Message is required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/support/banned-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullPhone, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setTicketId(data.ticketId);
      setTicketIdDisplay(data.ticketIdDisplay || `TKT-${String(data.ticketId).padStart(5, "0")}`);
      setSupportToken(data.supportToken);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Connect socket and fetch messages after getting support token
  useEffect(() => {
    if (!supportToken || !ticketId) return;

    const socket = io(SOCKET_URL || "/", {
      auth: { token: supportToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Banned support socket connected");
    });

    socket.on("support:new-message", (data) => {
      if (data.ticketId === ticketId || parseInt(data.ticketId) === ticketId) {
        setChatMessages((prev) => {
          const exists = prev.find((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
      }
    });

    // Fetch existing messages
    fetch(`${API_BASE}/support/banned-ticket/${ticketId}/messages`, {
      headers: { Authorization: `Bearer ${supportToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setChatMessages(data.messages || []);
        setTicket(data.ticket);
      })
      .catch(() => {});

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [supportToken, ticketId]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/support/banned-ticket/${ticketId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supportToken}`,
        },
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to send");
      }
      const data = await res.json();
      setChatMessages((prev) => {
        const exists = prev.find((m) => m.id === data.message.id);
        if (exists) return prev;
        return [...prev, data.message];
      });
      setChatInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const copyId = () => {
    if (ticketIdDisplay) navigator.clipboard?.writeText(ticketIdDisplay);
  };

  // Render live chat UI when submitted
  if (submitted) {
    const statusColor =
      ticket?.status === "resolved" ? Colors.primary
      : ticket?.status === "in_progress" ? Colors.accent
      : Colors.textHint;
    const statusLabel =
      ticket?.status === "resolved" ? "Resolved"
      : ticket?.status === "in_progress" ? "Admin is reviewing"
      : "Waiting for admin";

    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, maxWidth: 500, padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              background: Colors.primary,
              padding: "20px 20px 16px",
              color: Colors.white,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Support Chat</h2>
              <button onClick={copyId} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: Colors.white, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <Copy size={12} />
                {ticketIdDisplay}
              </button>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.8 }}>
              Status: <span style={{ fontWeight: 600 }}>{statusLabel}</span>
            </p>
          </div>

          {/* Messages */}
          <div
            style={{
              height: 320,
              overflowY: "auto",
              padding: "16px 16px 8px",
              background: "#ECE5DD",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {chatMessages.length === 0 && (
              <div style={{ textAlign: "center", color: Colors.textHint, fontSize: 13, marginTop: 80 }}>
                No messages yet. Start the conversation.
              </div>
            )}
            {chatMessages.map((msg) => {
              const isMine = msg.sender && msg.sender.id === ticket?.userId;
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isMine ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    background: isMine ? "#DCF8C6" : Colors.white,
                    borderRadius: isMine ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    padding: "10px 14px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                  }}
                >
                  {msg.sender && msg.sender.isAdmin && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: Colors.primary, marginBottom: 2 }}>
                      {msg.sender.username}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: Colors.textPrimary, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, color: Colors.textHint, textAlign: "right", marginTop: 2 }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", background: Colors.white, borderTop: "1px solid #F0F2F5" }}>
            {ticket?.status === "resolved" ? (
              <div style={{ textAlign: "center", color: Colors.textSecondary, fontSize: 13, padding: 8 }}>
                This ticket has been resolved.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    background: "#F0F2F5",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: Colors.textPrimary,
                    outline: "none",
                  }}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={sending || !chatInput.trim()}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: sending || !chatInput.trim() ? "#E0E0E0" : Colors.secondary,
                    border: "none",
                    cursor: sending || !chatInput.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {sending ? (
                    <Loader2 size={18} color={Colors.white} style={{ animation: "spin 0.7s linear infinite" }} />
                  ) : (
                    <Send size={18} color={Colors.white} />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Bottom action */}
          <div style={{ padding: "12px 16px", textAlign: "center", borderTop: "1px solid #F0F2F5" }}>
            <button onClick={() => navigate("/login")} style={{ background: "transparent", border: "none", color: Colors.textSecondary, fontSize: 13, cursor: "pointer", padding: 6 }}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial submission form
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <button onClick={() => navigate("/login")} style={{ background: "transparent", border: "none", cursor: "pointer", color: Colors.textSecondary, display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 16, padding: 4 }}>
          <ArrowLeft size={16} />
          Back to Login
        </button>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <ShieldAlert size={28} color="#DC2626" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: Colors.textPrimary, margin: "0 0 6px", textAlign: "center" }}>
          Account Deactivated
        </h2>
        <p style={{ fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: "1.5", margin: "0 0 24px" }}>
          Your account has been deactivated. Submit a request below and an admin will review your case.
        </p>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 12px", color: "#B91C1C", fontSize: 13, marginBottom: 16 }}>
            <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={submitRequest} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 700, marginBottom: 6, display: "block", letterSpacing: "0.8px" }}>
                YOUR PHONE NUMBER
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    style={{
                      height: 48,
                      padding: "0 12px",
                      background: "#F5F7FA",
                      border: "2px solid transparent",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      color: Colors.textPrimary,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    <span>{countryCode}</span>
                    <span style={{ fontSize: 9, color: Colors.textHint }}>▼</span>
                  </button>
                  {showCountryDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: 52,
                        left: 0,
                        zIndex: 100,
                        background: Colors.white,
                        borderRadius: 12,
                        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                        maxHeight: 200,
                        overflowY: "auto",
                        minWidth: 160,
                        padding: 4,
                        animation: "scaleIn 0.12s ease",
                      }}
                    >
                      {countryCodes.map((cc) => (
                        <button
                          key={cc.code}
                          type="button"
                          onClick={() => { setCountryCode(cc.code); setShowCountryDropdown(false); }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "8px 12px",
                            background: countryCode === cc.code ? "#E8F5E9" : "transparent",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 13,
                            color: Colors.textPrimary,
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#F0F2F5"}
                          onMouseLeave={(e) => e.currentTarget.style.background = countryCode === cc.code ? "#E8F5E9" : "transparent"}
                        >
                          <span style={{ fontWeight: 600, minWidth: 44 }}>{cc.code}</span>
                          <span style={{ color: Colors.textSecondary }}>{cc.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <Phone size={16} color={Colors.textHint} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 1, pointerEvents: "none" }} />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="712345678"
                    style={{ ...inputStyle, paddingLeft: 42, height: 48 }}
                  />
                </div>
              </div>
            </div>
          <div>
            <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 700, marginBottom: 6, display: "block", letterSpacing: "0.8px" }}>
              MESSAGE
            </label>
            <div style={{ position: "relative" }}>
              <MessageSquare size={16} color={Colors.textHint} style={{ position: "absolute", left: 14, top: 14, zIndex: 1, pointerEvents: "none" }} />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain your situation..."
                rows={4}
                style={{ ...inputStyle, paddingLeft: 42, paddingTop: 12, resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ ...buttonStyle, ...(loading ? { opacity: 0.8 } : {}), display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading ? <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} /> : <Send size={18} />}
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
};

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: `linear-gradient(145deg, ${Colors.primary} 0%, #00695C 100%)`,
  padding: 24,
};

const cardStyle = {
  background: Colors.white,
  borderRadius: 24,
  padding: "32px 28px",
  maxWidth: 400,
  width: "100%",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  animation: "slideUp 0.4s ease",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#F5F7FA",
  border: "2px solid transparent",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 14,
  color: Colors.textPrimary,
  outline: "none",
  transition: "border-color 0.2s",
};

const buttonStyle = {
  width: "100%",
  background: `linear-gradient(135deg, ${Colors.primary} 0%, ${Colors.secondary} 100%)`,
  color: Colors.white,
  border: "none",
  borderRadius: 12,
  padding: "16px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export default BannedSupportPage;
