import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Mic, MicOff, PhoneOff, UserPlus, X, Search,
} from "lucide-react";
import webrtcService from "../services/webrtc";
import socketService from "../services/socket";
import useAuthStore from "../stores/authStore";
import useContactStore from "../stores/contactStore";
import useCallStore from "../stores/callStore";
import { callsAPI } from "../services/api";
import { Colors } from "../styles/theme";
import { useWebRTCSignaling } from "../services/useWebRTC";

const VoiceCallPage = () => {
  const { channelName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { contacts, fetchContacts } = useContactStore();

  const meetingName = state?.name || "Call";
  const isCaller = state?.caller !== false;
  const remoteUserId = state?.remoteUserId || null;
  const startedAt = state?.startedAt || Date.now();
  const remoteAvatar = state?.remoteAvatar || null;

  const [callState, setCallState] = useState(isCaller ? "calling" : "connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [duration, setDuration] = useState(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  const [error, setError] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [invitedContacts, setInvitedContacts] = useState([]);

  const timerRef = useRef(null);
  const leftRef = useRef(false);
  const callLogIdRef = useRef(state?.callLogId || null);
  const startedAtRef = useRef(startedAt);
  const remoteUserIdRef = useRef(remoteUserId);
  const channelNameRef = useRef(channelName);
  const audioRef = useRef(null);
  const { setActiveCall, clearActiveCall } = useCallStore();

  const cleanupAndGoBack = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    webrtcService.cleanup();
    navigate(-1);
  }, [navigate]);

  const handleRemoteStream = useCallback((userId, stream) => {
    setRemoteStream(stream);
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
    setCallState("connected");
  }, []);

  const handleRemoteLeave = useCallback(() => {
    setRemoteStream(null);
    if (!leftRef.current) cleanupAndGoBack();
  }, [cleanupAndGoBack]);

  useWebRTCSignaling({
    channelName,
    isCaller,
    remoteUserId: remoteUserIdRef.current,
    onRemoteStream: handleRemoteStream,
    onRemoteLeave: handleRemoteLeave,
    onCallAccepted: useCallback(() => setCallState("connected"), []),
    onCallRejected: useCallback(() => {
      if (!leftRef.current && isCaller) cleanupAndGoBack();
    }, [isCaller, cleanupAndGoBack]),
    onCallEnded: useCallback(() => {
      if (!leftRef.current) cleanupAndGoBack();
    }, [cleanupAndGoBack]),
    onCallTimedout: useCallback(() => {
      if (!leftRef.current && isCaller) cleanupAndGoBack();
    }, [isCaller, cleanupAndGoBack]),
  });

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await webrtcService.startLocalStream(true);
        if (cancelled) return;
      } catch (err) {
        if (!cancelled) setError("Could not access microphone.");
      }
    };
    init();

    setActiveCall({
      returnPath: `/voice-call/${channelNameRef.current}`,
      remoteUserId: remoteUserIdRef.current,
      callLogId: callLogIdRef.current,
    });

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      clearActiveCall();
      if (!leftRef.current) {
        leftRef.current = true;
        if (remoteUserIdRef.current) {
          socketService.emit("call:end", { to: remoteUserIdRef.current });
        }
        webrtcService.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleLeave = async () => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (callLogIdRef.current && callState === "connected") {
      try { await callsAPI.updateCallStatus(callLogIdRef.current, "ended"); } catch {}
    }
    if (remoteUserIdRef.current) socketService.emit("call:end", { to: remoteUserIdRef.current });
    webrtcService.cleanup();
    navigate(-1);
  };

  const toggleMute = () => {
    const next = !isMuted;
    webrtcService.toggleMic(!next);
    setIsMuted(next);
  };

  const inviteContact = (contact) => {
    const uid = contact.contactUser?.id || contact.contactUserId;
    if (invitedContacts.includes(uid)) return;
    setInvitedContacts((prev) => [...prev, uid]);
    socketService.emit("call:start", {
      to: uid, channelName: channelNameRef.current, callType: "voice", startedAt: Date.now(),
    });
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const avatarGradient = (id) =>
    `linear-gradient(135deg, hsl(${((id || 0) * 60) % 360}, 50%, 55%), hsl(${((id || 0) * 60 + 30) % 360}, 55%, 40%))`;

  const filteredContacts = contacts.filter((c) => {
    const u = c.contactUser || c;
    return u.username?.toLowerCase().includes(contactSearch.toLowerCase());
  });

  if (error) {
    return (
      <div style={styles.errorPage}>
        <div style={styles.errorIcon}>!</div>
        <h2 style={styles.errorTitle}>Call failed</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={() => navigate(-1)} style={styles.goBackBtn}>Go back</button>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <audio ref={audioRef} autoPlay />

      <div style={styles.main}>
        {remoteAvatar ? (
          <img src={remoteAvatar} alt="" style={styles.remoteAvatarImg} />
        ) : (
          <div style={{
            ...styles.avatarCircle,
            background: avatarGradient(remoteUserId || currentUser?.id),
          }}>
            {(meetingName || "?").charAt(0).toUpperCase()}
          </div>
        )}

        <p style={styles.calleeName}>{meetingName}</p>

        <div style={styles.statusRow}>
          <span style={{
            ...styles.statusDot,
            background: callState === "connected" ? "#4CAF50" : "#FFC107",
          }} />
          <span style={styles.statusText}>
            {callState === "calling" ? "Calling..."
              : callState === "connecting" ? "Connecting..."
              : callState === "connected" ? fmt(duration)
              : "Connecting..."}
          </span>
        </div>

        <div style={styles.waveContainer}>
          {callState === "calling" && (
            <div style={styles.waveGroup}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ ...styles.wave, animationDelay: `${i * 0.4}s` }} />
              ))}
            </div>
          )}
          {callState === "connected" && (
            <div style={styles.connectedBars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  ...styles.bar,
                  animationDelay: `${i * 0.15}s`,
                  height: `${20 + Math.sin(i * 1.2) * 12}px`,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.bottomArea}>
        <button onClick={handleLeave} style={styles.endBtn}>
          <PhoneOff size={28} color="#fff" />
        </button>

        <div style={styles.actionRow}>
          <button onClick={toggleMute} style={{
            ...styles.actionBtn,
            background: isMuted ? "#E53935" : "rgba(255,255,255,0.12)",
          }}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button onClick={() => { fetchContacts(); setShowAddContact(true); }} style={styles.actionBtn}>
            <UserPlus size={22} />
          </button>
        </div>

        <div style={styles.actionLabels}>
          <span style={styles.actionLabel}>{isMuted ? "Unmute" : "Mute"}</span>
          <span style={styles.actionLabel}>Add</span>
        </div>
      </div>

      {showAddContact && (
        <div style={styles.modalOverlay} onClick={() => setShowAddContact(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Add to Call</h3>
              <button onClick={() => setShowAddContact(false)} style={styles.modalClose}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.searchBar}>
              <Search size={16} color="rgba(255,255,255,0.4)" />
              <input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                style={styles.searchInput}
              />
            </div>
            <div style={styles.contactList}>
              {filteredContacts.length === 0 ? (
                <p style={styles.noContacts}>No contacts found</p>
              ) : (
                filteredContacts.map((c) => {
                  const u = c.contactUser || c;
                  const isInvited = invitedContacts.includes(u.id);
                  return (
                    <button
                      key={c.id || u.id}
                      onClick={() => inviteContact(u)}
                      disabled={isInvited}
                      style={{
                        ...styles.contactItem,
                        opacity: isInvited ? 0.5 : 1,
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: `hsl(${(u.id * 60) % 360}, 45%, 45%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 600, fontSize: 15, flexShrink: 0,
                      }}>
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff" }}>
                        {u.username}
                      </span>
                      <span style={{ fontSize: 12, color: isInvited ? "#4CAF50" : Colors.green }}>
                        {isInvited ? "Invited" : "Invite"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  root: {
    height: "100vh",
    background: "linear-gradient(145deg, #0D1117 0%, #161B22 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, -apple-system, sans-serif",
    overflow: "hidden",
    position: "relative",
  },
  errorPage: {
    height: "100vh",
    background: "#0D1117",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  errorIcon: { fontSize: 40, color: "#E53935" },
  errorTitle: { color: "#fff", margin: 0, fontSize: 18, fontWeight: 500 },
  errorText: { color: "rgba(255,255,255,0.5)", textAlign: "center", fontSize: 14, margin: 0 },
  goBackBtn: { marginTop: 8, padding: "10px 32px", borderRadius: 24, border: "none", background: Colors.green, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  main: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: "-80px",
  },
  remoteAvatarImg: {
    width: 100, height: 100, borderRadius: "50%", objectFit: "cover",
    border: "3px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
  },
  avatarCircle: {
    width: 100, height: 100, borderRadius: "50%", display: "flex",
    alignItems: "center", justifyContent: "center", color: "#fff",
    fontWeight: 600, fontSize: 40, boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
    border: "3px solid rgba(255,255,255,0.15)",
  },
  calleeName: { color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 },
  statusRow: { display: "flex", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  statusText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 400 },
  waveContainer: { height: 60, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 },
  waveGroup: { display: "flex", gap: 8, alignItems: "center" },
  wave: {
    width: 8, height: 8, borderRadius: "50%", background: Colors.green,
    opacity: 0.6, animation: "voicePulse 1.2s ease-in-out infinite",
  },
  connectedBars: { display: "flex", gap: 4, alignItems: "center", height: 40 },
  bar: {
    width: 4, borderRadius: 2, background: Colors.green,
    animation: "barBounce 0.8s ease-in-out infinite alternate", minHeight: 8,
  },
  bottomArea: {
    position: "absolute",
    bottom: 48,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  endBtn: {
    width: 72, height: 72, borderRadius: "50%", background: "#E53935",
    border: "none", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", boxShadow: "0 6px 30px rgba(229,57,53,0.55)",
    zIndex: 2,
  },
  actionRow: {
    display: "flex",
    gap: 28,
    marginTop: 6,
    justifyContent: "center",
  },
  actionBtn: {
    width: 52, height: 52, borderRadius: "50%",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer", color: "#fff", display: "flex",
    alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(8px)", transition: "background 0.2s",
  },
  actionLabels: {
    display: "flex",
    gap: 28,
    justifyContent: "center",
    marginTop: 2,
  },
  actionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    textAlign: "center",
    width: 52,
  },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center",
  },
  modal: {
    background: "#1A1D24", borderRadius: "20px 20px 0 0",
    width: "100%", maxWidth: 480, maxHeight: "70vh",
    display: "flex", flexDirection: "column",
    padding: "20px 16px 30px", animation: "slideUp 0.25s ease",
  },
  modalHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: 600, margin: 0 },
  modalClose: {
    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
    width: 32, height: 32, cursor: "pointer", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  searchBar: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(255,255,255,0.08)", borderRadius: 10,
    padding: "8px 12px", marginBottom: 12,
  },
  searchInput: {
    flex: 1, border: "none", background: "transparent", fontSize: 14,
    color: "#fff", outline: "none",
  },
  contactList: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 },
  noContacts: { color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 14, padding: 40 },
  contactItem: {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 8px",
    borderRadius: 10, border: "none", background: "transparent",
    cursor: "pointer", color: "#fff", transition: "background 0.15s",
  },
};

export default VoiceCallPage;
