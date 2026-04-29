import React from 'react';

const Loader = ({ fullScreen = false, message = 'Chargement...' }) => {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {message && <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.9)',
        zIndex: 9999,
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loader;
