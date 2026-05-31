import { useEffect, useState } from 'react';
import { ExternalLink, ImageOff, Loader } from 'lucide-react';
import { Colors } from '../styles/theme';
import { linksAPI } from '../services/api';

const LinkPreview = ({ url }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    linksAPI.preview(url).then(({ data: d }) => {
      if (cancelled) return;
      if (d.title || d.image) {
        setData(d);
      } else {
        setError(true);
      }
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) return null;
  if (error) return null;
  if (!data?.title && !data?.image) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex', flexDirection: 'column', borderRadius: 10,
        overflow: 'hidden', border: '1px solid #E9EDEF', marginTop: 8,
        textDecoration: 'none', color: 'inherit',
        background: 'rgba(255,255,255,0.8)',
      }}>
      {data.image && (
        <div style={{ width: '100%', aspectRatio: '2/1', overflow: 'hidden', background: '#F0F2F5', position: 'relative' }}>
          <img src={data.image} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.title && (
          <span style={{ fontSize: 13, fontWeight: 600, color: Colors.textPrimary, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {data.title}
          </span>
        )}
        {data.description && (
          <span style={{ fontSize: 11, color: Colors.textSecondary, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {data.description}
          </span>
        )}
        <span style={{ fontSize: 10, color: Colors.textHint, display: 'flex', alignItems: 'center', gap: 3 }}>
          <ExternalLink size={10} />
          {new URL(url).hostname}
        </span>
      </div>
    </a>
  );
};

export default LinkPreview;
