import React from 'react';
import { motion } from 'framer-motion';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import './FeaturesPage.css';

const detailedFeatures = [
  {
    title: "AI Resume Parsing",
    description: "Instantly extract relevant data from resumes using advanced AI algorithms. We parse tens of thousands of data points to categorize skills, experience, and education with 99.8% precision.",
    iconSVG: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>,
    color: "#3b82f6"
  },
  {
    title: "Candidate Matching",
    description: "Automatically match candidates to job descriptions with high accuracy. Our proprietary engine evaluates candidates not just on keywords, but on contextual capability.",
    iconSVG: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 1 12 11z"/><path d="M18 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 0 18 11z"/><circle cx="12" cy="5" r="3"/></svg>,
    color: "#059669"
  },
  {
    title: "Session Management",
    description: "Create and manage multiple recruitment sessions with ease. Organize hiring pipelines per role, department, or client without mixing up incoming candidate data.",
    iconSVG: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
    color: "#8b5cf6"
  },
  {
    title: "Developer API",
    description: "Powerful, RESTful API for integrating AI resume screening into your own workflows. Build specialized onboarding flows or connect directly to your existing ATS.",
    iconSVG: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    color: "#1a1c1e"
  },
  {
    title: "Dashboard Analytics",
    description: "Visualize candidate metrics and recruitment performance with insightful analytics. Track your standard metrics from time-to-hire down to precise skill availability.",
    iconSVG: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    color: "#f59e0b"
  },
  {
    title: "Export Candidates",
    description: "Effortlessly export shortlisted candidates in multiple formats for smooth collaboration. Download to CSV, JSON, or direct PDF reports formatted for hiring managers.",
    iconSVG: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    color: "#ec4899"
  }
];

const FeaturesPage = ({ onStart, onNavigate }) => {
  return (
    <main>
      <section className="features-page">
        <motion.div 
          className="fp-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="fp-badge">Advanced Capabilities</div>
          <h1 className="fp-title">Recruitment, powered by logic.</h1>
          <p className="fp-subtitle">
            Vishleshan Lite offers an advanced suite of features designed for precision AI-powered screening and seamless developer integration.
          </p>
        </motion.div>

        <div className="fp-sections">
          {detailedFeatures.map((feature, idx) => (
            <motion.div 
              key={idx} 
              className={`fp-section ${idx % 2 !== 0 ? 'reversed' : ''}`}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <div className="fp-content">
                <div className="fp-icon-wrap" style={{ background: `${feature.color}15`, color: feature.color }}>
                  {feature.iconSVG}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>

              <div className="fp-visual">
                <motion.div 
                  className="fp-visual-inner"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="fp-skeleton w-full" style={{ marginBottom: '20px' }}></div>
                  <div className="fp-skeleton w-3/4"></div>
                  <div className="fp-skeleton w-1/2"></div>
                  <div className="fp-skeleton w-full" style={{ marginTop: 'auto', background: `${feature.color}30` }}></div>
                </motion.div>
                
                {/* Decorative background glow */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '200px', height: '200px', background: feature.color, filter: 'blur(80px)', opacity: 0.15, transform: 'translate(-50%, -50%)', zIndex: 0 }}></div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <FinalCTA onStart={onStart} />
      <Footer onNavigate={onNavigate} />
    </main>
  );
};

export default FeaturesPage;
