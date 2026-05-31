import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, MessageSquare, Group, BarChart3,
  Ban, Shield, Send, Search, X, BadgeCheck, Trash2, RefreshCw, Clock, CheckCircle2, MessageCircle,
  FileText, Image, Music, Eye, Radio, Check, UserPlus, Activity,
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { adminAPI, uploadAPI } from '../services/api';
import socketService from '../services/socket';
import { Colors } from '../styles/theme';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'channels', label: 'Channels', icon: Radio },
  { key: 'broadcast', label: 'Broadcast', icon: Send },
  { key: 'support', label: 'Support', icon: MessageSquare },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bcContent, setBcContent] = useState('');
  const [bcSending, setBcSending] = useState(false);
  const [bcStatus, setBcStatus] = useState('');
  const [bcFile, setBcFile] = useState(null);
  const [bcFileUrl, setBcFileUrl] = useState('');
  const [bcFileType, setBcFileType] = useState('text');
  const [bcFileName, setBcFileName] = useState('');
  const [bcUploading, setBcUploading] = useState(false);
  const [showBcPreview, setShowBcPreview] = useState(false);
  const bcFileInputRef = useRef(null);
  const bcImageInputRef = useRef(null);
  const bcAudioInputRef = useRef(null);
  const bcDocInputRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [supportQueue, setSupportQueue] = useState([]);
  const [supportHistory, setSupportHistory] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketInput, setTicketInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.isAdmin) { navigate('/'); return; }
    fetchStats();
    fetchUsers();
    fetchChannels();
    fetchBroadcasts();
    fetchSupportQueue();
    fetchSupportHistory();

    const unsubQueue = socketService.on('admin:support-queue-update', () => {
      fetchSupportQueue();
    });

    const unsubMsg = socketService.on('support:new-message', ({ ticketId, message }) => {
      setTicketMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => { unsubQueue(); unsubMsg(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketMessages]);

  const fetchStats = async () => {
    try { const { data } = await adminAPI.getStats(); setStats(data); } catch {}
  };

  const fetchUsers = async () => {
    try { const { data } = await adminAPI.listUsers(); setUsers(data.users || []); } catch {}
  };

  const fetchBroadcasts = async () => {
    try { const { data } = await adminAPI.getBroadcasts(); setBroadcasts(data.broadcasts || []); } catch {}
  };

  const fetchChannels = async () => {
    setChannelsLoading(true);
    try { const { data } = await adminAPI.listChannels(); setChannels(data.channels || []); } catch {}
    setChannelsLoading(false);
  };

  const fetchSupportQueue = async () => {
    try { const { data } = await adminAPI.getSupportQueue(); setSupportQueue(data.tickets || []); } catch {}
  };

  const fetchSupportHistory = async () => {
    try { const { data } = await adminAPI.getSupportHistory(); setSupportHistory(data.tickets || []); } catch {}
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchChannels(), fetchBroadcasts(), fetchSupportQueue(), fetchSupportHistory()]);
    setRefreshing(false);
  };

  const handleBan = async (userId) => {
    try {
      await adminAPI.banUser(userId);
      fetchUsers();
    } catch {}
  };

  const handleMakeAdmin = async (userId) => {
    try {
      await adminAPI.makeAdmin(userId);
      fetchUsers();
    } catch {}
  };

  const handleVerifyUser = async (userId) => {
    try {
      await adminAPI.verifyUser(userId);
      fetchUsers();
    } catch {}
  };

  const handleDeleteBroadcast = async (id) => {
    if (!window.confirm('Delete this broadcast? It will be removed for all users.')) return;
    try {
      await adminAPI.deleteBroadcast(id);
      fetchBroadcasts();
    } catch {}
  };

  const handleBroadcast = async () => {
    if (!bcContent.trim() && !bcFileUrl) return;
    setBcSending(true);
    setBcStatus('');
    try {
      const payload = { content: bcContent.trim() || null, messageType: bcFileType };
      if (bcFileUrl) {
        payload.fileUrl = bcFileUrl;
        payload.fileSize = bcFile?.size || null;
        payload.mimeType = bcFile?.type || null;
      }
      await adminAPI.broadcast(payload);
      setBcStatus('Broadcast sent');
      setBcContent('');
      setBcFile(null);
      setBcFileUrl('');
      setBcFileType('text');
      setBcFileName('');
      setShowBcPreview(false);
      fetchBroadcasts();
    } catch (e) {
      setBcStatus('Failed to send');
    }
    setBcSending(false);
  };

  const handleBcFileSelect = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBcUploading(true);
    setBcFile(file);
    setBcFileName(file.name);
    try {
      const { data } = await uploadAPI.upload(file);
      setBcFileUrl(data.url);
      setBcFileType(type);
    } catch {
      setBcStatus('Upload failed');
      setBcFile(null);
      setBcFileName('');
    }
    setBcUploading(false);
    e.target.value = '';
  };

  const clearBcFile = () => {
    setBcFile(null);
    setBcFileUrl('');
    setBcFileType('text');
    setBcFileName('');
  };

  const openSupportChat = async (u) => {
    setSelectedUser(u);
    try {
      const { data } = await adminAPI.getMessages(u.id);
      setChatMessages(data.messages || []);
    } catch {}
  };

  const sendSupportMessage = async () => {
    if (!chatInput.trim() || !selectedUser) return;
    try {
      const { data } = await adminAPI.sendMessage({ userId: selectedUser.id, content: chatInput.trim() });
      setChatMessages((prev) => [...prev, data.message]);
      setChatInput('');
    } catch {}
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      const { data } = await adminAPI.getSupportTicketMessages(ticket.id);
      setTicketMessages(data.messages || []);
    } catch {}
  };

  const closeTicket = () => {
    setSelectedTicket(null);
    setTicketMessages([]);
    fetchSupportQueue();
    fetchSupportHistory();
  };

  const handleClaimTicket = async (ticketId) => {
    try {
      await adminAPI.claimTicket(ticketId);
      fetchSupportQueue();
    } catch {}
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      await adminAPI.resolveTicket(ticketId);
      closeTicket();
    } catch {}
  };

  const handleTicketSend = async () => {
    if (!ticketInput.trim() || !selectedTicket) return;
    try {
      const { data } = await adminAPI.sendSupportMessage({ ticketId: selectedTicket.id, content: ticketInput.trim() });
      setTicketMessages((prev) => [...prev, data.message]);
      setTicketInput('');
    } catch {}
  };

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phoneNumber?.includes(searchQuery)
  );

  if (!currentUser?.isAdmin) return null;

  const BarChart = ({ data, height = 120 }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    const barW = Math.max(20, Math.min(40, (280 / data.length) - 4));
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${data.length * (barW + 4)} ${height}`} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const barH = (d.value / max) * (height - 24);
          return (
            <g key={i}>
              <rect x={i * (barW + 4) + 2} y={height - 16 - barH} width={barW} height={barH} rx={4} fill={d.color} opacity={0.85} />
              <text x={i * (barW + 4) + 2 + barW / 2} y={height - 4} textAnchor="middle" fontSize={9} fill="#666">{d.label}</text>
              <text x={i * (barW + 4) + 2 + barW / 2} y={height - 18 - barH} textAnchor="middle" fontSize={10} fontWeight={600} fill="#333">{d.value}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const MiniDonut = ({ value, total, color, size = 60 }) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const r = 12;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
      <svg width={size} height={size} viewBox="0 0 30 30">
        <circle cx="15" cy="15" r={r} fill="none" stroke="#EEEEEE" strokeWidth="4" />
        <circle cx="15" cy="15" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`} transform="rotate(-90 15 15)" strokeLinecap="round" />
        <text x="15" y="15" textAnchor="middle" dominantBaseline="central" fontSize={7} fontWeight={700} fill="#333">{Math.round(pct)}%</text>
      </svg>
    );
  };

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textSecondary, marginBottom: 10, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  );

  const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => (
    <div style={{ background: '#F8F9FA', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, border: `1px solid ${color}15` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: Colors.textPrimary, lineHeight: 1.2 }}>{value}</div>
          <div style={{ fontSize: 11, color: Colors.textSecondary }}>{label}</div>
        </div>
      </div>
      {subtitle && <div style={{ fontSize: 10, color: Colors.textHint }}>{subtitle}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 10, color: trend >= 0 ? '#25D366' : '#E53935', fontWeight: 500 }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.white }}>
      <header style={{ background: Colors.primary, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.white, padding: 6, display: 'flex' }}><ArrowLeft size={22} /></button>
        <span style={{ color: Colors.white, fontSize: 18, fontWeight: 600 }}>Admin Panel</span>
        <div style={{ flex: 1 }} />
        <button onClick={refresh} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, cursor: 'pointer', color: Colors.white, padding: 6, display: 'flex' }}>
          <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid #E9EDEF', overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '10px 6px', border: 'none', background: tab === t.key ? '#E8F5E9' : 'transparent',
            cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === t.key ? Colors.primary : Colors.textSecondary,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderBottom: tab === t.key ? `2px solid ${Colors.primary}` : '2px solid transparent',
          }}>
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} color="#075E54"
                subtitle={`${stats?.activeUsers || 0} active this week`}
                trend={stats?.totalUsers > 0 ? Math.round((stats?.usersThisWeek || 0) / stats?.totalUsers * 100) : 0} />
              <StatCard label="Joined Today" value={stats?.usersToday || 0} icon={UserPlus} color="#128C7E" />
              <StatCard label="Active Users" value={stats?.activeUsers || 0} icon={Activity} color="#34B7F1"
                subtitle={stats?.totalUsers > 0 ? `${Math.round((stats?.activeUsers || 0) / (stats?.totalUsers || 1) * 100)}% of total` : ''} />
              <StatCard label="Banned" value={stats?.bannedUsers || 0} icon={Ban} color="#E53935" />
            </div>

            <SectionTitle><BarChart3 size={14} /> Messages</SectionTitle>
            <div style={{ background: '#F8F9FA', borderRadius: 14, padding: 16 }}>
              <BarChart data={[
                { label: 'DMs', value: stats?.totalMessages || 0, color: '#34B7F1' },
                { label: 'Groups', value: stats?.totalGroupMessages || 0, color: '#25D366' },
              ]} />
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontSize: 11, color: Colors.textHint }}>
                <span>Today: {stats?.messagesToday || 0} DMs</span>
                <span>Today: {stats?.groupMessagesToday || 0} groups</span>
              </div>
            </div>

            <SectionTitle><MessageSquare size={14} /> Engagement</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#F8F9FA', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <MiniDonut value={stats?.activeUsers || 0} total={stats?.totalUsers || 1} color="#25D366" />
                <span style={{ fontSize: 11, color: Colors.textSecondary }}>Active Rate</span>
              </div>
              <div style={{ background: '#F8F9FA', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <MiniDonut value={stats?.verifiedUsers || 0} total={stats?.totalUsers || 1} color="#128C7E" />
                <span style={{ fontSize: 11, color: Colors.textSecondary }}>Verified Users</span>
              </div>
            </div>

            <SectionTitle><Group size={14} /> Communities</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Conversations" value={stats?.totalConversations || 0} icon={MessageCircle} color="#34B7F1" />
              <StatCard label="Groups" value={stats?.totalGroups || 0} icon={Group} color="#25D366" />
              <StatCard label="Channels" value={stats?.totalChannels || 0} icon={Radio} color="#E91E63" />
              <StatCard label="Channel Posts" value={stats?.totalChannelPosts || 0} icon={FileText} color="#FB8C00" />
            </div>

            <SectionTitle><Shield size={14} /> Admin & Verification</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Admins" value={stats?.adminCount || 0} icon={Shield} color="#6D4C41" />
              <StatCard label="Verified Users" value={stats?.verifiedUsers || 0} icon={BadgeCheck} color="#128C7E" />
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#F0F2F5', borderRadius: 10, padding: '0 10px' }}>
                <Search size={16} color={Colors.textHint} />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 6px', outline: 'none', fontSize: 13 }} />
                {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} color={Colors.textHint} /></button>}
              </div>
            </div>
            {filteredUsers.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #F0F2F5' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${u.id * 40 % 360}, 45%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.white, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {u.username?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {u.username}
                    {u.isVerified && <BadgeCheck size={14} color={Colors.accent} />}
        {u.isAdmin && <Shield size={14} color={Colors.primary} />}
                    {u.isBanned && <Ban size={12} color={Colors.red} />}
                  </div>
                  <div style={{ fontSize: 11, color: Colors.textHint }}>{u.phoneNumber} &middot; {new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openSupportChat(u)} style={{ background: '#E8F5E9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: Colors.primary, display: 'flex' }} title="Chat">
                      <MessageSquare size={14} />
                    </button>
                    <button onClick={() => handleVerifyUser(u.id)} style={{ background: u.isVerified ? '#E8F5E9' : '#E3F2FD', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: u.isVerified ? Colors.primary : '#1565C0', display: 'flex' }} title={u.isVerified ? 'Unverify' : 'Verify'}>
                      <BadgeCheck size={14} />
                    </button>
                    {!u.isAdmin && (
                      <button onClick={() => handleMakeAdmin(u.id)} style={{ background: '#E3F2FD', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#1565C0', display: 'flex' }} title="Make admin">
                        <Shield size={14} />
                      </button>
                    )}
                  <button onClick={() => handleBan(u.id)} style={{ background: u.isBanned ? '#E8F5E9' : '#FEE2E2', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: u.isBanned ? Colors.primary : Colors.red, display: 'flex' }} title={u.isBanned ? 'Unban' : 'Ban'}>
                    <Ban size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'channels' && (
          <div>
            <div style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }}>
              {channels.length} channel{channels.length !== 1 ? 's' : ''} total
            </div>
            {channelsLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: Colors.textHint, fontSize: 14 }}>Loading...</div>
            ) : channels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: Colors.textHint, fontSize: 14 }}>No channels found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {channels.map((ch) => (
                  <div key={ch.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                    borderBottom: '1px solid #F0F2F5',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: '#E8F5E9', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {ch.avatar ? <img src={ch.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Radio size={18} color={Colors.primary} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {ch.name}
                        {ch.isVerified && <BadgeCheck size={14} color={Colors.accent} />}
                      </div>
                      <div style={{ fontSize: 12, color: Colors.textHint }}>
                        {ch.followerCount || 0} followers · by {ch.creator?.username || 'unknown'} · {new Date(ch.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={async () => {
                      try {
                        await adminAPI.verifyChannel(ch.id);
                        setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, isVerified: !c.isVerified } : c));
                      } catch {}
                    }} style={{
                      background: ch.isVerified ? '#E8F5E9' : '#F0F2F5', border: 'none', borderRadius: 8,
                      padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: ch.isVerified ? Colors.primary : Colors.textHint, fontWeight: 500,
                    }}>
                      <BadgeCheck size={14} />
                      {ch.isVerified ? 'Verified' : 'Verify'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'broadcast' && (
          <div>
            <div style={{ background: '#FFF8E1', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: '#795548', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={16} /> Broadcasts are sent to all non-banned users.
            </div>

            {showBcPreview ? (
              <div style={{ marginBottom: 16, background: '#F9FAFB', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: Colors.textSecondary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={14} /> Preview
                </div>
                <div style={{ background: Colors.white, borderRadius: 12, padding: 14, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <BadgeCheck size={16} color={Colors.accent} />
                  <div style={{ fontSize: 11, color: Colors.accent, fontWeight: 600, marginTop: 4 }}>TuChat</div>
                  {bcContent.trim() && (
                    <div style={{ fontSize: 14, color: Colors.textPrimary, marginTop: 8, whiteSpace: 'pre-wrap' }}>{bcContent}</div>
                  )}
                  {bcFileUrl && bcFileType !== 'text' && (
                    <div style={{ marginTop: 8, width: '100%' }}>
                      {bcFileType === 'image' && <img src={bcFileUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />}
                      {bcFileType === 'video' && <video src={bcFileUrl} controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />}
                      {bcFileType === 'audio' && <audio src={bcFileUrl} controls style={{ width: '100%' }} />}
                      {bcFileType === 'file' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#F3F4F6', borderRadius: 8 }}>
                          <FileText size={20} color={Colors.textSecondary} />
                          <span style={{ fontSize: 13, color: Colors.textPrimary }}>{bcFileName || 'File'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setShowBcPreview(false)} style={{ flex: 1, border: '1px solid #E0E0E0', borderRadius: 10, padding: '8px 0', background: Colors.white, cursor: 'pointer', color: Colors.textSecondary, fontWeight: 500, fontSize: 13 }}>
                    Edit
                  </button>
                  <button onClick={handleBroadcast} disabled={bcSending} style={{ flex: 1, background: Colors.primary, border: 'none', borderRadius: 10, padding: '8px 0', color: Colors.white, cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: bcSending ? 0.6 : 1 }}>
                    {bcSending ? 'Sending...' : 'Send to All'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={bcContent} onChange={(e) => setBcContent(e.target.value)} placeholder="Type broadcast message..." style={{ flex: 1, border: '1px solid #E0E0E0', borderRadius: 10, padding: '10px 12px', outline: 'none', fontSize: 13 }} />
                  {!bcFileUrl && (
                    <button onClick={() => bcImageInputRef.current?.click()} style={{ background: '#F0F2F5', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: Colors.textSecondary, display: 'flex', alignItems: 'center' }} title="Attach Image">
                      <Image size={18} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input type="file" accept="image/*" ref={bcImageInputRef} style={{ display: 'none' }} onChange={(e) => handleBcFileSelect(e, 'image')} />
                  <input type="file" accept="video/*" ref={bcFileInputRef} style={{ display: 'none' }} onChange={(e) => handleBcFileSelect(e, 'video')} />
                  <input type="file" accept="audio/*" ref={bcAudioInputRef} style={{ display: 'none' }} onChange={(e) => handleBcFileSelect(e, 'audio')} />
                  <input type="file" ref={bcDocInputRef} style={{ display: 'none' }} onChange={(e) => handleBcFileSelect(e, 'file')} />
                  <button onClick={() => bcFileInputRef.current?.click()} disabled={bcUploading} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F2F5', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: Colors.textSecondary, fontSize: 12, opacity: bcUploading ? 0.6 : 1 }}>
                    <FileText size={14} /> Video
                  </button>
                  <button onClick={() => bcAudioInputRef.current?.click()} disabled={bcUploading} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F2F5', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: Colors.textSecondary, fontSize: 12, opacity: bcUploading ? 0.6 : 1 }}>
                    <Music size={14} /> Audio
                  </button>
                  <button onClick={() => bcDocInputRef.current?.click()} disabled={bcUploading} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F2F5', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: Colors.textSecondary, fontSize: 12, opacity: bcUploading ? 0.6 : 1 }}>
                    <FileText size={14} /> File
                  </button>
                </div>
                {bcUploading && <div style={{ fontSize: 12, color: Colors.textHint, marginBottom: 8 }}>Uploading...</div>}
                {bcFileUrl && (
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    {bcFileType === 'image' && (
                      <div style={{ position: 'relative' }}>
                        <img src={bcFileUrl} alt="preview" style={{ width: '100%', maxHeight: 180, borderRadius: 8, objectFit: 'contain', background: '#F3F4F6' }} />
                        <button onClick={clearBcFile} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
                      </div>
                    )}
                    {bcFileType === 'video' && (
                      <div style={{ position: 'relative' }}>
                        <video src={bcFileUrl} controls style={{ width: '100%', maxHeight: 180, borderRadius: 8 }} />
                        <button onClick={clearBcFile} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
                      </div>
                    )}
                    {bcFileType === 'audio' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F3F4F6', borderRadius: 8 }}>
                        <Music size={16} color={Colors.textSecondary} />
                        <audio src={bcFileUrl} controls style={{ flex: 1, height: 36 }} />
                        <button onClick={clearBcFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.red, fontSize: 12 }}>Remove</button>
                      </div>
                    )}
                    {bcFileType === 'file' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F3F4F6', borderRadius: 8 }}>
                        <FileText size={16} color={Colors.textSecondary} />
                        <span style={{ flex: 1, fontSize: 12, color: Colors.textPrimary }}>{bcFileName || 'File attached'}</span>
                        <button onClick={clearBcFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.red, fontSize: 12 }}>Remove</button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setShowBcPreview(true)}
                  disabled={bcSending || (!bcContent.trim() && !bcFileUrl)}
                  style={{ width: '100%', background: Colors.primary, border: 'none', borderRadius: 10, padding: '10px 0', color: Colors.white, cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: (bcSending || (!bcContent.trim() && !bcFileUrl)) ? 0.6 : 1 }}>
                  {bcSending ? 'Sending...' : 'Preview & Send'}
                </button>
              </div>
            )}

            {bcStatus && <div style={{ fontSize: 12, color: Colors.primary, marginBottom: 12 }}>{bcStatus}</div>}
            <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, marginBottom: 8 }}>Recent Broadcasts</div>
            {broadcasts.map((b) => (
              <div key={b.id} style={{ padding: '10px 0', borderBottom: '0.5px solid #F0F2F5', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: Colors.textHint, marginBottom: 4 }}>
                    <BadgeCheck size={12} color={Colors.primary} /> TuChat &middot; {new Date(b.createdAt).toLocaleString()}
                  </div>
                  {b.content && <div style={{ fontSize: 13, color: Colors.textPrimary, wordBreak: 'break-word' }}>{b.content}</div>}
                  {b.fileUrl && (
                    <div style={{ fontSize: 12, color: Colors.accent, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {b.mimeType?.startsWith('image/') ? <Image size={12} /> : b.mimeType?.startsWith('video/') ? <FileText size={12} /> : b.mimeType?.startsWith('audio/') ? <Music size={12} /> : <FileText size={12} />}
                      {b.mimeType?.startsWith('image/') ? 'Image' : b.mimeType?.startsWith('video/') ? 'Video' : b.mimeType?.startsWith('audio/') ? 'Audio' : 'File'}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDeleteBroadcast(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: Colors.red, padding: 4, flexShrink: 0 }} title="Delete broadcast">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'support' && (
          <div>
            {selectedTicket ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <button onClick={closeTicket} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><ArrowLeft size={18} /></button>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${selectedTicket.userId * 40 % 360}, 45%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.white, fontWeight: 700, fontSize: 14 }}>
                    {selectedTicket.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary }}>{selectedTicket.user?.username}</span>
                    <span style={{ fontSize: 11, color: Colors.textHint, marginLeft: 8 }}>
                      {selectedTicket.status === 'open' ? 'Waiting' : selectedTicket.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                    </span>
                  </div>
                  {selectedTicket.status !== 'resolved' && (
                    <button onClick={() => handleResolveTicket(selectedTicket.id)} style={{ background: '#E8F5E9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: Colors.primary, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} /> Resolve
                    </button>
                  )}
                </div>
                <div ref={bottomRef} style={{ height: 300, overflowY: 'auto', background: '#ECE5DD', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ticketMessages.map((m) => (
                    <div key={m.id} style={{ alignSelf: String(m.senderId) === String(currentUser.id) ? 'flex-end' : 'flex-start', maxWidth: '80%', background: String(m.senderId) === String(currentUser.id) ? '#DCF8C6' : Colors.white, borderRadius: 8, padding: '8px 12px', wordBreak: 'break-word' }}>
                      {String(m.senderId) !== String(currentUser.id) && m.sender?.username && (
                        <div style={{ fontSize: 10, color: Colors.accent, fontWeight: 600, marginBottom: 2 }}>{m.sender.username}</div>
                      )}
                      <div style={{ fontSize: 13, color: Colors.textPrimary }}>{m.content}</div>
                      <div style={{ fontSize: 10, color: Colors.textHint, textAlign: 'right', marginTop: 2 }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                </div>
                {selectedTicket.status !== 'resolved' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={ticketInput} onChange={(e) => setTicketInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTicketSend(); } }} placeholder="Type a message..." style={{ flex: 1, border: '1px solid #E0E0E0', borderRadius: 24, padding: '10px 14px', outline: 'none', fontSize: 13 }} />
                    <button onClick={handleTicketSend} style={{ width: 40, height: 40, borderRadius: '50%', background: Colors.primary, border: 'none', cursor: 'pointer', color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Send size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    <button onClick={() => { fetchSupportQueue(); fetchSupportHistory(); }} style={{ background: '#E8F5E9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: Colors.primary, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={14} /> Refresh
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} color="#FFC107" /> Live Queue ({supportQueue.length})
                </div>
                {supportQueue.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: Colors.textHint, fontSize: 13 }}>
                    <MessageCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} />
                    No incoming support requests
                  </div>
                ) : (
                  supportQueue.map((t) => (
                    <div key={t.id} onClick={() => openTicket(t)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #F0F2F5', cursor: 'pointer' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${t.userId * 40 % 360}, 45%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.white, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {t.user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: Colors.textPrimary, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {t.user?.username || 'Unknown'}
                          <span style={{ fontSize: 10, color: t.status === 'open' ? '#FFC107' : Colors.primary, fontWeight: 600 }}>{t.status === 'open' ? 'NEW' : 'Active'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: Colors.textHint }}>{t.user?.phoneNumber || ''} &middot; {new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                      {t.status === 'open' && (
                        <button onClick={(e) => { e.stopPropagation(); handleClaimTicket(t.id); }} style={{ background: Colors.primary, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: Colors.white, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                          Claim
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <span style={{ fontSize: 11, color: Colors.textHint, flexShrink: 0 }}>Assigned to {t.admin?.username || 'you'}</span>
                      )}
                    </div>
                  ))
                )}

                <div style={{ fontSize: 14, fontWeight: 600, color: Colors.textPrimary, marginTop: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} color={Colors.green} /> History ({supportHistory.length})
                </div>
                {supportHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, color: Colors.textHint, fontSize: 13 }}>No resolved tickets</div>
                ) : (
                  supportHistory.map((t) => (
                    <div key={t.id} onClick={() => openTicket(t)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #F0F2F5', cursor: 'pointer' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${t.userId * 40 % 360}, 45%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.white, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {t.user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: Colors.textPrimary }}>{t.user?.username || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: Colors.textHint }}>Resolved by {t.admin?.username || 'admin'} &middot; {new Date(t.updatedAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
