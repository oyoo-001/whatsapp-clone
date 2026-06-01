import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { ToastProvider } from './components/Toast';
import useAuthStore from './stores/authStore';
import useChatStore from './stores/chatStore';
import socketService from './services/socket';
import { systemAPI } from './services/api';
import ForceUpdateModal from './components/ForceUpdateModal';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatListPage from './pages/ChatListPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import ContactListPage from './pages/ContactListPage';
import CallPage from './pages/CallPage';
import GroupCallPage from './pages/GroupCallPage';
import CallLogsPage from './pages/CallLogsPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import GroupChatPage from './pages/GroupChatPage';
import ChannelPage from './pages/ChannelPage';
import AdminPage from './pages/AdminPage';
import SupportChatPage from './pages/SupportChatPage';
import InvitePage from './pages/InvitePage';
import InvitePreviewModal from './components/InvitePreviewModal';
import BannedSupportPage from './pages/BannedSupportPage';
import LoadingPage from './pages/LoadingPage';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

const App = () => {
  const { initialLoading, loadUser } = useAuthStore();
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // 1. Get current version (Native or Web)
        let currentVersion = '1.0.0';
        try {
          const info = await CapApp.getInfo();
          currentVersion = info.version;
        } catch (e) {
          // Fallback if not running on native
        }

        // 2. Fetch required version from backend
        const response = await systemAPI.checkVersion();
        const { minVersion, downloadUrl } = response.data;

        // 3. Compare (simple version comparison)
        if (minVersion && isUpdateRequired(currentVersion, minVersion)) {
          setUpdateRequired(true);
          setUpdateUrl(downloadUrl);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    checkVersion();

    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    loadUser();
  }, []);

  // Helper to compare semver versions
  const isUpdateRequired = (current, min) => {
    const currParts = current.split('.').map(Number);
    const minParts = min.split('.').map(Number);
    for (let i = 0; i < Math.max(currParts.length, minParts.length); i++) {
      const curr = currParts[i] || 0;
      const m = minParts[i] || 0;
      if (curr < m) return true;
      if (curr > m) return false;
    }
    return false;
  };

  useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) return;

    const u1 = socketService.on('chat:delivered', () => {
      useChatStore.getState().fetchConversations(true);
    });
    const u2 = socketService.on('chat:read', () => {
      useChatStore.getState().fetchConversations(true);
    });
    const u3 = socketService.on('conversation:update', () => {
      useChatStore.getState().fetchConversations(true);
    });

    return () => { u1(); u2(); u3(); };
  }, [useAuthStore.getState().isAuthenticated]);

  if (initialLoading) return <LoadingPage />;

  return (
    <ToastProvider>
      {updateRequired && <ForceUpdateModal updateUrl={updateUrl} />}
      <BrowserRouter>
        <InvitePreviewModal />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/channel/invite/:code" element={<InvitePage />} />
          <Route path="/group/invite/:code" element={<InvitePage />} />
          <Route path="/" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
          <Route path="/chat/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><ContactListPage /></ProtectedRoute>} />
          <Route path="/call-logs" element={<ProtectedRoute><CallLogsPage /></ProtectedRoute>} />
          <Route path="/call/:channelName" element={<ProtectedRoute><CallPage /></ProtectedRoute>} />
          <Route path="/group-call/:channelName" element={<ProtectedRoute><GroupCallPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
          <Route path="/group-chat/:groupId" element={<ProtectedRoute><GroupChatPage /></ProtectedRoute>} />
          <Route path="/channels/:channelId" element={<ProtectedRoute><ChannelPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/support-chat" element={<ProtectedRoute><SupportChatPage /></ProtectedRoute>} />
          <Route path="/banned-support" element={<BannedSupportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
