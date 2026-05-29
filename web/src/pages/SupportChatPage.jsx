import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, BadgeCheck, MessageCircle } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import socketService from '../services/socket';
import { supportAPI } from '../services/api';
import { Colors } from '../styles/theme';

const SupportChatPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: ticketRes } = await supportAPI.createTicket();
        const { data: msgRes } = await supportAPI.getMessages();
        setMessages(msgRes.messages || []);
        setTicket(msgRes.ticket || ticketRes.ticket);
      } catch {}
      setLoading(false);
    };
    init();

    const unsub = socketService.on('support:new-message', ({ message }) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    const unsubUpdate = socketService.on('admin:support-update', ({ status }) => {
      setTicket((prev) => prev ? { ...prev, status } : prev);
    });

    return () => { unsub(); unsubUpdate(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await supportAPI.sendMessage(text);
      setMessages((prev) => [...prev, data.message]);
      if (!ticket) setTicket(data.ticket);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: Colors.white }}>
        <div style={{ width: 24, height: 24, border: '3px solid #E9EDEF', borderTopColor: Colors.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', width: '100%', background: Colors.white }}>
      <header style={{ background: Colors.primary, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, cursor: 'pointer', color: Colors.white, padding: 8, display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: Colors.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={18} color={Colors.white} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: Colors.white, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Support Team
            <BadgeCheck size={14} color={Colors.accent} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            {ticket?.status === 'open' ? 'Waiting for an agent...' :
             ticket?.status === 'in_progress' ? 'An agent is helping you' :
             ticket?.status === 'resolved' ? 'Ticket resolved' : 'Support'}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', background: '#ECE5DD', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: Colors.textHint, fontSize: 13, marginTop: 40 }}>
            <MessageCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div>How can we help you?</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Send a message to start the conversation.</div>
          </div>
        )}
        {messages.map((m) => {
          const isMine = String(m.senderId) === String(currentUser?.id);
          return (
            <div key={m.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ background: isMine ? '#DCF8C6' : Colors.white, borderRadius: 8, padding: '8px 12px', wordBreak: 'break-word' }}>
                {!isMine && m.sender?.isAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: Colors.accent, fontWeight: 600, marginBottom: 2 }}>
                    <BadgeCheck size={10} /> Support
                  </div>
                )}
                <div style={{ fontSize: 13, color: Colors.textPrimary }}>{m.content}</div>
                <div style={{ fontSize: 10, color: Colors.textHint, textAlign: 'right', marginTop: 2 }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 10px', background: Colors.inputBg, zIndex: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message..."
          style={{ flex: 1, border: '1px solid #E0E0E0', borderRadius: 24, padding: '10px 14px', outline: 'none', fontSize: 13 }}
        />
        <button onClick={handleSend} style={{ width: 40, height: 40, borderRadius: '50%', background: Colors.primary, border: 'none', cursor: 'pointer', color: Colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default SupportChatPage;
