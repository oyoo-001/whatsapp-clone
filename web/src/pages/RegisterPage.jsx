import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  Lock,
  ArrowLeft,
  Globe,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import { useToast } from "../components/Toast";
import { Colors } from "../styles/theme";

const COUNTRY_CODES = {
  KE: "+254",
  NG: "+234",
  ZA: "+27",
  TZ: "+255",
  UG: "+256",
  RW: "+250",
  GH: "+233",
  CM: "+237",
  US: "+1",
  GB: "+44",
  IN: "+91",
  PK: "+92",
  BD: "+880",
  PH: "+63",
  VN: "+84",
  TH: "+66",
  ID: "+62",
  MY: "+60",
  SG: "+65",
  AE: "+971",
  SA: "+966",
  EG: "+20",
  MA: "+212",
  DZ: "+213",
  FR: "+33",
  DE: "+49",
  IT: "+39",
  ES: "+34",
  PT: "+351",
  NL: "+31",
  BE: "+32",
  CH: "+41",
  SE: "+46",
  NO: "+47",
  DK: "+45",
  FI: "+358",
  PL: "+48",
  RO: "+40",
  GR: "+30",
  TR: "+90",
  RU: "+7",
  UA: "+380",
  BR: "+55",
  AR: "+54",
  MX: "+52",
  CO: "+57",
  CL: "+56",
  PE: "+51",
  CN: "+86",
  JP: "+81",
  KR: "+82",
  AU: "+61",
  NZ: "+64",
};

