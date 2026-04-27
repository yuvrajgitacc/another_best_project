import React from 'react';
import { motion } from 'framer-motion';
import './FinalCTA.css';

const FinalCTA = () => {
  return (
    <section className="final-cta-section">
      <motion.div 
        className="cta-energy-blob"
        animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="cta-container">
        <motion.h2 
          className="cta-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.21, 0.45, 0.32, 0.9] }}
        >
          Start making impact today
        </motion.h2>
        
        <motion.p 
          className="cta-subtitle"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          Free to start. Install the volunteer app or set up your admin dashboard in minutes.
        </motion.p>

        <motion.div 
          className="cta-actions"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}
        >
          <motion.a 
            href="/SevaSetu.apk"
            download="SevaSetu.apk"
            className="btn-cta-primary"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)" }}
            whileTap={{ scale: 0.95 }}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Download Volunteer App
          </motion.a>
          <motion.button 
            className="btn-cta-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { window.open('/admin/', '_blank'); }}
          >
            Open Dashboard
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
