import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle, Coffee, Heart } from "lucide-react";
import { Colors } from "../styles/theme";

// ⚠️ Replace with your actual Paystack Public Key
const PAYSTACK_PUBLIC_KEY = "pk_live_68e35e25956f2b4edbec5116d86f9787fb6bffb4";
const DEVELOPER_EMAIL = "byronoyoo2030@gmail.com"; // email that receives the payment

// Social media SVG icons as React components (since lucide-react doesn't include Facebook/Twitter/Instagram/Discord)
const FacebookIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 4l16 16M4 20L20 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M20 4h-5l-11 16h5L20 4z" />
  </svg>
);

const InstagramIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none" />
  </svg>
);

const DiscordIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const AboutPage = () => {
  const navigate = useNavigate();
  const [donationAmount, setDonationAmount] = useState("");
  const [donating, setDonating] = useState(false);

  // Load Paystack inline script once
  useEffect(() => {
    if (!document.getElementById("paystack-script")) {
      const script = document.createElement("script");
      script.id = "paystack-script";
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleDonate = () => {
    const amount = parseFloat(donationAmount);
    if (!donationAmount || isNaN(amount) || amount < 1) {
      alert("Please enter a valid amount (minimum KES 1).");
      return;
    }
    if (typeof window.PaystackPop === "undefined") {
      alert("Paystack is still loading. Please try again in a moment.");
      return;
    }
    setDonating(true);
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: DEVELOPER_EMAIL,
      amount: Math.round(amount * 100), // Paystack uses kobo/cents
      currency: "KES",
      label: "Buy Developer a Cup of Coffee ☕",
      metadata: {
        custom_fields: [
          {
            display_name: "Note",
            variable_name: "note",
            value: "TuChat donation",
          },
        ],
      },
      onClose: () => setDonating(false),
      callback: (response) => {
        setDonating(false);
        setDonationAmount("");
        alert(
          `Thank you so much! 🎉 Your support means a lot.\nRef: ${response.reference}`,
        );
      },
    });
    handler.openIframe();
  };

  const socialLinks = [
    {
      label: "Facebook",
      icon: <FacebookIcon size={18} color="#1877F2" />,
      href: "https://www.facebook.com/profile.php?id=61590354428261",
      bg: "#E7F0FD",
      color: "#1877F2",
    },
    {
      label: "Twitter / X",
      icon: <TwitterIcon size={18} color="#000" />,
      href: "https://x.com/oyoo_byron",
      bg: "#f0f0f0",
      color: "#000",
    },
    {
      label: "Instagram",
      icon: <InstagramIcon size={18} color="#E1306C" />,
      href: "https://instagram.com/tuchat",
      bg: "#FCE4EC",
      color: "#E1306C",
    },
    {
      label: "Discord",
      icon: <DiscordIcon size={18} color="#5865F2" />,
      href: "https://discord.gg/tuchat",
      bg: "#EEF0FF",
      color: "#5865F2",
    },
  ];

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
        {/* App Icon */}
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

        {/* Description */}
        <div
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            lineHeight: 1.6,
            maxWidth: 320,
            margin: "0 auto 32px",
            textAlign: "left",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: Colors.textPrimary,
              margin: "0 0 8px",
              textAlign: "center",
            }}
          >
            Full-Stack Real-Time Chat Application
          </h2>
          <p style={{ margin: "0 0 8px" }}>
            A modern, secure communication platform built with React, Node.js,
            and Socket.IO.
          </p>
          <p style={{ margin: "0 0 4px" }}>
            <b>Instant Messaging:</b> Low-latency text delivery and typing
            indicators.
          </p>
          <p style={{ margin: "0 0 4px" }}>
            <b>Rich Media:</b> Integrated real-time voice and video
            conferencing.
          </p>
          <p style={{ margin: "0 0 4px" }}>
            <b>Collaboration:</b> Dynamic group chat creation and management.
          </p>
          <p style={{ margin: 0 }}>
            <b>Security:</b> Built with robust end-to-end encryption protocols.
          </p>
        </div>

        {/* Contact Support */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/support-chat");
            }}
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

        {/* Buy Developer a Coffee – Paystack */}
        <div
          style={{
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 14,
            padding: "16px 20px",
            maxWidth: 320,
            margin: "0 auto 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Coffee size={16} color="#16a34a" />
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#16a34a",
                margin: 0,
              }}
            >
              Buy Developer a Coffee
            </p>
          </div>
          <p
            style={{
              fontSize: 12,
              color: Colors.textSecondary,
              margin: "0 0 14px",
              lineHeight: 1.5,
            }}
          >
            Enjoying TuChat? Show some love and support the developer!
          </p>

          {/* Amount input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #BBF7D0",
                borderRadius: 10,
                background: "#fff",
                flex: 1,
                overflow: "hidden",
                padding: "0 10px",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginRight: 4,
                }}
              >
                KES
              </span>
              <input
                type="number"
                min="100"
                placeholder="e.g. 500"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  flex: 1,
                  padding: "10px 0",
                  background: "transparent",
                  color: Colors.textPrimary,
                  width: "100%",
                }}
              />
            </div>
          </div>

          {/* Quick-pick preset amounts */}
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            {[100, 250, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => setDonationAmount(String(amt))}
                style={{
                  background:
                    donationAmount === String(amt) ? "#16a34a" : "#E8F5E9",
                  color: donationAmount === String(amt) ? "#fff" : "#16a34a",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {amt}
              </button>
            ))}
          </div>

          <button
            onClick={handleDonate}
            disabled={donating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: donating ? "#86efac" : "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: donating ? "not-allowed" : "pointer",
              width: "100%",
              transition: "background 0.2s",
            }}
          >
            <Heart size={16} color="#fff" />
            {donating ? "Opening Paystack…" : "Support Us"}
          </button>
          <p
            style={{ fontSize: 11, color: Colors.textHint, margin: "8px 0 0" }}
          >
            Secure payment via Paystack · All currencies accepted
          </p>
        </div>

        {/* Follow Us Section */}
        <div
          style={{
            maxWidth: 320,
            margin: "0 auto 32px",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: Colors.textPrimary,
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Follow Us
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {socialLinks.map(({ label, icon, href, bg, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: bg,
                  color: color,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {icon}
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, fontSize: 12, color: Colors.textHint }}>
          &copy; 2026 TuChat. All rights reserved.
        </div>
        <div style={{ marginTop: 8, marginBottom: 24 }}>
          <span style={{ color: Colors.textHint, fontSize: 12 }}>
            Developed by{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: Colors.textHint, textDecoration: "none" }}
            >
              Byron Okoth
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
