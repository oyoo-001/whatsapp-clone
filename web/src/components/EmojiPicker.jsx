import { useState, useCallback } from 'react';
import { Search, Hash } from 'lucide-react';
import { Colors } from '../styles/theme';

const EMOJIS = [
  '😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭',
  '🤔','🤐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','😎',
  '🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😤','😡',
  '😠','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚',
  '🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏',
  '🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄','💋','👶','🧒',
  '👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵','💂','🥷',
  '👷','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','🧌','💆',
  '💇','🚶','🧍','🧎','🏃','💃','🕺','🕴','👯','🧖','🧘','🛀','🛌','👭','👫','👬','💏','💑','👪','💍','👑','🎒','👝','👛',
  '👜','💼','👓','🕶','🥽','🥼','🦺','👔','👕','👖','🧣','🧤','🧥','🧦','👗','👘','🥻','🩱','🩲','🩳','👙','👚','👛','👜',
  '👝','🎒','👞','👟','🥾','🥿','👠','👡','👢','👑','👒','🎩','🎓','🧢','⛑','💄','💋','👣','🐶','🐱','🐭','🐹','🐰','🦊',
  '🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺',
  '🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠',
  '🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖',
  '🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫',
  '🦦','🦥','🐁','🐀','🐿','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🍃','🍂','🍁','🍄',
  '🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌎',
  '🌍','🌏','🪐','💫','⭐','🌟','✨','⚡','☄','💥','🔥','🌪','🌈','☀️','🌤','⛅','🌥','☁️','🌦','🌧','⛈','🌩','🌨','❄️',
  '☃️','⛄','🌬','💨','💧','💦','☔','☂','🌊','🌫','🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭',
  '🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🫘','🥐','🍞','🥖','🥨','🧀','🥚',
  '🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫',
  '🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂',
  '🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕️','🫖','🍵','🍶','🍺','🍻','🥂','🍷','🫗','🥃','🍸','🍹',
  '🧉','🍾','🧊','🥄','🍴','🍽','🥣','🥡','🥢','🧂','⚽️','🏀','🏈','⚾️','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒',
  '🏑','🥍','🏏','🪃','🥅','⛳️','🪁','🏹','🎣','🤿','🥊','🛹','🛼','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋','🤼','🤸','🤺',
  '⛹','🤾','🏌','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎫','🎟','🎪','🤹',
  '🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟','🎯','🎳','🎮','🕹','🎰','🚗','🚙',
  '🚕','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🛺','🚲','🛴','🛹','🛼','🚏','🛣','🛤','⛽','🛳',
  '⛴','🛥','🚢','✈️','🛩','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰','🚀','🛸','🏠','🏡','🏘','🏚','🏗','🏢','🏭','🏣',
  '🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩','🕋','⛲','🌄','🌅','🌇','🌆',
  '🏙','🌃','🌌','🌉','🌁','⌚️','📱','💻','⌨️','🖥','🖨','🖱','🖲','🕹','🗜','💽','💾','💿','📀','📼','📷','📸','📹','🎥',
  '📽','🎞','📞','☎️','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰','⌛️','📡','🔋','🔌','💡','🔦','🕯','🪔',
  '🧯','🗑','🛢','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒','🛠','⛏','🪚','🔩','⚙',
  '🧱','⛓','🧲','🔫','💣','🧨','🪓','🔪','🗡','⚔','🛡','🚬','⚰','🪦','⚱','🏺','🔮','📿','🧿','🪬','💈','⚗','🔭','🔬',
  '🕳','💊','💉','🩸','🩹','🩺','🩻','🌡','🪟','🛏','🛋','🪑','🚪','🛗','🪞','🪟','🛁','🛀','🧴','🧷','🧹','🧺','🧻','🪣',
  '🧼','🪥','🪒','🧽','🪣','🧴','🪤','🪡','🧶','🪢','🪡','🧵','👔','👕','👖','🧣','🧤','🧥','🧦','👗','👘','🥻','🩱','🩲',
  '🩳','👙','👚','👛','👜','👝','🎒','👞','👟','🥾','🥿','👠','👡','👢','👑','👒','🎩','🎓','🧢','⛑','💄','💋','👣',
];

const CATEGORIES = [
  { name: 'Smileys', icon: '😀' },
  { name: 'Gestures', icon: '✌️' },
  { name: 'People', icon: '👨' },
  { name: 'Animals', icon: '🐱' },
  { name: 'Food', icon: '🍕' },
  { name: 'Activities', icon: '⚽' },
  { name: 'Travel', icon: '🚗' },
  { name: 'Objects', icon: '💡' },
  { name: 'Symbols', icon: '❤️' },
];

const GIF_KEYWORDS = ['funny','cat','dog','dance','wave','hello','love','happy','sad','wow','cool','party','celebration','applause','laugh','cry','shock','think','sleep','eat','drink','music','sport','game','nature','beach','fire','clap','hug','kiss','bye','thanks','sorry','ok','no','yes','omg','lol','fail','win'];

