import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './APIGeneration.css';

const APIGeneration = ({ selectedPlan, onBack, onGoToDashboard }) => {
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const planDetails = {
    "Starter plan": {
      limit: "100 resumes/mo",
      sessions: "1 active session",
      rateLimit: "10 requests/min",
      features: ["Basic AI Analysis", "Standard Metadata extraction"]
    },
    "Business plan": {
      limit: "2,000 resumes/mo",
      sessions: "5 active sessions",
      rateLimit: "100 requests/min",
      features: ["Advanced Matching", "Deep Skills Extraction", "Bulk Processing"]
    },
    "Enterprise plan": {
      limit: "Custom/Unlimited",
      sessions: "Unlimited sessions",
      rateLimit: "1,000+ requests/min",
      features: ["Priority Processing", "Custom AI Models", "Dedicated Support"]
    }
  };

  const details = planDetails[selectedPlan] || planDetails["Starter plan"];

  useEffect(() => {
    generateKey();
  }, [selectedPlan]);

  const generateKey = () => {
    setIsGenerating(true);
    setApiKey('');
    setTimeout(() => {
      const prefix = selectedPlan === 'Enterprise plan' ? 'vsh_ent_' : selectedPlan === 'Business plan' ? 'vsh_biz_' : 'vsh_std_';
      const newKey = prefix + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setApiKey(newKey);
      setIsGenerating(false);
    }, 2000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="api-gen-container">
      <motion.div 
        className="api-gen-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
      >
        <div className="api-gen-header">
          <div className="badge-success">Purchase Successful</div>
          <h2>Welcome to the {selectedPlan}</h2>
          <p>Your workspace is ready. Generate your API key below to start integrating Vishleshan with your ATS or custom application.</p>
        </div>

        <div className="api-key-section">
          <label>X-API-KEY</label>
          <div className="api-input-wrapper">
            <input 
              type="text" 
              readOnly 
              value={apiKey ? apiKey : '••••••••••••••••••••••••••••••••'} 
              className={apiKey ? 'active' : ''}
            />
            {apiKey ? (
              <button 
                className={`copy-btn-proper ${copied ? 'copied' : ''}`} 
                onClick={copyToClipboard}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="checked"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="btn-content"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      <span>Copied</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="btn-content"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      <span>Copy</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            ) : (
              <div className="generating-indicator">
                <motion.div 
                   animate={{ rotate: 360 }} 
                   transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                   className="spinner-dark"
                />
                <span>Provisioning...</span>
              </div>
            )}
          </div>
          <p className="hint">Store this key securely. You won't be able to see it again.</p>
        </div>

        <div className="plan-usage-grid">
            <div className="usage-item">
                <span className="usage-label">Monthly Limit</span>
                <span className="usage-value">{details.limit}</span>
            </div>
            <div className="usage-item">
                <span className="usage-label">Concurrent Sessions</span>
                <span className="usage-value">{details.sessions}</span>
            </div>
            <div className="usage-item">
                <span className="usage-label">Rate Limit</span>
                <span className="usage-value">{details.rateLimit}</span>
            </div>
        </div>

        <div className="features-highlights">
            <h4>Plan Features</h4>
            <div className="tag-cloud">
                {details.features.map(f => <span key={f} className="feature-tag">{f}</span>)}
            </div>
        </div>

        <div className="api-gen-footer">
          <button className="secondary-btn" onClick={onBack}>Return to Billing</button>
          <button className="primary-btn" onClick={onGoToDashboard}>Go to Dashboard</button>
        </div>
      </motion.div>
    </div>
  );
};

export default APIGeneration;
