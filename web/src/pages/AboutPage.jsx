import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, GitBranch, Mail } from "lucide-react";
import { Colors } from "../styles/theme";

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        width: "100%",
        background: Colors.white,
      }}
    >
      <header
        style={{
          background: Colors.primary,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 20,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            color: Colors.white,
            padding: 8,
            display: "flex",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          style={{
            color: Colors.white,
            fontSize: 17,
            fontWeight: 600,
            margin: 0,
          }}
        >
          About
        </h1>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: Colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <MessageCircle size={40} color={Colors.white} />
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: Colors.textPrimary,
            margin: "0 0 4px",
          }}
        >
          TuChat
        </h2>
        <p
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            margin: "0 0 24px",
          }}
        >
          Version 1.2.0
        </p>
        <p
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            lineHeight: 1.6,
            maxWidth: 320,
            margin: "0 auto 32px",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: Colors.textPrimary,
              margin: "0 0 8px",
            }}
          >
            Full-Stack Real-Time Chat Application
          </h2>
          A modern, secure communication platform built with React, Node.js, and
          Socket.IO.
          <br />
          <b>Instant Messaging:</b>
          Low-latency text delivery and typing indicators.
          <br />
          <b>Rich Media:</b>
          Integrated real-time voice and video conferencing.
          <br />
          <b>Collaboration:</b>
          Dynamic group chat creation and management.
          <br />
          <b>Security:</b>
          Built with robust end-to-end encryption protocols.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
          }}
        >
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: Colors.primary,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            <GitBranch size={18} /> View on GitHub
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/support-chat'); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: Colors.primary,
              fontSize: 14,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <MessageCircle size={18} /> Contact Support
          </a>
        </div>

        <div style={{ marginTop: 40, fontSize: 12, color: Colors.textHint }}>
          &copy; 2026 TuChat. All rights reserved.
        </div>
        <div style={{ marginTop: 20 }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ color: Colors.textHint, textDecoration: "none" }}
          >
            Developed by{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: Colors.textHint, textDecoration: "none" }}
            >
              TuChat Team
            </a>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
