import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import './HeroHeader.css';

const HeroHeader = () => {
  const containerRef = useRef(null);

  // Use window scroll — works correctly with fixed navbar
  const { scrollY } = useScroll();
  const smoothY = useSpring(scrollY, { stiffness: 120, damping: 40, restDelta: 0.001 });

  // When scrollY = 0 hero is fully visible; when = window height it's scrolled away
  const bgY = useTransform(smoothY, [0, 800], ['0%', '20%']);
  const contentY = useTransform(smoothY, [0, 800], ['0%', '10%']);
  const opacity = useTransform(smoothY, [0, 500], [1, 0]);

  const titleText = "Empowering communities through smart volunteering.";
  const words = titleText.split(" ");

  const [stats, setStats] = useState({
    active_volunteers: "2,847",
    active_campaigns: "156",
    task_completion: "98.7",
    user_rating: "4.9"
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/analytics/public-stats')
      .then(res => res.json())
      .then(data => {
        setStats({
          active_volunteers: data.active_volunteers.toLocaleString(),
          active_campaigns: data.active_campaigns.toLocaleString(),
          task_completion: data.task_completion.toString(),
          user_rating: data.user_rating.toString()
        });
      })
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  return (
    <motion.section
      ref={containerRef}
      className="hero-fullscreen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      {/* Parallax Background Image */}
      <motion.div
        className="hero-bg-image"
        style={{ y: bgY }}
      />

      {/* Multi-layer Overlay */}
      <div className="hero-overlay-bottom" />
      <div className="hero-overlay-top" />

      {/* Animated floating particles */}
      <div className="hero-particles">
        {[...Array(18)].map((_, i) => (
          <motion.div
            key={i}
            className="hero-particle"
            style={{
              left: `${(i * 5.9) % 100}%`,
              top: `${(i * 7.3 + 10) % 90}%`,
              width: `${3 + (i % 4)}px`,
              height: `${3 + (i % 4)}px`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div className="hero-content" style={{ y: contentY, opacity }}>

        {/* Badge */}
        <motion.div
          className="badge-wrapper"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="badge-border-glow">
            <svg width="100%" height="100%" viewBox="0 0 200 40" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
              <rect x="1" y="1" width="198" height="38" rx="19" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2"/>
              <motion.rect
                x="1" y="1" width="198" height="38" rx="19"
                fill="none" stroke="url(#badge-gradient2)" strokeWidth="2.5" strokeDasharray="60 140"
                animate={{ strokeDashoffset: [0, -200] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ filter: 'drop-shadow(0 0 8px #f59e0b)' }}
              />
              <defs>
                <linearGradient id="badge-gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" /><stop offset="50%" stopColor="#ef4444" /><stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="badge badge-dark">
            <span className="badge-tag">LIVE</span>
            <span className="badge-text" style={{ color: '#e2e8f0' }}>SevaSetu 1.0 is now live</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1 className="hero-title hero-title-dark">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.6 + i * 0.08, ease: [0.21, 0.45, 0.32, 0.9] }}
              style={{ display: 'inline-block', marginRight: '0.28em' }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="hero-subtitle hero-subtitle-dark"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
        >
          Build efficient resource allocation workflows. Connect volunteers with NGOs and manage disaster relief operations with precision across your entire network.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}
        >
          <motion.button
            className="btn btn-hero-primary"
            whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(245,158,11,0.5)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { window.location.href = 'http://localhost:5174/'; }}
          >
            Get the Volunteer App
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </motion.button>
          <motion.button
            className="btn btn-hero-secondary"
            whileHover={{ scale: 1.04, background: 'rgba(255,255,255,0.15)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { window.location.href = 'http://localhost:5173/'; }}
          >
            Admin Dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </motion.button>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className="hero-stats-row"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.9 }}
        >
          {[
            { value: stats.active_volunteers, label: 'Active Volunteers', icon: '👥', color: '#3b82f6' },
            { value: stats.active_campaigns, label: 'Active Campaigns', icon: '📍', color: '#10b981' },
            { value: `${stats.task_completion}%`, label: 'Task Completion', icon: '✅', color: '#8b5cf6' },
            { value: `${stats.user_rating}★`, label: 'User Rating', icon: '⭐', color: '#f59e0b' },
          ].map((s, i) => (
            <motion.div
              key={i}
              className="hero-stat-card"
              whileHover={{ scale: 1.06, y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="stat-icon">{s.icon}</span>
              <strong className="stat-value" style={{ color: s.color }}>{s.value}</strong>
              <span className="stat-label">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="scroll-indicator"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
        >
          <div className="scroll-dot" />
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

export default HeroHeader;
