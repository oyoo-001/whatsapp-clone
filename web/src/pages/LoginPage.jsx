import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  ExternalLink,
  X,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import { useToast } from "../components/Toast";
import { Colors } from "../styles/theme";

const LoginPage = () => {
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+254");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [banModal, setBanModal] = useState(null);
  const { login, isLoading, isAuthenticated } = useAuthStore();

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const toast = useToast();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBanModal(null);
    const localNum = phone.trim().replace(/^0+/, "");
    if (!localNum) {
      const m = "Phone number is required";
      setError(m);
      toast(m, "error");
      return;
    }
    const fullPhone = countryCode + localNum;
    if (!password) {
      const m = "Password is required";
      setError(m);
      toast(m, "error");
      return;
    }
    try {
      await login(fullPhone, password);
      setSuccess("Welcome back!");
      toast("Welcome back!", "success");
      setTimeout(() => navigate(redirect, { replace: true }), 400);
    } catch (err) {
      const data = err.response?.data;
      const m = data?.error || "Invalid credentials";
      if (data?.isBanned) {
        setBanModal({ message: m });
        return;
      }
      setError(m);
      toast(m, "error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(145deg, ${Colors.primary} 0%, #00695C 100%)`,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 24px 0",
          animation: "fadeInUp 0.6s ease",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          <MessageCircle size={44} color={Colors.white} />
        </div>
        <h1
          style={{
            color: Colors.white,
            fontSize: 30,
            margin: "0 0 6px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
          }}
        >
          TuChat
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.75)",
            margin: 0,
            fontSize: 15,
            fontWeight: 400,
          }}
        >
          Sign in to your account
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: Colors.white,
          borderRadius: "32px 32px 0 0",
          padding: "40px 28px 52px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          marginTop: 24,
          boxShadow: "0 -12px 40px rgba(0,0,0,0.1)",
          animation: "slideUp 0.5s ease 0.15s both",
        }}
      >
        {success && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#E8F5E9",
              border: "1px solid #A5D6A7",
              borderRadius: 12,
              padding: "12px 14px",
              color: "#2E7D32",
              fontSize: 13,
              fontWeight: 500,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <CheckCircle size={18} color="#2E7D32" style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 12,
              padding: "12px 14px",
              color: "#B91C1C",
              fontSize: 13,
              fontWeight: 500,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            style={{
              fontSize: 11,
              color: Colors.textSecondary,
              fontWeight: 700,
              marginBottom: 8,
              display: "block",
              letterSpacing: "0.8px",
            }}
          >
            PHONE NUMBER
          </label>
          <div style={{ position: "relative", display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                style={{
                  height: 54,
                  padding: "0 14px",
                  background: "#F5F7FA",
                  border: "2px solid transparent",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  color: Colors.textPrimary,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <span>{countryCode}</span>
                <span style={{ fontSize: 10, color: Colors.textHint }}>▼</span>
              </button>
              {showCountryDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: 58,
                    left: 0,
                    zIndex: 100,
                    background: Colors.white,
                    borderRadius: 14,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                    maxHeight: 240,
                    overflowY: "auto",
                    minWidth: 180,
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
                        gap: 10,
                        width: "100%",
                        padding: "10px 12px",
                        background: countryCode === cc.code ? "#E8F5E9" : "transparent",
                        border: "none",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 14,
                        color: Colors.textPrimary,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F0F2F5"}
                      onMouseLeave={(e) => e.currentTarget.style.background = countryCode === cc.code ? "#E8F5E9" : "transparent"}
                    >
                      <span style={{ fontWeight: 600, minWidth: 50 }}>{cc.code}</span>
                      <span style={{ color: Colors.textSecondary }}>{cc.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative", flex: 1 }}>
              <Phone
                size={18}
                color={Colors.textHint}
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
              <input
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="712345678"
                style={{ ...inputStyle, paddingLeft: 48, height: 54 }}
              />
            </div>
          </div>
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              color: Colors.textSecondary,
              fontWeight: 700,
              marginBottom: 8,
              display: "block",
              letterSpacing: "0.8px",
            }}
          >
            PASSWORD
          </label>
          <div style={{ position: "relative" }}>
            <input
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              style={{
                ...inputStyle,
                paddingRight: 48,
                paddingLeft: 16,
                height: 54,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: Colors.textHint,
                padding: 6,
                display: "flex",
                borderRadius: 8,
                transition: "background 0.15s",
              }}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          disabled={isLoading}
          style={{
            ...btnStyle,
            opacity: isLoading ? 0.85 : 1,
            marginTop: 4,
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
              <span
                style={{
                  width: 20,
                  height: 20,
                  border: "2.5px solid rgba(255,255,255,0.3)",
                  borderTopColor: Colors.white,
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        <p
          style={{
            textAlign: "center",
            color: Colors.textSecondary,
            fontSize: 14,
            margin: "8px 0 0",
          }}
        >
          Don't have an account?{" "}
          <Link
            to={`/register${redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            style={{
              color: Colors.primary,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Create one
          </Link>
        </p>
      </form>

      {banModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 24,
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setBanModal(null)}
        >
          <div
            style={{
              background: Colors.white,
              borderRadius: 24,
              padding: "32px 28px",
              maxWidth: 380,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              animation: "slideUp 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#FEF2F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <ShieldAlert size={32} color="#DC2626" />
            </div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: Colors.textPrimary,
                margin: "0 0 10px",
              }}
            >
              Account Deactivated
            </h2>
            <p
              style={{
                fontSize: 14,
                color: Colors.textSecondary,
                lineHeight: "1.5",
                margin: "0 0 24px",
              }}
            >
              {banModal.message}
            </p>
            <button
              onClick={() => { setBanModal(null); navigate("/banned-support"); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: Colors.primary,
                color: Colors.white,
                padding: "14px 28px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              <ExternalLink size={18} />
              Contact Support
            </button>
            <br />
            <button
              onClick={() => setBanModal(null)}
              style={{
                background: "transparent",
                border: "none",
                color: Colors.textSecondary,
                fontSize: 13,
                cursor: "pointer",
                padding: "8px 16px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: "100%",
  height: 54,
  background: "#F5F7FA",
  border: "2px solid transparent",
  borderRadius: 14,
  padding: "0 16px",
  fontSize: 15,
  color: Colors.textPrimary,
  transition: "border-color 0.2s, background 0.2s",
  outline: "none",
  boxSizing: "border-box",
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

export default LoginPage;
