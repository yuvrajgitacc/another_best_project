import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Pricing from './Pricing';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import './PricingPage.css';

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Absolutely. You can upgrade or downgrade your plan at any time from your billing dashboard. Changes take effect immediately, and we'll prorate any payments."
  },
  {
    q: "What defines an 'active session'?",
    a: "An active session represents a specific job opening or hiring pipeline. You can upload unlimited resumes to an active session, but you are limited by the total number of sessions your plan allows concurrently."
  },
  {
    q: "Do you offer custom enterprise pricing?",
    a: "Yes. If you process more than 10,000 resumes a month or require custom ATS integrations, please contact sales for a tailored enterprise package."
  },
  {
    q: "Is there a free trial for the Business plan?",
    a: "Yes, we offer a 14-day free trial on our Business plan so you can experience the advanced matching features and Developer API before committing."
  }
];

const featuresList = [
  { name: "Active Sessions", starter: "1", business: "5", enterprise: "Unlimited" },
  { name: "Resume Parsing Limits", starter: "100/mo", business: "2,000/mo", enterprise: "Custom" },
  { name: "Candidate Matching AI", starter: "Basic", business: "Advanced", enterprise: "Advanced + Custom Rules" },
  { name: "Developer API Access", starter: false, business: true, enterprise: true },
  { name: "Dashboard Analytics", starter: true, business: true, enterprise: true },
  { name: "Export to CSV/PDF", starter: false, business: true, enterprise: true },
  { name: "Priority Support", starter: false, business: false, enterprise: true },
];

const CheckIcon = ({ yes }) => (
  yes ? 
  <svg className="check-yes" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
  : 
  <svg className="check-no" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const PricingPage = ({ onStart, onNavigate }) => {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <main>
      <div className="pricing-page-wrapper">
        <motion.div 
          className="pp-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1>Transparent Pricing</h1>
          <p>Flexible plans tailored for solo recruiters, growing startups, and massive enterprise talent teams.</p>
        </motion.div>

        {/* Existing Pricing Component Embed */}
        <Pricing onSelectPlan={onSelectPlan} />

        {/* Comparison Table */}
        <section className="comparison-section">
          <motion.h2 
            className="comparison-title"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            Compare Features
          </motion.h2>
          <motion.div 
            style={{ overflowX: 'auto' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Features</th>
                  <th>Starter</th>
                  <th>Business</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featuresList.map((f, i) => (
                  <tr key={i}>
                    <td>{f.name}</td>
                    <td>{typeof f.starter === 'boolean' ? <CheckIcon yes={f.starter}/> : f.starter}</td>
                    <td>{typeof f.business === 'boolean' ? <CheckIcon yes={f.business}/> : f.business}</td>
                    <td>{typeof f.enterprise === 'boolean' ? <CheckIcon yes={f.enterprise}/> : f.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <motion.h2 
            className="faq-title"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <motion.div 
                key={i} 
                className="faq-item"
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <div className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </motion.div>
                </div>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div 
                      className="faq-answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <FinalCTA onStart={onStart} />
      <Footer onNavigate={onNavigate} />
    </main>
  );
};

export default PricingPage;
