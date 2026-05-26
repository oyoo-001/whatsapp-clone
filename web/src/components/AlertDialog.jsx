import { Colors } from '../styles/theme';

const AlertDialog = ({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, type }) => {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s',
    }} onClick={onCancel}>
      <div style={{
        background: Colors.white, borderRadius: 16, padding: '24px 28px',
        maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'scaleIn 0.2s',
      }} onClick={(e) => e.stopPropagation()}>
        {title && <h3 style={{ margin: '0 0 8px', fontSize: 18, color: Colors.textPrimary }}>{title}</h3>}
        {message && <p style={{ margin: 0, fontSize: 14, color: Colors.textSecondary, lineHeight: 1.5 }}>{message}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
          {cancelLabel && (
            <button onClick={onCancel} style={{
              background: 'none', border: 'none', padding: '10px 20px',
              fontSize: 14, fontWeight: 600, color: Colors.textSecondary, cursor: 'pointer', borderRadius: 8,
            }}>{cancelLabel}</button>
          )}
          {confirmLabel && (
            <button onClick={onConfirm} style={{
              background: type === 'danger' ? Colors.red : Colors.primary,
              border: 'none', padding: '10px 24px', fontSize: 14, fontWeight: 600,
              color: Colors.white, cursor: 'pointer', borderRadius: 8,
            }}>{confirmLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
