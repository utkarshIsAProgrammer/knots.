import React from 'react';
import Logo from './Logo.jsx';

const LINKS = [
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#principles', label: 'Principles' },
  { href: '#about', label: 'About' },
  { href: '#process', label: 'Process' },
  { href: '#notes', label: 'Field notes' },
  { href: '#faq', label: 'FAQ' }
];

export default function LandingMenu({ open, onClose, onEnter }) {
  return (
    <div className={`kn-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="kn-menu__inner">
        <div className="kn-menu__top">
          <Logo tone="paper" />
          <button type="button" className="kn-menu__close" onClick={onClose} aria-label="Close menu">
            <iconify-icon icon="solar:close-circle-linear"></iconify-icon>
          </button>
        </div>

        <nav className="kn-menu__nav">
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={onClose}
              style={{ transitionDelay: `${140 + i * 60}ms` }}
            >
              <span className="kn-menu__idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="kn-menu__label">{link.label}</span>
            </a>
          ))}
        </nav>

        <div className="kn-menu__foot">
          <button
            type="button"
            className="kn-btn kn-btn--ondark"
            onClick={() => {
              onClose();
              onEnter();
            }}
          >
            <span>Open Knots</span>
            <iconify-icon className="kn-btn__ic" icon="solar:arrow-right-up-linear"></iconify-icon>
          </button>
          <p className="kn-menu__note">No account · No email · Keys on device</p>
        </div>
      </div>
    </div>
  );
}
