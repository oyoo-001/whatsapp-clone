import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Radio, Users, BadgeCheck, Loader, Check, Plus } from 'lucide-react';
import { Colors } from '../styles/theme';
import { channelsAPI } from '../services/api';
import useChannelStore from '../stores/channelStore';

const ChannelSearchModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const followChannels = useChannelStore(state => state.channels);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q) { setResults([]); setSearched(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await channelsAPI.exploreChannels(q, 15);
        setResults(data.channels || []);
        setSearched(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const isFollowed = (ch) =>
    followChannels.some(fc => String(fc.id) === String(ch.id)) ||
    ch.isFollowing || ch.isOwner;

  const handleFollow = async (ch) => {
    if (isFollowed(ch)) {
      navigate(`/channels/${ch.id}`);
      onClose();
      return;
    }
    try {
      await channelsAPI.follow(ch.id);
      setResults(prev => prev.map(c =>
        String(c.id) === String(ch.id) ? { ...c, isFollowing: true, followerCount: (c.followerCount || 0) + 1 } : c
      ));
      useChannelStore.getState().fetchChannels();
    } catch {}
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: Colors.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
        maxHeight: '85vh', padding: '20px 24px 30px', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: Colors.textPrimary }}>Discover Channels</h3>
          <button onClick={onClose} style={{ background: '#F0F2F5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: Colors.textHint }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F0F2F5', borderRadius: 10, padding: '0 10px', marginBottom: 12 }}>
          <Search size={16} color={Colors.textHint} />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels by name..."
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 6px', outline: 'none', fontSize: 14 }} />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} color={Colors.textHint} /></button>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <Loader size={24} color={Colors.primary} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: Colors.textSecondary, fontSize: 14 }}>
              No channels found for "{query}"
            </div>
          )}
          {!loading && results.map((ch) => {
            const following = isFollowed(ch);
            return (
              <div key={ch.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: '1px solid #F0F2F5',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: '#E8F5E9', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {ch.avatar ? <img src={ch.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Radio size={20} color={Colors.primary} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: Colors.textPrimary, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {ch.name}
                    {ch.isVerified && <BadgeCheck size={14} color={Colors.accent} />}
                  </div>
                  <div style={{ fontSize: 12, color: Colors.textHint, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> {ch.followerCount || 0} follower{(ch.followerCount || 0) !== 1 ? 's' : ''}
                    {ch.creator?.username && <> · by {ch.creator.username}</>}
                  </div>
                </div>
                <button onClick={() => handleFollow(ch)} style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', flexShrink: 0,
                  background: following ? '#E8F5E9' : Colors.secondary,
                  color: following ? Colors.primary : '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {following ? <><Check size={14} /> Following</> : <><Plus size={14} /> Follow</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChannelSearchModal;