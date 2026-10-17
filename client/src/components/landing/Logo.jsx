import React from 'react';

/**
 * The Knots. mark — two interlocking arcs closed by a single point.
 * `tone="paper"` inverts it for the dark fullscreen menu.
 */
export default function Logo({ tone = 'ink', showWord = true, className = '' }) {
  const stroke = tone === 'paper' ? 'var(--on-dark)' : 'currentColor';

  return (
    <span className={`kn-logo ${className}`.trim()}>
      <svg className="kn-logo__mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M9 16c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M23 16c0 3.866-3.134 7-7 7s-7-3.134-7-7 3.134-7 7-7"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.45"
        />
        <circle cx="16" cy="16" r="1.9" fill={stroke} />
      </svg>
      {showWord ? <span className="kn-logo__word">Knots.</span> : null}
    </span>
  );
}
