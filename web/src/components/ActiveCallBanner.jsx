import { useLocation, useNavigate } from "react-router-dom";
import { Phone, PhoneOff } from "lucide-react";
import webrtcService from "../services/webrtc";
import socketService from "../services/socket";
import useCallStore from "../stores/callStore";
import { Colors } from "../styles/theme";

const CALL_ROUTES = ["/call/", "/voice-call/", "/video-call/", "/group-call/"];

const ActiveCallBanner = () => {
  const { activeCall, clearActiveCall } = useCallStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isOnCallPage = CALL_ROUTES.some((route) => location.pathname.startsWith(route));
  if (!activeCall || isOnCallPage) return null;

  const handleReturn = () => {
    navigate(activeCall.returnPath);
  };

  const handleEndCall = () => {
    if (activeCall.remoteUserId) {
      socketService.emit("call:end", { to: activeCall.remoteUserId });
    }
    if (activeCall.callLogId) {
      try {
        fetch(`/api/calls/${activeCall.callLogId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ended" }),
        });
      } catch {}
    }
    webrtcService.cleanup();
    clearActiveCall();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: Colors.green,
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      animation: "slideDown 0.25s ease",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: "#fff", animation: "pulse 1.5s ease infinite",
        }} />
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
          Active Call
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleReturn} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.2)", border: "none",
          borderRadius: 8, padding: "6px 14px", color: "#fff",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}>
          <Phone size={14} />
          Return
        </button>
        <button onClick={handleEndCall} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#E53935", border: "none",
          borderRadius: 8, padding: "6px 14px", color: "#fff",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}>
          <PhoneOff size={14} />
          End
        </button>
      </div>
    </div>
  );
};

export default ActiveCallBanner;
