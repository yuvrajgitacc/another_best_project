import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import './Navbar.css';

export const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="45" cy="45" r="35" stroke="currentColor" strokeWidth="8"/>
    <line x1="70" y1="70" x2="90" y2="90" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    <rect x="30" y="45" width="8" height="20" fill="currentColor" />
    <rect x="42" y="35" width="8" height="30" fill="currentColor" />
    <rect x="54" y="25" width="10" height="40" fill="currentColor" clipPath="inset(0 0 0 0 round 0 0 8 0)"/>
  </svg>
);

const Navbar = ({ onSignIn, onNavigate, currentView = 'landing' }) => {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setScrolled(latest > 50);
    });
  }, [scrollY]);

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
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}
        whileHover={{ opacity: 0.8 }}
      >
        <Logo />
        <span className="logo-text" style={{ fontSize: '18px', fontWeight: '700', color: '#1a1c1e', fontFamily: 'var(--serif)' }}>Vishleshan</span>
      </motion.button>

      <div className="nav-center">
        {['Home', 'Features', 'Pricing', 'Documentation'].map((item) => {
          const targetView = item.toLowerCase() === 'home' ? 'landing' : item.toLowerCase();
          const isActive = currentView === targetView;
          
          return (
            <motion.button 
              key={item}
              onClick={() => onNavigate(targetView)}
              className="nav-link"
              style={{ 
                position: 'relative',
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontFamily: 'var(--sans)', 
                fontSize: '14px', 
                fontWeight: isActive ? '700' : '500', 
                color: isActive ? '#3b82f6' : '#1a1c1e',
                padding: '8px 12px'
              }}
              whileHover={{ y: isActive ? 0 : -2 }}
              transition={{ type: "spring", stiffness: 400 }}
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
                    background: '#3b82f6',
                    borderRadius: '2px'
                  }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="nav-right">
        <motion.button 
          className="sign-in-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSignIn}
        >
          Sign In
          <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </motion.button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
