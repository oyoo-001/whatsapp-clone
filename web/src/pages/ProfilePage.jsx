import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Info,
  Camera,
  LogOut,
  Edit3,
  Check,
  X,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import { uploadAPI } from "../services/api";
import AlertDialog from "../components/AlertDialog";
import { useToast } from "../components/Toast";
import { Colors } from "../styles/theme";

const ProfilePage = () => {
  const { user, logout, updateProfile } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [showLogout, setShowLogout] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: user?.username || "",
    status: user?.status || "",
  });
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSave = async () => {
    try {
      await updateProfile(form);
      setEditing(false);
      toast("Profile updated", "success");
    } catch {
      toast("Failed to update profile", "error");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await uploadAPI.upload(file);
      await updateProfile({ avatar: data.fileUrl });
      toast("Profile picture updated", "success");
    } catch {
      toast("Failed to update picture", "error");
    }
    setUploading(false);
    if (e.target) e.target.value = "";
  };

  const hue = user?.id ? (user.id * 60) % 360 : 180;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0F2F5",
        maxWidth: 480,
        margin: "0 auto",
        borderLeft: "0.5px solid #E9EDEF",
        borderRight: "0.5px solid #E9EDEF",
      }}
    >
      <header
        style={{
          background: Colors.primary,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingTop: 20,
        }}
      >
        <button onClick={() => navigate("/")} style={headerBtn}>
          <ArrowLeft size={20} />
        </button>
        <h2
          style={{
            color: Colors.white,
            fontSize: 18,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Profile
        </h2>
      </header>

      <div
        style={{
          textAlign: "center",
          padding: "32px 20px 24px",
          background: Colors.white,
          marginBottom: 10,
          animation: "fadeInUp 0.3s ease",
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: user?.avatar ? "none" : `hsl(${hue}, 45%, 45%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: Colors.white,
            fontSize: 36,
            fontWeight: 700,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            user?.username?.charAt(0).toUpperCase() || "?"
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploading}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: uploading ? "#999" : Colors.secondary,
              border: "3px solid white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={16} color={Colors.white} />
          </button>
        </div>

        {editing ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "center",
              animation: "fadeIn 0.2s",
            }}
          >
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Username"
              style={editInput}
            />
            <input
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              placeholder="Status"
              style={editInput}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setEditing(false)}
                style={{
                  background: "#E9EDEF",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  background: Colors.primary,
                  color: Colors.white,
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Check size={16} /> Save
              </button>
            </div>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.2s" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              {user?.username || "User"}
            </h3>
            <p
              style={{
                color: Colors.textSecondary,
                margin: "4px 0 0",
                fontSize: 14,
                maxWidth: 280,
                marginX: "auto",
              }}
            >
              {user?.status || "Hey there! I am using TuChat"}
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          background: Colors.white,
          marginBottom: 10,
          borderRadius: 0,
          animation: "fadeInUp 0.3s ease 0.05s both",
        }}
      >
        <InfoRow
          icon={Phone}
          label="Phone"
          value={user?.phoneNumber || "Not set"}
        />
        <div style={{ height: 0.5, background: "#F0F2F5", marginLeft: 56 }} />
        <InfoRow
          icon={User}
          label="Username"
          value={user?.username || "Not set"}
        />
        <div style={{ height: 0.5, background: "#F0F2F5", marginLeft: 56 }} />
        <InfoRow
          icon={Info}
          label="About"
          value={user?.status || "Hey there! I am using TuChat"}
        />
      </div>

      <div
        style={{ padding: "0 16px", animation: "fadeInUp 0.3s ease 0.1s both" }}
      >
        <button
          onClick={() => setShowLogout(true)}
          style={{
            width: "100%",
            background: Colors.white,
            border: "none",
            borderRadius: 14,
            padding: "16px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            color: Colors.red,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.2s",
          }}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      <AlertDialog
        open={showLogout}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 20px",
    }}
  >
    <div
      style={{
        width: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={20} color={Colors.primary} />
    </div>
    <div>
      <div
        style={{
          fontSize: 11,
          color: Colors.textSecondary,
          textTransform: "uppercase",
          fontWeight: 700,
          letterSpacing: "0.3px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, marginTop: 2, color: Colors.textPrimary }}>
        {value}
      </div>
    </div>
  </div>
);

const headerBtn = {
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  color: Colors.white,
  padding: 8,
  display: "flex",
};

const editInput = {
  width: "80%",
  padding: "12px 14px",
  border: "2px solid #E9EDEF",
  borderRadius: 12,
  fontSize: 15,
  textAlign: "center",
  color: Colors.textPrimary,
  transition: "border-color 0.2s",
};

export default ProfilePage;
