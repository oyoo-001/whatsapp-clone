import { Colors } from '../styles/theme';

const LoadingPage = () => (
  <div style={{
    height: '100vh', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    background: Colors.primary, color: Colors.white, gap: 20,
  }}>
    <div style={{
      width: 48, height: 48, border: '3px solid rgba(255,255,255,0.2)',
      borderTopColor: Colors.white, borderRadius: '50%',
      animation: 'pulse 1s linear infinite',
    }} />
    <p style={{ fontSize: 15, opacity: 0.8 }}>WhatsApp Clone</p>
  </div>
);

export default LoadingPage;
