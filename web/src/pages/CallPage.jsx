import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Smartphone,
} from "lucide-react";
import webrtcService from "../services/webrtc";
import socketService from "../services/socket";
import useAuthStore from "../stores/authStore";
import { callsAPI } from "../services/api";
import { Colors } from "../styles/theme";
import { useWebRTCSignaling } from "../services/useWebRTC";

const CallPage = () => {
  const { channelName } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const callType = state?.callType || "video";
  const isAudioOnly = callType === "voice";
  const meetingName = state?.name || "Call";
  const isCaller = state?.caller !== false;
  const remoteUserId = state?.remoteUserId || null;
  const startedAt = state?.startedAt || Date.now();
  const remoteAvatar = state?.remoteAvatar || null;

  const [callState, setCallState] = useState(
    isCaller ? "calling" : "connecting",
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
  const [remoteStream, setRemoteStream] = useState(null);
  const [duration, setDuration] = useState(
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
  );
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);

  const localRef = useRef(null);
  const timerRef = useRef(null);
  const leftRef = useRef(false);
  const callLogIdRef = useRef(state?.callLogId || null);
  const startedAtRef = useRef(startedAt);
  const remoteUserIdRef = useRef(remoteUserId);

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
        await webrtcService.startLocalStream(isAudioOnly);
        if (cancelled) return;
        if (localRef.current && webrtcService.localStream) {
          localRef.current.srcObject = webrtcService.localStream;
          localRef.current.muted = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            "Could not access camera/microphone. Please ensure you have granted permission in your device settings.",
          );
        }
      }
    };
    init();
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAudioOnly]);

  const handleLeave = async () => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (callLogIdRef.current && callState === "connected") {
      try {
        await callsAPI.updateCallStatus(callLogIdRef.current, "ended");
      } catch {}
    }
    if (remoteUserIdRef.current) {
      socketService.emit("call:end", { to: remoteUserIdRef.current });
    }
    webrtcService.cleanup();
    navigate(-1);
  };

  const toggleMute = () => {
    const next = !isMuted;
    webrtcService.toggleMic(!next);
    setIsMuted(next);
  };

  const toggleVideo = () => {
    if (isAudioOnly) return;
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
    } catch {
      setIsScreenSharing(false);
    }
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const avatarGradient = (id) =>
    `linear-gradient(135deg, hsl(${((id || 0) * 60) % 360}, 45%, 45%), hsl(${((id || 0) * 60 + 30) % 360}, 50%, 35%))`;

  const statusText =
    callState === "calling"
      ? "Calling..."
      : callState === "connecting"
        ? "Connecting..."
        : callState === "connected"
          ? fmt(duration)
          : "Connecting...";

  if (error) {
    return (
      <div style={s.errorPage}>
        <div style={{ fontSize: 40, color: "#E53935" }}>!</div>
        <h2 style={{ color: "#fff", margin: 0, fontSize: 18, fontWeight: 500 }}>
          Call failed
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            fontSize: 14,
            margin: 0,
          }}
        >
          {error}
        </p>
        <button onClick={() => navigate(-1)} style={s.goBackBtn}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <div style={s.videoArea}>
        {callState !== "connected" && (
          <div style={s.preConnectOverlay}>
            {remoteAvatar ? (
              <img src={remoteAvatar} alt="" style={s.remoteAvatarImg} />
            ) : (
              <div
                style={{
                  ...s.avatarCircle,
                  background: avatarGradient(remoteUserId),
                  fontSize: 36,
                }}
              >
                {(meetingName || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <p style={s.calleeName}>{meetingName}</p>
          </div>
        )}

        <header style={s.header}>
          <div style={s.statusRow}>
            <span
              style={{
                ...s.statusDot,
                background: callState === "connected" ? "#00C853" : "#FFC107",
              }}
            />
            <span style={s.statusText}>{statusText}</span>
          </div>
        </header>

        <div
          style={{
            ...s.grid,
            gridTemplateColumns: remoteStream ? "1fr 1fr" : "1fr",
          }}
        >
          <div style={s.videoCell}>
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              style={{
                ...s.video,
                transform: isAudioOnly ? "none" : "scaleX(-1)",
              }}
            />
            {(isAudioOnly || isVideoOff) && (
              <div style={s.videoOverlay}>
                <div
                  style={{
                    ...s.avatarCircle,
                    background: avatarGradient(currentUser?.id),
                    fontSize: 28,
                    width: 64,
                    height: 64,
                  }}
                >
                  {currentUser?.username?.charAt(0).toUpperCase() || "?"}
                </div>
              </div>
            )}
            <span style={s.nameTag}>You</span>
          </div>

          {remoteStream && (
            <div style={s.videoCell}>
              <video
                ref={(el) => {
                  if (el && remoteStream) el.srcObject = remoteStream;
                }}
                autoPlay
                playsInline
                style={s.video}
              />
              <span style={s.nameTag}>{meetingName}</span>
            </div>
          )}
        </div>
      </div>

      <div style={s.controls}>
        <CtrlBtn
          icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          label={isMuted ? "Unmute" : "Mute"}
          active={isMuted}
          onClick={toggleMute}
        />
        {!isAudioOnly && (
          <CtrlBtn
            icon={isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            label={isVideoOff ? "Cam on" : "Cam off"}
            active={isVideoOff}
            onClick={toggleVideo}
          />
        )}
        <CtrlBtn
          icon={
            isScreenSharing ? <Smartphone size={20} /> : <Monitor size={20} />
          }
          label={isScreenSharing ? "Stop" : "Share"}
          active={isScreenSharing}
          onClick={toggleScreenShare}
        />
        <button onClick={handleLeave} style={s.endBtn} aria-label="End call">
          <PhoneOff size={22} color="#fff" />
        </button>
      </div>
    </div>
  );
};

const s = {
  root: {
    height: "100vh",
    background: "#0A0E14",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Inter, -apple-system, sans-serif",
    overflow: "hidden",
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
  goBackBtn: {
    marginTop: 8,
    padding: "10px 32px",
    borderRadius: 24,
    border: "none",
    background: "#00C853",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  videoArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  preConnectOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  remoteAvatarImg: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(255,255,255,0.15)",
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
  },
  calleeName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    margin: 0,
    fontWeight: 400,
  },
  header: {
    padding: "16px 20px",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    padding: "5px 12px",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: 400,
  },
  grid: {
    flex: 1,
    padding: "0 12px 12px",
    display: "grid",
    gap: 10,
    alignContent: "center",
  },
  videoCell: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: "4/3",
    background: "#141820",
    minHeight: 180,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  videoOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#141820",
  },
  nameTag: {
    position: "absolute",
    bottom: 10,
    left: 10,
    background: "rgba(0,0,0,0.5)",
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(4px)",
  },
  controls: {
    padding: "18px 24px 44px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
  },
  endBtn: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#E53935",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(229,57,53,0.45)",
  },
};

const CtrlBtn = ({ icon, label, active, onClick }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5,
    }}
  >
    <button
      onClick={onClick}
      style={{
        width: 50,
        height: 50,
        borderRadius: "50%",
        background: active ? "rgba(229,57,53,0.85)" : "rgba(255,255,255,0.1)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(8px)",
        transition: "background 0.15s ease",
      }}
    >
      {icon}
    </button>
    <span
      style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 400 }}
    >
      {label}
    </span>
  </div>
);

export default CallPage;
