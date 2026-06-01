import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Smartphone, RotateCcw,
} from "lucide-react";
import webrtcService from "../services/webrtc";
import socketService from "../services/socket";
import useAuthStore from "../stores/authStore";
import useCallStore from "../stores/callStore";
import { callsAPI } from "../services/api";
import { Colors } from "../styles/theme";
import { useWebRTCSignaling } from "../services/useWebRTC";

const VideoCallPage = () => {
  const { channelName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const meetingName = state?.name || "Call";
  const isCaller = state?.caller !== false;
  const remoteUserId = state?.remoteUserId || null;
  const startedAt = state?.startedAt || Date.now();
  const remoteAvatar = state?.remoteAvatar || null;

  const [callState, setCallState] = useState(isCaller ? "calling" : "connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [duration, setDuration] = useState(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const timerRef = useRef(null);
  const leftRef = useRef(false);
  const callLogIdRef = useRef(state?.callLogId || null);
  const startedAtRef = useRef(startedAt);
  const remoteUserIdRef = useRef(remoteUserId);
  const channelNameRef = useRef(channelName);
  const { setActiveCall, clearActiveCall } = useCallStore();

  const pipRef = useRef(null);
  const [pipPos, setPipPos] = useState({ x: 16, y: 100 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  const cleanupAndGoBack = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    webrtcService.cleanup();
    navigate(-1);
  }, [navigate]);

  const handleRemoteStream = useCallback((userId, stream) => {
    setRemoteStream(stream);
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
        await webrtcService.startLocalStream(false);
        if (cancelled) return;
        if (localRef.current && webrtcService.localStream) {
          localRef.current.srcObject = webrtcService.localStream;
          localRef.current.muted = true;
        }
      } catch (err) {
        if (!cancelled) setError("Could not access camera/microphone.");
      }
    };
    init();

    setActiveCall({
      returnPath: `/video-call/${channelNameRef.current}`,
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
        if (remoteUserIdRef.current) socketService.emit("call:end", { to: remoteUserIdRef.current });
        webrtcService.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
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

  const toggleVideo = () => {
    const next = !isVideoOff;
    webrtcService.toggleCamera(!next);
    setIsVideoOff(next);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await webrtcService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webrtcService.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch { setIsScreenSharing(false); }
  };

  const switchCamera = async () => {
    try {
      await webrtcService.switchCamera();
    } catch {}
  };

  const handlePipMouseDown = (e) => {
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX || e.touches?.[0]?.clientX;
    dragRef.current.startY = e.clientY || e.touches?.[0]?.clientY;
    dragRef.current.startPosX = pipPos.x;
    dragRef.current.startPosY = pipPos.y;
    document.addEventListener("mousemove", handlePipMouseMove);
    document.addEventListener("mouseup", handlePipMouseUp);
    document.addEventListener("touchmove", handlePipTouchMove, { passive: false });
    document.addEventListener("touchend", handlePipTouchEnd);
  };

  const handlePipMouseMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPipPos({
      x: Math.max(0, Math.min(window.innerWidth - 140, dragRef.current.startPosX + dx)),
      y: Math.max(60, Math.min(window.innerHeight - 200, dragRef.current.startPosY + dy)),
    });
  };

  const handlePipMouseUp = () => {
    dragRef.current.dragging = false;
    document.removeEventListener("mousemove", handlePipMouseMove);
    document.removeEventListener("mouseup", handlePipMouseUp);
  };

  const handlePipTouchMove = (e) => {
    if (!dragRef.current.dragging) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - dragRef.current.startX;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    setPipPos({
      x: Math.max(0, Math.min(window.innerWidth - 140, dragRef.current.startPosX + dx)),
      y: Math.max(60, Math.min(window.innerHeight - 200, dragRef.current.startPosY + dy)),
    });
  };

  const handlePipTouchEnd = () => {
    dragRef.current.dragging = false;
    document.removeEventListener("touchmove", handlePipTouchMove);
    document.removeEventListener("touchend", handlePipTouchEnd);
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const avatarGradient = (id) =>
    `linear-gradient(135deg, hsl(${((id || 0) * 60) % 360}, 50%, 55%), hsl(${((id || 0) * 60 + 30) % 360}, 55%, 40%))`;

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
      {remoteStream || callState === "connected" ? (
        <video
          ref={remoteRef}
          autoPlay playsInline
          style={styles.remoteVideo}
        />
      ) : (
        <div style={styles.preConnect}>
          {remoteAvatar ? (
            <img src={remoteAvatar} alt="" style={styles.remoteAvatarImg} />
          ) : (
            <div style={{
              ...styles.avatarCircle,
              background: avatarGradient(remoteUserId),
            }}>
              {(meetingName || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <p style={styles.calleeName}>{meetingName}</p>
          <div style={styles.statusRow}>
            <span style={{
              ...styles.statusDot,
              background: callState === "calling" ? "#FFC107" : "#4CAF50",
            }} />
            <span style={styles.statusText}>
              {callState === "calling" ? "Calling..." : "Connecting..."}
            </span>
          </div>
        </div>
      )}

      {callState !== "calling" && (
        <div style={{
          ...styles.pip,
          left: pipPos.x,
          top: pipPos.y,
        }}
          ref={pipRef}
          onMouseDown={handlePipMouseDown}
          onTouchStart={handlePipMouseDown}
        >
          <video
            ref={localRef}
            autoPlay playsInline muted
            style={{
              ...styles.pipVideo,
              transform: "scaleX(-1)",
              display: isVideoOff ? "none" : "block",
            }}
          />
          {isVideoOff && (
            <div style={styles.pipFallback}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: avatarGradient(currentUser?.id),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 600, fontSize: 16,
              }}>
                {currentUser?.username?.charAt(0).toUpperCase() || "?"}
              </div>
            </div>
          )}
        </div>
      )}

      {callState !== "connected" && (
        <div style={styles.statusOverlay}>
          <div style={styles.statusRow}>
            <span style={{
              ...styles.statusDot,
              background: callState === "calling" ? "#FFC107" : "#4CAF50",
            }} />
            <span style={styles.statusText}>{callState === "calling" ? "Calling..." : "Connecting..."}</span>
          </div>
        </div>
      )}

      {callState === "connected" && (
        <div style={styles.timerBadge}>
          <span style={styles.timerText}>{fmt(duration)}</span>
        </div>
      )}

      <div style={styles.controls}>
        <CtrlBtn
          icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          label={isMuted ? "Unmute" : "Mute"}
          active={isMuted}
          onClick={toggleMute}
        />
        <CtrlBtn
          icon={isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          label={isVideoOff ? "Cam on" : "Cam off"}
          active={isVideoOff}
          onClick={toggleVideo}
        />
        <CtrlBtn
          icon={<RotateCcw size={20} />}
          label="Flip"
          active={false}
          onClick={switchCamera}
        />
        <CtrlBtn
          icon={isScreenSharing ? <Smartphone size={20} /> : <Monitor size={20} />}
          label={isScreenSharing ? "Stop" : "Share"}
          active={isScreenSharing}
          onClick={toggleScreenShare}
        />
        <button onClick={handleLeave} style={styles.endBtn}>
          <PhoneOff size={24} color="#fff" />
        </button>
      </div>
    </div>
  );
};

const styles = {
  root: {
    height: "100vh",
    background: "#0A0E14",
    fontFamily: "Inter, -apple-system, sans-serif",
    overflow: "hidden",
    position: "relative",
  },
  errorPage: {
    height: "100vh",
    background: "#0A0E14",
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
  remoteVideo: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  preConnect: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  remoteAvatarImg: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(255,255,255,0.15)",
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 38,
    border: "3px solid rgba(255,255,255,0.15)",
  },
  calleeName: { color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 },
  statusRow: { display: "flex", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  statusText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  pip: {
    position: "absolute",
    width: 130,
    height: 190,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 10,
    cursor: "grab",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    border: "2px solid rgba(255,255,255,0.15)",
    background: "#1A1D24",
  },
  pipVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  pipFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statusOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 5,
    background: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: "6px 14px",
  },
  timerBadge: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
    background: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: "6px 14px",
  },
  timerText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500 },
  controls: {
    position: "absolute",
    bottom: 40,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: "12px 20px",
    borderRadius: 40,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  endBtn: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "#E53935",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(229,57,53,0.5)",
    marginLeft: 4,
  },
};

const CtrlBtn = ({ icon, label, active, onClick }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    <button onClick={onClick} style={{
      width: 46,
      height: 46,
      borderRadius: "50%",
      background: active ? "#E53935" : "rgba(255,255,255,0.12)",
      border: "1px solid rgba(255,255,255,0.08)",
      cursor: "pointer",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 0.15s",
    }}>
      {icon}
    </button>
    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{label}</span>
  </div>
);

export default VideoCallPage;
