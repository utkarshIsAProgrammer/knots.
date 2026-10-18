import React from 'react';

export default function Navbar({
  relayStatus,
  networkStats,
  onOpenDossier,
  onOpenPanic,
  onOpenVault,
  onToggleRadar,
  radarOpen
}) {
  const isOnline = relayStatus?.status === 'ok';

  return (
    <header className="app-header">
      {/* Brand & Classification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            background: 'var(--accent-mint)',
            boxShadow: '0 0 10px var(--accent-mint)'
          }}></div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.18em',
            color: '#fff'
          }}>
            KNOTS.
          </span>
        </div>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }}></div>

        <span className="badge badge-mint" style={{ letterSpacing: '0.08em' }}>
          SERVER-BLIND // ZERO-PII
        </span>
      </div>

      {/* Center Relay Status Ticker */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`status-dot ${isOnline ? 'active' : ''}`} style={{
            background: isOnline ? 'var(--accent-mint)' : 'var(--accent-crimson)'
          }}></span>
          <span style={{ color: isOnline ? 'var(--text-primary)' : 'var(--accent-crimson)', fontWeight: 600 }}>
            {isOnline ? 'RELAY MESH ONLINE' : 'DISCONNECTED'}
          </span>
        </div>

        <span>•</span>

        <span>PEERS: <strong style={{ color: 'var(--accent-cyan)' }}>{networkStats?.nodes_active || 1}</strong></span>

        <span>•</span>

        <span>QUEUE: <strong style={{ color: 'var(--text-primary)' }}>{networkStats?.queue_depth || 0}</strong></span>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onToggleRadar}
          className={`btn-outline ${radarOpen ? 'btn-cyan' : ''}`}
          style={{ padding: '6px 11px', fontSize: '0.72rem' }}
        >
          <span>DISCOVER</span>
          <span style={{ fontSize: '0.65rem' }}>{radarOpen ? '▼' : '▲'}</span>
        </button>

        <button
          onClick={onOpenDossier}
          className="btn-outline"
          style={{ padding: '6px 11px', fontSize: '0.72rem' }}
        >
          PRIVACY
        </button>

        <button
          onClick={onOpenVault}
          className="btn-outline"
          style={{ padding: '6px 11px', fontSize: '0.72rem' }}
        >
          SETTINGS
        </button>

        <button
          onClick={onOpenPanic}
          className="btn-danger"
          style={{ padding: '6px 12px', fontSize: '0.72rem' }}
        >
          RESET
        </button>
      </div>
    </header>
  );
}
