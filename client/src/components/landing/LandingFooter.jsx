import React from 'react';

export default function LandingFooter() {
  return (
    <footer className="kn-footer">
      <div className="kn-wrap">
        <div className="kn-footer__word">Knots.</div>

        <div className="kn-footer__cols">
          <div className="kn-footer__col">
            <h4>Product</h4>
            <a href="#capabilities">Capabilities</a>
            <a href="#principles">Principles</a>
            <a href="#process">Process</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="kn-footer__col">
            <h4>Threat model</h4>
            <span>Server-blind relay</span>
            <span>Zero-PII storage</span>
            <span>Forward secrecy</span>
            <span>Client-side keys</span>
          </div>

          <div className="kn-footer__col">
            <h4>Project</h4>
            <a href="#about">About</a>
            <a href="#notes">Field notes</a>
            <span>Open source</span>
          </div>
        </div>

        <div className="kn-footer__bottom">
          <span>© 2026 Knots. — server-blind by design</span>
          <span>No accounts · No email · Keys on device</span>
        </div>
      </div>
    </footer>
  );
}
