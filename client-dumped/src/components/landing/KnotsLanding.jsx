import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../../styles/landing.css';

import LandingHeader from './LandingHeader.jsx';
import LandingMenu from './LandingMenu.jsx';
import LandingHero from './LandingHero.jsx';
import LandingFooter from './LandingFooter.jsx';
import {
  StatementSection,
  CapabilitiesSection,
  QuoteSection,
  PrinciplesSection,
  AboutSection,
  ProcessSection,
  NotesSection,
  FaqSection,
  AcquireSection
} from './LandingSections.jsx';

const EDITORIAL_FAVICON = '/favicon-editorial.svg';

export default function KnotsLanding({ onEnter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef(null);

  // Show the editorial mark while the landing is the visible surface.
  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return undefined;
    const previous = link.getAttribute('href');
    link.setAttribute('href', EDITORIAL_FAVICON);
    return () => {
      if (previous) link.setAttribute('href', previous);
    };
  }, []);

  // Tighten the header once the hero is behind us.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const handleScroll = () => setScrolled(el.scrollTop > 24);
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Freeze the surface behind the fullscreen menu.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    el.style.overflowY = menuOpen ? 'hidden' : 'auto';
    return () => {
      el.style.overflowY = 'auto';
    };
  }, [menuOpen]);

  const handleEnter = useCallback(() => {
    setMenuOpen(false);
    onEnter?.();
  }, [onEnter]);

  return (
    <div className="kn" ref={rootRef}>
      <LandingHeader
        scrolled={scrolled}
        onEnter={handleEnter}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <main>
        <LandingHero onEnter={handleEnter} />
        <StatementSection />
        <CapabilitiesSection />
        <QuoteSection />
        <PrinciplesSection />
        <AboutSection />
        <ProcessSection />
        <NotesSection />
        <FaqSection />
        <AcquireSection onEnter={handleEnter} />
      </main>

      <LandingFooter />

      <LandingMenu open={menuOpen} onClose={() => setMenuOpen(false)} onEnter={handleEnter} />
    </div>
  );
}
