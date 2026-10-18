import React, { useState } from 'react';

export default function IdentityCard({ identity, onRotate, onOpenVault }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyKnotId = () => {
    if (!identity?.knotId) return;
    navigator.clipboard.writeText(identity.knotId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!identity) {
    return (
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          DERIVING CRYPTOGRAPHIC SEED...
        </span>
      </div>
    );
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface-elevated)',
      padding: '16px'
    }}>
      {/* Top Meta Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="status-dot active"></span>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            LOCAL IDENTITY
          </span>
        </div>

        <button
          onClick={copyKnotId}
          className="btn-outline"
          style={{ padding: '3px 8px', fontSize: '0.65rem' }}
        >
          {copied ? '✓ COPIED' : 'COPY KNOT ID'}
        </button>
      </div>

      {/* Primary Knot ID Typography */}
      <div
        onClick={copyKnotId}
        style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--border-subtle)',
          padding: '10px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.92rem',
          fontWeight: 700,
          color: 'var(--accent-mint)',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-mint-border)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
      >
        <span style={{ wordBreak: 'break-all' }}>{identity.knotId}</span>
      </div>

      {/* Safety Number & Fingerprint Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '8px',
        fontSize: '0.68rem',
        color: 'var(--text-dim)',
        fontFamily: 'var(--font-mono)'
      }}>
        <span>FINGERPRINT: {identity.fingerprint ? identity.fingerprint.slice(0, 12) + '...' : 'X25519'}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0',
            color: 'var(--accent-cyan)',
            fontSize: '0.68rem',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {expanded ? 'HIDE SEED' : 'VIEW SEED'}
        </button>
      </div>

      {/* Expandable Mnemonic Seed Drawer */}
      {expanded && (
        <div style={{
          marginTop: '12px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderLeft: '2px solid var(--accent-amber)',
          padding: '12px'
        }}>
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--accent-amber)',
            letterSpacing: '0.06em',
            marginBottom: '6px'
          }}>
            12-WORD MNEMONIC SEED:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#fff'
          }}>
            {identity.mnemonic?.split(' ').map((word, i) => (
              <div key={i} style={{ background: '#000', padding: '4px 6px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-dim)', marginRight: '4px' }}>{i + 1}.</span>
                {word}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
