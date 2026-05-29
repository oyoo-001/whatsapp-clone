import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import useAuthStore from './stores/authStore';
import useChatStore from './stores/chatStore';
import socketService from './services/socket';
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
import AdminPage from './pages/AdminPage';
import SupportChatPage from './pages/SupportChatPage';
import LoadingPage from './pages/LoadingPage';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

const App = () => {
  const { initialLoading, loadUser } = useAuthStore();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    loadUser();
  }, []);

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
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/support-chat" element={<ProtectedRoute><SupportChatPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
