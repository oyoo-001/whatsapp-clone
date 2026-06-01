import React from "react";

const ForceUpdatePage = ({ currentVersion, requiredVersion }) => {
  const telegramUrl = "https://t.me/tuchatapp";

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 10000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(12px)",
    },
    card: {
      width: "100%",
      maxWidth: 360,
      background: "#fff",
      borderRadius: 20,
      border: "0.5px solid rgba(0,0,0,0.1)",
      overflow: "hidden",
      boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
    },
    header: {
      background: "#064E45",
      padding: "2rem 1.5rem 1.5rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 14,
      background: "rgba(255,255,255,0.12)",
      border: "0.5px solid rgba(255,255,255,0.18)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    brandLabel: {
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.55)",
      margin: "0 0 4px",
    },
    title: {
      fontSize: 20,
      fontWeight: 500,
      color: "#fff",
      margin: 0,
    },
    body: {
      padding: "1.5rem",
    },
    description: {
      fontSize: 14,
      color: "#666",
      lineHeight: 1.6,
      margin: "0 0 1.25rem",
      textAlign: "center",
    },
    warning: {
      background: "#FFFBEB",
      borderRadius: 8,
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: "1.25rem",
      border: "0.5px solid #FDE68A",
    },
    warningText: {
      fontSize: 12,
      color: "#92400E",
      margin: 0,
      lineHeight: 1.5,
    },
    telegramBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      width: "100%",
      padding: "13px 0",
      borderRadius: 8,
      background: "#0088CC",
      color: "#fff",
      fontSize: 14,
      fontWeight: 500,
      textDecoration: "none",
      boxSizing: "border-box",
    },
    footer: {
      padding: "10px 1.5rem",
      borderTop: "0.5px solid #E0E0E0",
      display: "flex",
      justifyContent: "center",
    },
    footerText: {
      fontSize: 11,
      color: "#aaa",
      margin: 0,
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconBox}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={styles.brandLabel}>TuChat Messenger</p>
            <h1 style={styles.title}>Update required</h1>
          </div>
        </div>

        <div style={styles.body}>
          <p style={styles.description}>
            You're running an older version of TuChat. Please update to continue
            using the app and access the latest improvements.
          </p>
          <div style={styles.warning}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={styles.warningText}>
              Chat access is paused until you update.
            </p>
          </div>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.telegramBtn}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Click here for latest version
          </a>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Your version: {currentVersion || 'unknown'} &nbsp;·&nbsp; Required: {requiredVersion || 'unknown'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForceUpdatePage;
