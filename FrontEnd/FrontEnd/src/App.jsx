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
import AuthPage from './components/AuthPage'
// import DemoSequence from './components/DemoSequence'
import FeaturesPage from './components/FeaturesPage'
import PricingPage from './components/PricingPage'
import DocumentationPage from './components/DocumentationPage'
import APIGeneration from './components/APIGeneration'

function App() {
  const [view, setView] = useState('landing');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [pendingScroll, setPendingScroll] = useState(null);

  useEffect(() => {
    if (view === 'landing' && pendingScroll) {
      const el = document.getElementById(pendingScroll);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
          setPendingScroll(null);
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [view, pendingScroll]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setView('checkout');
  };

  const handleNavigate = (targetView) => {
    const sectionElements = {
      'pricing': 'pricing',
      'features': 'features-section',
      'how-it-works': 'process-section'
    };

    if (targetView === 'landing') {
      if (view === 'landing') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setView('landing');
      }
      return;
    }

    if (sectionElements[targetView]) {
      if (view === 'landing') {
        const el = document.getElementById(sectionElements[targetView]);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        setPendingScroll(sectionElements[targetView]);
        setView('landing');
      }
      return;
    }
    
    setView(targetView);
  };

  if (window.location.search.includes('demo')) {
    return <DemoSequence onComplete={() => window.location.href = '/'} />
  }

  if (view === 'auth') {
    return <AuthPage onBack={() => setView('landing')} />;
  }

  if (view === 'features') {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <Navbar onSignIn={() => setView('auth')} onNavigate={handleNavigate} currentView={view} />
        <FeaturesPage onStart={() => setView('auth')} onNavigate={handleNavigate} />
      </div>
    );
  }

  if (view === 'pricing') {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <Navbar onSignIn={() => setView('auth')} onNavigate={handleNavigate} currentView={view} />
        <PricingPage onSelectPlan={handleSelectPlan} onNavigate={handleNavigate} />
      </div>
    );
  }

  if (view === 'documentation') {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <Navbar onSignIn={() => setView('auth')} onNavigate={handleNavigate} currentView={view} />
        <DocumentationPage onStart={() => setView('auth')} onNavigate={handleNavigate} />
      </div>
    );
  }

  if (view === 'checkout') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Navbar onSignIn={() => setView('auth')} onNavigate={handleNavigate} currentView={view} />
        <APIGeneration 
          selectedPlan={selectedPlan} 
          onBack={() => handleNavigate('pricing')} 
          onGoToDashboard={() => handleNavigate('landing')} 
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '0', backgroundColor: 'white', minHeight: '100vh' }}>
      <Navbar onSignIn={() => setView('auth')} onNavigate={handleNavigate} currentView={view} />
      <main>
        <HeroHeader onStart={() => setView('auth')} />
        <LogoCloud />
        <HowItWorks />
        <FeaturesList />
        <DetailedShowcase />
        <Pricing onSelectPlan={handleSelectPlan} />
        <Testimonials />
        <FinalCTA onStart={() => setView('auth')} />
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  )
}

export default App
