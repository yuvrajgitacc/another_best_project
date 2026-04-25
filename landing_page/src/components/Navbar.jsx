import React, { useState, useEffect } from 'react';
import { motion, useScroll } from 'framer-motion';
import './Navbar.css';

export const Logo = ({ height = '120px', scrolled = false }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Rounded white card when scrolled over white bg; clean pill over dark hero
    background: scrolled ? 'transparent' : 'rgba(255,255,255,0.12)',
    backdropFilter: scrolled ? 'none' : 'blur(8px)',
    WebkitBackdropFilter: scrolled ? 'none' : 'blur(8px)',
    borderRadius: '16px',
    padding: scrolled ? '0' : '6px 10px',
    border: scrolled ? 'none' : '1px solid rgba(255,255,255,0.25)',
    transition: 'all 0.4s ease',
    boxShadow: scrolled ? 'none' : '0 4px 20px rgba(0,0,0,0.2)',
  }}>
    <img
      src="/LOGO.png"
      alt="SevaSetu Logo"
      style={{
        height: height,
        width: 'auto',
        objectFit: 'contain',
        imageRendering: '-webkit-optimize-contrast',
        display: 'block',
        // Remove white background via mix-blend-mode over dark backgrounds
        mixBlendMode: scrolled ? 'normal' : 'multiply',
        filter: scrolled ? 'none' : 'contrast(1.1) brightness(1.05)',
      }}
    />
  </div>
);

const Navbar = ({ onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState('landing');
  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setScrolled(latest > 80);
    });
  }, [scrollY]);

  const handleInstallApp = () => {
    window.location.href = 'http://localhost:5174/';
  };

  const handleDashboard = () => {
    window.location.href = 'http://localhost:5173/';
  };

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
    >
      <motion.button
        className="nav-left"
        onClick={() => onNavigate('landing')}
        style={{
          background: 'none',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 0,
          outline: 'none',
          WebkitAppearance: 'none',
        }}
        whileHover={{ opacity: 0.88, scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Logo height={scrolled ? '80px' : '100px'} scrolled={scrolled} />
      </motion.button>

      <div className="nav-center">
        {['Home', 'Features', 'How it Works', 'Pricing'].map((item) => {
          const targetView = item.toLowerCase() === 'home' ? 'landing' : item.toLowerCase().replace(/ /g, '-');
          const isActive = activeItem === targetView;

          return (
            <motion.button
              key={item}
              onClick={() => {
                setActiveItem(targetView);
                onNavigate(targetView);
              }}
              className="nav-link"
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                fontSize: '14px',
                fontWeight: isActive ? '700' : '500',
                color: isActive
                  ? (scrolled ? '#3b82f6' : '#fbbf24')
                  : (scrolled ? '#1a1c1e' : 'rgba(255,255,255,0.85)'),
                padding: '8px 12px'
              }}
              whileHover={{ y: isActive ? 0 : -1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {item}
              {isActive && (
                <motion.div
                  layoutId="navbar-active-indicator"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '10%',
                    right: '10%',
                    height: '2px',
                    background: scrolled ? '#3b82f6' : '#f59e0b',
                    borderRadius: '2px'
                  }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <motion.button
          className={scrolled ? 'install-app-btn' : 'install-app-btn install-app-btn-light'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleInstallApp}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Install App
        </motion.button>
        <motion.button
          className={scrolled ? 'dashboard-btn' : 'dashboard-btn dashboard-btn-light'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDashboard}
        >
          Dashboard
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
        </motion.button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