const EmojiPicker = ({ open, onSelect, onClose }) => {
  const [tab, setTab] = useState('emoji');
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [stickerQuery, setStickerQuery] = useState('');
  const [stickers, setStickers] = useState([]);
  const [stickerLoading, setStickerLoading] = useState(false);

  const searchGifs = useCallback(async (q) => {
    setGifQuery(q);
    if (!q.trim()) { setGifs([]); return; }
    setGifLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=0UTRbFtkMxAplrohufYb5LhKWoosNH2d&q=${encodeURIComponent(q)}&limit=25&rating=g`);
      const data = await res.json();
      setGifs(data.data || []);
    } catch { setGifs([]); }
    setGifLoading(false);
  }, []);

  const searchStickers = useCallback(async (q) => {
    setStickerQuery(q);
    if (!q.trim()) { setStickers([]); return; }
    setStickerLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/stickers/search?api_key=0UTRbFtkMxAplrohufYb5LhKWoosNH2d&q=${encodeURIComponent(q)}&limit=25&rating=g`);
      const data = await res.json();
      setStickers(data.data || []);
    } catch { setStickers([]); }
    setStickerLoading(false);
  }, []);

  if (!open) return null;

  const quickGifs = gifQuery ? gifs : GIF_KEYWORDS.slice(0, 8).map((k) => ({ keyword: k }));

  return (
    <div style={{
      background: Colors.white, borderTop: '1px solid #E8ECF0',
      maxHeight: 320, display: 'flex', flexDirection: 'column',
      animation: 'slideUp 0.2s ease',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #E8ECF0' }}>
        <button onClick={() => setTab('emoji')} style={{ ...tabBtn, borderBottom: tab === 'emoji' ? `2.5px solid ${Colors.primary}` : '2.5px solid transparent', color: tab === 'emoji' ? Colors.primary : Colors.textHint }}>Emoji</button>
        <button onClick={() => { setTab('gif'); searchGifs('funny'); }} style={{ ...tabBtn, borderBottom: tab === 'gif' ? `2.5px solid ${Colors.primary}` : '2.5px solid transparent', color: tab === 'gif' ? Colors.primary : Colors.textHint }}>GIF</button>
        <button onClick={() => { setTab('sticker'); searchStickers('funny'); }} style={{ ...tabBtn, borderBottom: tab === 'sticker' ? `2.5px solid ${Colors.primary}` : '2.5px solid transparent', color: tab === 'sticker' ? Colors.primary : Colors.textHint }}>Stickers</button>
      </div>

      {tab === 'emoji' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {EMOJIS.map((emoji, i) => (
              <button key={i} onClick={() => onSelect(emoji)} style={{
                width: 38, height: 38, border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: 8, transition: 'background 0.1s',
              }}>{emoji}</button>
            ))}
          </div>
        </div>
      ) : tab === 'gif' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#F5F7FA', borderRadius: 10, margin: '8px 12px' }}>
            <Search size={16} color={Colors.textHint} />
            <input value={gifQuery} onChange={(e) => searchGifs(e.target.value)}
              placeholder="Search GIFs..."
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {gifLoading ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} style={{ width: '48%', height: 100, background: '#F0F2F5', borderRadius: 8, animation: 'pulse 1.5s ease infinite' }} />
                ))}
              </div>
            ) : !gifQuery ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {quickGifs.map((g, i) => (
                  <button key={i} onClick={() => searchGifs(g.keyword)} style={{
                    padding: '8px 14px', borderRadius: 20, background: '#F0F2F5',
                    border: 'none', cursor: 'pointer', fontSize: 13, color: Colors.textPrimary,
                    textTransform: 'capitalize',
                  }}>{g.keyword}</button>
                ))}
              </div>
            ) : gifs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: Colors.textSecondary, fontSize: 13 }}>No GIFs found</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {gifs.map((g) => (
                  <button key={g.id} onClick={() => onSelect(g.images?.fixed_height?.url || g.images?.original?.url, 'gif')} style={{
                    width: '49%', border: 'none', padding: 0, cursor: 'pointer',
                    borderRadius: 8, overflow: 'hidden',
                  }}>
                    <img src={g.images?.fixed_height?.url} alt={g.title}
                      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: '#F5F7FA', borderRadius: 10, margin: '8px 12px' }}>
            <Search size={16} color={Colors.textHint} />
            <input value={stickerQuery} onChange={(e) => searchStickers(e.target.value)}
              placeholder="Search Stickers..."
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {stickerLoading ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} style={{ width: '48%', height: 100, background: '#F0F2F5', borderRadius: 8, animation: 'pulse 1.5s ease infinite' }} />
                ))}
              </div>
            ) : !stickerQuery ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {GIF_KEYWORDS.slice(0, 8).map((k, i) => (
                  <button key={i} onClick={() => searchStickers(k)} style={{
                    padding: '8px 14px', borderRadius: 20, background: '#F0F2F5',
                    border: 'none', cursor: 'pointer', fontSize: 13, color: Colors.textPrimary,
                    textTransform: 'capitalize',
                  }}>{k}</button>
                ))}
              </div>
            ) : stickers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: Colors.textSecondary, fontSize: 13 }}>No stickers found</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {stickers.map((s) => (
                  <button key={s.id} onClick={() => onSelect(s.images?.fixed_height?.url || s.images?.original?.url, 'gif')} style={{
                    width: '49%', border: 'none', padding: 0, cursor: 'pointer',
                    borderRadius: 8, overflow: 'hidden',
                  }}>
                    <img src={s.images?.fixed_height?.url} alt={s.title}
                      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const tabBtn = {
  flex: 1, padding: '10px', background: 'none', border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
};

export default EmojiPicker;