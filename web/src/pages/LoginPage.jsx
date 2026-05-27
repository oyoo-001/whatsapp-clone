import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';
import { Colors } from '../styles/theme';

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => { if (isAuthenticated) navigate('/', { replace: true }); }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!phone.trim()) { const m = 'Phone number is required'; setError(m); toast(m, 'error'); return; }
    if (!password) { const m = 'Password is required'; setError(m); toast(m, 'error'); return; }
    try {
      await login(phone, password);
      setSuccess('Welcome back!');
      toast('Welcome back!', 'success');
      setTimeout(() => navigate('/', { replace: true }), 400);
    } catch (err) {
      const m = err.response?.data?.error || 'Invalid credentials';
      setError(m);
      toast(m, 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(145deg, ${Colors.primary} 0%, #00695C 100%)` }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 24px 0', animation: 'fadeInUp 0.6s ease' }}>
        <div style={{
          width: 88, height: 88, borderRadius: 28, background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28,
          backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <MessageCircle size={44} color={Colors.white} />
        </div>
        <h1 style={{ color: Colors.white, fontSize: 30, margin: '0 0 6px', fontWeight: 800, letterSpacing: '-0.5px' }}>WhatsApp Clone</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: 15, fontWeight: 400 }}>Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: Colors.white, borderRadius: '32px 32px 0 0', padding: '40px 28px 52px',
        display: 'flex', flexDirection: 'column', gap: 22, marginTop: 24,
        boxShadow: '0 -12px 40px rgba(0,0,0,0.1)',
        animation: 'slideUp 0.5s ease 0.15s both',
      }}>
        {success && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#E8F5E9', border: '1px solid #A5D6A7',
            borderRadius: 12, padding: '12px 14px', color: '#2E7D32', fontSize: 13,
            fontWeight: 500, animation: 'fadeIn 0.2s ease',
          }}>
            <CheckCircle size={18} color="#2E7D32" style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 12, padding: '12px 14px', color: '#B91C1C', fontSize: 13,
            fontWeight: 500, animation: 'fadeIn 0.2s ease',
          }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 700, marginBottom: 8, display: 'block', letterSpacing: '0.8px' }}>PHONE NUMBER</label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} color={Colors.textHint} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }} />
            <input autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678"
              style={{ ...inputStyle, paddingLeft: 48, height: 54 }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 700, marginBottom: 8, display: 'block', letterSpacing: '0.8px' }}>PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
              type={showPw ? 'text' : 'password'} placeholder="Enter your password"
              style={{ ...inputStyle, paddingRight: 48, paddingLeft: 16, height: 54 }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer', color: Colors.textHint, padding: 6, display: 'flex',
              borderRadius: 8, transition: 'background 0.15s',
            }} tabIndex={-1}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button disabled={isLoading} style={{
          ...btnStyle, opacity: isLoading ? 0.85 : 1, marginTop: 4,
        }}>
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{
                width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)',
                borderTopColor: Colors.white, borderRadius: '50%', animation: 'spin 0.7s linear infinite',
              }} />
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>

        <p style={{ textAlign: 'center', color: Colors.textSecondary, fontSize: 14, margin: '8px 0 0' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: Colors.primary, fontWeight: 700, textDecoration: 'none' }}>Create one</Link>
        </p>
      </form>
    </div>
  );
};

const inputStyle = {
  width: '100%', height: 54, background: '#F5F7FA', border: '2px solid transparent',
  borderRadius: 14, padding: '0 16px', fontSize: 15, color: Colors.textPrimary,
  transition: 'border-color 0.2s, background 0.2s', outline: 'none', boxSizing: 'border-box',
};

const btnStyle = {
  width: '100%', background: `linear-gradient(135deg, ${Colors.primary} 0%, ${Colors.secondary} 100%)`,
  color: Colors.white, border: 'none', borderRadius: 14, padding: '18px', fontSize: 16,
  fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px',
};

export default LoginPage;