const RegisterPage = () => {
  const [form, setForm] = useState({
    username: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const { register, isLoading, isAuthenticated } = useAuthStore();
  const [alert, setAlert] = useState(null);
  const [countryCode, setCountryCode] = useState("+254");
  const [detecting, setDetecting] = useState(true);
  const [showCodePicker, setShowCodePicker] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        if (data.country_code && COUNTRY_CODES[data.country_code]) {
          setCountryCode(COUNTRY_CODES[data.country_code]);
        }
      } catch {}
      setDetecting(false);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (!form.username.trim()) {
      const m = "Username is required";
      setAlert({ type: "error", message: m });
      toast(m, "error");
      return;
    }
    const fullNumber = `${countryCode}${form.phoneNumber.replace(/\s/g, "")}`;
    if (!fullNumber || fullNumber === countryCode) {
      const m = "Phone number is required";
      setAlert({ type: "error", message: m });
      toast(m, "error");
      return;
    }
    if (!form.password) {
      const m = "Password is required";
      setAlert({ type: "error", message: m });
      toast(m, "error");
      return;
    }
    if (form.password !== form.confirmPassword) {
      const m = "Passwords do not match";
      setAlert({ type: "error", message: m });
      toast(m, "error");
      return;
    }
    if (form.password.length < 6) {
      const m = "Password must be at least 6 characters";
      setAlert({ type: "error", message: m });
      toast(m, "error");
      return;
    }
    try {
      await register({
        username: form.username,
        phoneNumber: fullNumber,
        password: form.password,
      });
      const m = "Account created! Welcome to TuChat.";
      setAlert({ type: "success", message: m });
      toast(m, "success", 3000);
      setTimeout(() => navigate("/", { replace: true }), 1200);
    } catch (err) {
      const msg = err.response?.data?.error;
      const m =
        msg?.toLowerCase().includes("unique") ||
        msg?.toLowerCase().includes("duplicate") ||
        msg?.toLowerCase().includes("already")
          ? msg || "This phone number or username is already taken"
          : msg || "Registration failed";
      setAlert({ type: "error", message: m });
      toast(m, "error");
    }
  };

  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const uniqueCodes = [...new Set(Object.values(COUNTRY_CODES))].sort();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(145deg, ${Colors.primary} 0%, #00695C 100%)`,
      }}
    >
      <div style={{ padding: "20px 16px 0", animation: "fadeIn 0.4s ease" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "rgba(255,255,255,0.16)",
            border: "none",
            borderRadius: 14,
            width: 40,
            height: 40,
            cursor: "pointer",
            color: Colors.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
            transition: "background 0.2s",
          }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>
      <div
        style={{ padding: "20px 24px 28px", animation: "fadeInUp 0.5s ease" }}
      >
        <h1
          style={{
            color: Colors.white,
            fontSize: 28,
            margin: "0 0 6px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
          }}
        >
          Create Account
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, margin: 0 }}>
          Join TuChat today
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: Colors.white,
          borderRadius: "32px 32px 0 0",
          padding: "32px 28px 48px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 -12px 40px rgba(0,0,0,0.1)",
          animation: "slideUp 0.5s ease 0.15s both",
        }}
      >
        {alert && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: alert.type === "error" ? "#FEF2F2" : "#E8F5E9",
              border:
                alert.type === "error"
                  ? "1px solid #FECACA"
                  : "1px solid #A5D6A7",
              borderRadius: 12,
              padding: "12px 14px",
              color: alert.type === "error" ? "#B91C1C" : "#2E7D32",
              fontSize: 13,
              fontWeight: 500,
              animation: "fadeIn 0.2s ease",
            }}
          >
            {alert.type === "error" ? (
              <AlertCircle
                size={18}
                color="#DC2626"
                style={{ flexShrink: 0 }}
              />
            ) : (
              <CheckCircle
                size={18}
                color="#2E7D32"
                style={{ flexShrink: 0 }}
              />
            )}
            <span>{alert.message}</span>
          </div>
        )}

        <div style={fieldGroup}>
          <label style={fieldLabel}>USERNAME</label>
          <div style={inputWrapper}>
            <User size={18} color="#94A3B8" style={iconStyle} />
            <input
              value={form.username}
              onChange={update("username")}
              placeholder="Your display name"
              style={inputField}
            />
          </div>
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>
            PHONE NUMBER{" "}
            {detecting && (
              <span
                style={{
                  fontSize: 10,
                  color: "#B0BEC5",
                  fontWeight: 400,
                  marginLeft: 4,
                }}
              >
                (detecting...)
              </span>
            )}
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowCodePicker(!showCodePicker)}
                style={{
                  height: 54,
                  background: "#F5F7FA",
                  border: "2px solid transparent",
                  borderRadius: 14,
                  padding: "0 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 15,
                  fontWeight: 600,
                  color: Colors.textPrimary,
                  minWidth: 88,
                  justifyContent: "center",
                }}
              >
                <Globe size={15} color={Colors.textHint} />
                {countryCode}
              </button>
              {showCodePicker && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: Colors.white,
                    borderRadius: 14,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                    maxHeight: 200,
                    overflowY: "auto",
                    marginBottom: 4,
                    padding: 4,
                    animation: "fadeInUp 0.15s ease",
                  }}
                >
                  {uniqueCodes.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setCountryCode(code);
                        setShowCodePicker(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 12px",
                        background: code === countryCode ? "#F0F2F5" : "none",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: code === countryCode ? 700 : 400,
                        cursor: "pointer",
                        color: Colors.textPrimary,
                        textAlign: "center",
                      }}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, position: "relative" }}>
              <Phone size={18} color="#94A3B8" style={iconStyle} />
              <input
                value={form.phoneNumber}
                onChange={update("phoneNumber")}
                placeholder="712345678"
                type="tel"
                style={{ ...inputField, paddingLeft: 48, height: 54 }}
              />
            </div>
          </div>
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>PASSWORD</label>
          <div style={inputWrapper}>
            <Lock size={18} color="#94A3B8" style={iconStyle} />
            <input
              value={form.password}
              onChange={update("password")}
              placeholder="At least 6 characters"
              type="password"
              style={inputField}
            />
          </div>
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>CONFIRM PASSWORD</label>
          <div style={inputWrapper}>
            <Lock size={18} color="#94A3B8" style={iconStyle} />
            <input
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              placeholder="Re-enter your password"
              type="password"
              style={inputField}
            />
          </div>
        </div>

        <button
          disabled={isLoading}
          style={{
            ...btnStyle,
            opacity: isLoading ? 0.85 : 1,
            marginTop: 6,
          }}
        >
          {isLoading ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span style={spinner} />
              Creating account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>

        <p style={linkText}>
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: Colors.primary,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
};

const fieldGroup = { marginBottom: 2 };

const fieldLabel = {
  fontSize: 11,
  color: Colors.textSecondary,
  fontWeight: 700,
  letterSpacing: "0.8px",
  marginBottom: 8,
  display: "block",
};

const inputWrapper = {
  position: "relative",
};

const iconStyle = {
  position: "absolute",
  left: 16,
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 1,
  pointerEvents: "none",
};

const inputField = {
  width: "100%",
  height: 54,
  background: "#F5F7FA",
  border: "2px solid transparent",
  borderRadius: 14,
  padding: "0 16px 0 48px",
  fontSize: 15,
  color: Colors.textPrimary,
  transition: "border-color 0.2s, background 0.2s",
  outline: "none",
  boxSizing: "border-box",
};

const spinner = {
  width: 20,
  height: 20,
  border: "2.5px solid rgba(255,255,255,0.3)",
  borderTopColor: Colors.white,
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
};

const btnStyle = {
  width: "100%",
  background: `linear-gradient(135deg, ${Colors.primary} 0%, ${Colors.secondary} 100%)`,
  color: Colors.white,
  border: "none",
  borderRadius: 14,
  padding: "18px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.5px",
};

const linkText = {
  textAlign: "center",
  color: Colors.textSecondary,
  fontSize: 14,
  margin: "8px 0 0",
};

export default RegisterPage;
