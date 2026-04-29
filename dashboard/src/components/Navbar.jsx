import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Accueil', icon: '🏠' },
    { path: '/compare', label: 'Comparer', icon: '📊' },
    { path: '/timeline', label: 'Evolution', icon: '📈' },
    { path: '/about', label: 'A propos', icon: 'ℹ️' },
  ];

  return (
    <nav style={{
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      gap: '32px',
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '22px' }}>🗺️</span>
        <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>Urban Data Explorer</span>
      </Link>

      <div style={{ display: 'flex', gap: '4px', marginLeft: '16px' }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 500,
              background: location.pathname === item.path ? '#3b82f6' : 'transparent',
              color: location.pathname === item.path ? 'white' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
