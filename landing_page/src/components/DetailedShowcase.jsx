import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronRight, PlayCircle, Code, Users, Target } from 'lucide-react';
import './DetailedShowcase.css';

const SimulatedDashboard = () => {
  const volunteers = [
    {
      name: "Priya Sharma",
      role: "Medical Volunteer",
      score: "98",
      color: "#059669",
      skills: ["First Aid", "CPR", "Nursing"],
      initials: "PS"
    },
    {
      name: "Rahul Verma",
      role: "Logistics Coordinator",
      score: "95",
      color: "#3b82f6",
      skills: ["Transport", "Planning", "Supply"],
      initials: "RV"
    },
    {
      name: "Anita Desai",
      role: "Community Organizer",
      score: "92",
      color: "#8b5cf6",
      skills: ["Teaching", "Outreach", "Hindi"],
      initials: "AD"
    },
    {
      name: "Vikram Singh",
      role: "Field Engineer",
      score: "89",
      color: "#059669",
      skills: ["Civil", "Water", "Solar"],
      initials: "VS"
    },
  ];

  return (
    <div className="simulated-dashboard">
      <div className="dash-top-nav">
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
        </div>
        <div className="dash-search" />
      </div>
      <div className="candidate-list">
        {volunteers.map((c, i) => (
          <motion.div
            key={i}
            className="candidate-item"
            animate={{
              y: [0, -80],
              opacity: [1, 1, 1, 0]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay: i * 1,
              ease: "linear"
            }}
            whileHover={{
              scale: 1.02,
              borderColor: c.color,
              boxShadow: `0 8px 24px ${c.color}15`,
              transition: { duration: 0.2 }
            }}
          >
            <div className="avatar-circle" style={{ border: `2px solid ${c.color}30` }}>
              {c.initials}
            </div>
            <div className="candidate-info">
              <h4>{c.name}</h4>
              <p>{c.role}</p>
              <div className="skill-tags">
                {c.skills.map((s, si) => (
                  <span key={si} className="skill">{s}</span>
                ))}
              </div>
            </div>
            <div className="score-cell">
              <div className="score-val" style={{ color: c.color }}>{c.score}%</div>
              <div className="score-label">Match</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const DetailedShowcase = ({ onNavigate }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const x = useTransform(scrollYProgress, [0, 0.45, 0.65, 1], ["0vw", "0vw", "-100vw", "-100vw"]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.5, 0.6], [1, 1, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.35, 0.45, 1], [0, 1, 1]);

  return (
    <div className="showcase-horizontal-wrapper" ref={containerRef}>
      <div className="sticky-container">
        <motion.div className="horizontal-track" style={{ x }}>
          {/* SLIDE 1: VOLUNTEERS */}
          <div className="showcase-slide">
            <motion.div className="showcase-section-inner" style={{ opacity: opacity1 }}>
              <div className="showcase-content">
                <span className="showcase-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={14} /> Volunteer App
                </span>
                <h2 className="showcase-title">Empower every volunteer.</h2>
                <p className="showcase-desc">
                  Our volunteer app lets individuals find campaigns near them, register instantly, and track their contributions. Simple, fast, and impactful.
                </p>
                <div className="showcase-actions">
                  <button className="btn btn-primary" onClick={() => { window.location.href = '/SevaSetu.apk'; }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Install App
                  </button>
                  <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Learn More <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="showcase-visual">
                <div className="dotted-grid" />
                <motion.div
                  className="visual-card"
                  whileHover={{ scale: 1.02, rotate: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="app-preview">
                    <div className="app-header">
                      <div className="app-status-bar">
                        <span style={{fontSize:'11px', color:'#666'}}>9:41</span>
                        <div style={{display:'flex', gap:'4px'}}>
                          <div style={{width:14, height:10, borderRadius:2, border:'1.5px solid #666'}}/>
                        </div>
                      </div>
                      <h3 style={{margin:'16px 0 8px', fontSize:'20px', color:'#1a1c1e'}}>Nearby Campaigns</h3>
                      <p style={{margin:0, fontSize:'13px', color:'#6b6375'}}>3 campaigns need your help</p>
                    </div>
                    <div className="app-cards">
                      {[
                        { title: "Flood Relief - Mumbai", urgency: "High", color: "#ef4444", volunteers: "24/50" },
                        { title: "Food Distribution - Delhi", urgency: "Medium", color: "#f59e0b", volunteers: "18/30" },
                        { title: "Education Drive - Pune", urgency: "Low", color: "#059669", volunteers: "12/20" },
                      ].map((c, i) => (
                        <div key={i} className="app-campaign-card">
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <strong style={{fontSize:'13px', color:'#1a1c1e'}}>{c.title}</strong>
                            <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'100px', background:`${c.color}15`, color:c.color, fontWeight:600}}>{c.urgency}</span>
                          </div>
                          <div style={{fontSize:'11px', color:'#6b6375', marginTop:'6px'}}>Volunteers: {c.volunteers}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* SLIDE 2: DASHBOARD */}
          <div className="showcase-slide">
            <motion.div className="showcase-section-inner reverse" style={{ opacity: opacity2 }}>
              <div className="showcase-content">
                <span className="showcase-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={14} /> Admin Dashboard
                </span>
                <h2 className="showcase-title">Manage operations at a glance.</h2>
                <p className="showcase-desc">
                  Create campaigns, assign volunteers, track resources and generate impact reports. Full control over your NGO's operations.
                </p>
                <div className="showcase-actions">
                  <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => { window.location.href = '/admin/'; }}>
                    Open Dashboard
                  </button>
                </div>
              </div>

              <div className="showcase-visual">
                <div className="dotted-grid" />
                <motion.div
                  className="visual-card"
                  whileHover={{ scale: 1.02, rotate: -1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <SimulatedDashboard />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DetailedShowcase;
