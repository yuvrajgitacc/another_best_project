import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import HeroHeader from './components/HeroHeader'
import LogoCloud from './components/LogoCloud'
import HowItWorks from './components/HowItWorks'
import FeaturesList from './components/FeaturesList'
import DetailedShowcase from './components/DetailedShowcase'
import Pricing from './components/Pricing'
import Testimonials from './components/Testimonials'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

function App() {
  const [pendingScroll, setPendingScroll] = useState(null);

  useEffect(() => {
    if (pendingScroll) {
      const el = document.getElementById(pendingScroll);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
          setPendingScroll(null);
        }, 100);
      }
    }
  }, [pendingScroll]);

  const handleNavigate = (targetView) => {
    const sectionElements = {
      'pricing': 'pricing',
      'features': 'features-section',
      'how-it-works': 'process-section'
    };

    if (targetView === 'landing' || targetView === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sectionElements[targetView]) {
      const el = document.getElementById(sectionElements[targetView]);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
  };

  return (
    <div style={{ padding: '0', backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Fixed navbar floats above everything */}
      <Navbar onNavigate={handleNavigate} />
      <main>
        {/* Hero fills full viewport — navbar is fixed so no offset needed */}
        <HeroHeader />
        <LogoCloud />
        <HowItWorks />
        <FeaturesList />
        <DetailedShowcase onNavigate={handleNavigate} />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  )
}

export default App
