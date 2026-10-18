import React from 'react';
import Logo from './Logo.jsx';

const NAV = [
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#principles', label: 'Principles' },
  { href: '#process', label: 'Process' },
  { href: '#faq', label: 'FAQ' }
];

export default function LandingHeader({ scrolled, onEnter, onOpenMenu }) {
  return (
    <header className={`kn-header ${scrolled ? 'is-scrolled' : ''}`}>
      <a href="#top" aria-label="Knots. home">
        <Logo />
      </a>

      <nav className="kn-header__nav">
        {NAV.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="kn-header__actions">
        <span className="kn-header__status">Server-blind</span>

        <button type="button" className="kn-btn kn-btn--sm" onClick={onEnter}>
          <span>Open Knots</span>
          <iconify-icon className="kn-btn__ic" icon="solar:arrow-right-up-linear"></iconify-icon>
        </button>

        <button type="button" className="kn-menu-btn" onClick={onOpenMenu} aria-label="Open menu">
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}
