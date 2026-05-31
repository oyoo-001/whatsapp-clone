import useInvitePreviewStore from '../stores/invitePreviewStore';

const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,!?;:)"'\]])/gi;
const INVITE_REGEX = /^(https?:\/\/[^\/]+\/(channel|group)\/invite\/([^\s<]+))/i;
const ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

export const extractUrls = (text) => {
  if (!text) return [];
  return text.match(URL_REGEX) || [];
};

const getInviteInfo = (url) => {
  const match = url.match(INVITE_REGEX);
  if (!match) return null;
  const [, , type, code] = match;
  return { type, code };
};

export const renderTextWithLinks = (text) => {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      const inviteInfo = getInviteInfo(part);
      if (inviteInfo) {
        const isLocal = part.startsWith(ORIGIN);
        return (
          <a key={i} href={part}
            style={{ color: '#075E54', textDecoration: 'underline', wordBreak: 'break-all', cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              useInvitePreviewStore.getState().open(inviteInfo.type, inviteInfo.code);
            }}>
            {part}
          </a>
        );
      }
      return (
        <a key={i} href={part}
          style={{ color: '#075E54', textDecoration: 'underline', wordBreak: 'break-all' }}
          onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      );
    }
    return part;
  });
};
