import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Lock, Palette, Moon, Sun,
  Smartphone, Download, X, Check, Bell
} from 'lucide-react';
import { Colors } from '../styles/theme';
import { useToast } from '../components/Toast';

const getTheme = () => localStorage.getItem('theme') || 'light';
const setThemeStore = (t) => {
  localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
};

const getChatPin = () => localStorage.getItem('chatPin');

const SettingsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [theme, setThemeState] = useState(getTheme());
  const [appLocked, setAppLocked] = useState(localStorage.getItem('appLock') === 'true');
  const [chatLocked, setChatLocked] = useState(!!getChatPin());
  const [notifications, setNotifications] = useState(localStorage.getItem('notifPopups') !== 'false');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pinModal, setPinModal] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinMode, setPinMode] = useState('set');

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      toast('App installed', 'success');
    }
  };

  const toggleNotifications = () => {
    const val = !notifications;
    setNotifications(val);
    localStorage.setItem('notifPopups', val);
    toast(val ? 'Notification popups enabled' : 'Notification popups disabled', 'info');
  };

  const toggleAppLock = () => {
    const val = !appLocked;
    setAppLocked(val);
    localStorage.setItem('appLock', val);
    toast(val ? 'App lock enabled' : 'App lock disabled', 'info');
  };

  const openPinSetup = () => {
    setPin('');
    setPinError('');
    setPinMode('set');
    setPinModal('chat');
  };

  const openPinRemove = () => {
    setPin('');
    setPinError('');
    setPinMode('remove');
    setPinModal('chat');
  };

  const handlePinSubmit = () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setPinError('Enter a 4-digit PIN');
      return;
    }
    if (pinMode === 'set') {
      localStorage.setItem('chatPin', pin);
      setChatLocked(true);
      setPinModal(null);
      toast('Chat lock PIN set', 'success');
    } else if (pinMode === 'remove') {
      const stored = getChatPin();
      if (pin === stored) {
        localStorage.removeItem('chatPin');
        localStorage.removeItem('lockedChats');
        setChatLocked(false);
        setPinModal(null);
        toast('Chat lock disabled', 'info');
      } else {
        setPinError('Wrong PIN');
      }
    }
  };

  const handleToggleChatLock = () => {
    if (chatLocked) {
      openPinRemove();
    } else {
      openPinSetup();
    }
  };

  const sectionTitle = (title) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, margin: '20px 16px 8px' }}>{title}</div>
  );

  const menuItem = (icon, label, desc, right, onClick) => (
    <button key={label} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
      padding: '14px 16px', background: 'none', border: 'none', borderBottom: '0.5px solid #F0F2F5',
      cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: Colors.primary }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: Colors.textPrimary }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>{desc}</div>}
      </div>
      {right}
    </button>
  );

  const renderPinModal = () => (
    <div onClick={() => setPinModal(null)} style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: Colors.white, borderRadius: 20, padding: 28, width: 300,
        animation: 'scaleIn 0.2s ease', textAlign: 'center',
      }}>
        <Lock size={32} color={Colors.primary} style={{ marginBottom: 12 }} />
        <h3 style={{ fontSize: 18, margin: '0 0 4px', color: Colors.textPrimary }}>
          {pinMode === 'set' ? 'Set Chat Lock PIN' : 'Enter PIN to Disable'}
        </h3>
        <p style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 16 }}>
          {pinMode === 'set' ? 'Create a 4-digit PIN to protect locked chats' : 'Enter your current PIN to turn off chat lock'}
        </p>
        <input type="password" inputMode="numeric" maxLength={4} autoFocus
          value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
          placeholder="• • • •"
          style={{
            width: '100%', padding: '14px', fontSize: 24, letterSpacing: 12, textAlign: 'center',
            border: pinError ? '2px solid #E53935' : '2px solid #E9EDEF', borderRadius: 12,
            outline: 'none', fontFamily: 'monospace',
          }} />
        {pinError && <p style={{ fontSize: 12, color: Colors.red, marginTop: 6 }}>{pinError}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={() => setPinModal(null)} style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none',
            background: '#F0F2F5', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.textPrimary,
          }}>Cancel</button>
          <button onClick={handlePinSubmit} style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none',
            background: Colors.primary, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: Colors.white,
          }}>{pinMode === 'set' ? 'Set PIN' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.white,
    }}>
      <header style={{
        background: Colors.primary, padding: '10px 12px', display: 'flex',
        alignItems: 'center', gap: 8, paddingTop: 20, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, cursor: 'pointer', color: Colors.white, padding: 8, display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ color: Colors.white, fontSize: 17, fontWeight: 600, margin: 0 }}>Settings</h1>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sectionTitle('Privacy')}

        {menuItem(<Lock size={18} />, 'Chat Lock', chatLocked ? 'PIN enabled' : 'Lock individual chats', <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div onClick={(e) => { e.stopPropagation(); handleToggleChatLock(); }} style={{
            width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: '0.2s',
            background: chatLocked ? Colors.secondary : '#D0D0D0',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: Colors.white, position: 'absolute', top: 2,
              left: chatLocked ? 22 : 2, transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>)}

        {menuItem(<Bell size={18} />, 'Notification Popups', notifications ? 'Show when in another conversation' : 'Hidden',
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={(e) => { e.stopPropagation(); toggleNotifications(); }} style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: '0.2s',
              background: notifications ? Colors.secondary : '#D0D0D0',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: Colors.white, position: 'absolute', top: 2,
                left: notifications ? 22 : 2, transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        )}

        {menuItem(<Smartphone size={18} />, 'App Lock', appLocked ? 'Device security enabled' : 'Lock app with device security',
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={(e) => { e.stopPropagation(); toggleAppLock(); }} style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: '0.2s',
              background: appLocked ? Colors.secondary : '#D0D0D0',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: Colors.white, position: 'absolute', top: 2,
                left: appLocked ? 22 : 2, transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        )}

        {installPrompt && sectionTitle('App')}

        {installPrompt && menuItem(<Download size={18} />, 'Install App', 'Add to home screen',
          <div style={{ fontSize: 13, color: Colors.primary, fontWeight: 500 }}>Install</div>,
          handleInstall
        )}

        {sectionTitle('Appearance')}

        {menuItem(<Palette size={18} />, 'Theme', theme === 'dark' ? 'Dark mode' : 'Light mode',
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); switchTheme('light'); }} style={{
              padding: '6px 10px', borderRadius: 8, border: theme === 'light' ? `2px solid ${Colors.primary}` : '1px solid #E0E0E0',
              background: theme === 'light' ? '#E8F5E9' : 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: Colors.textPrimary,
            }}>
              <Sun size={14} /> Light
            </button>
            <button onClick={(e) => { e.stopPropagation(); switchTheme('dark'); }} style={{
              padding: '6px 10px', borderRadius: 8, border: theme === 'dark' ? `2px solid ${Colors.primary}` : '1px solid #E0E0E0',
              background: theme === 'dark' ? '#E8F5E9' : 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: Colors.textPrimary,
            }}>
              <Moon size={14} /> Dark
            </button>
          </div>
        )}
      </div>

      {pinModal && renderPinModal()}
    </div>
  );
};

export default SettingsPage;
