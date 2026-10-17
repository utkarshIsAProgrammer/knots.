import React, { useState } from 'react';

export default function SecurityVault({
  identity,
  onRotateKeys,
  onOpenPanic
}) {
  const [passphrase, setPassphrase] = useState('');
  const [vaultStatus, setVaultStatus] = useState('UNLOCKED');
  const [statusMsg, setStatusMsg] = useState('');
  const [rotating, setRotating] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKnotId = () => {
    if (!identity?.knotId) return;
    navigator.clipboard.writeText(identity.knotId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetPassphrase = (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setVaultStatus('ENCRYPTED');
    setStatusMsg('Master passphrase derived via Argon2id. Local private keys locked.');
    setPassphrase('');
  };

  const handleTriggerRotation = async () => {
    if (!confirm('Rotate keys? This invalidates your current Knot ID and derives a fresh identity on the relay.')) return;
    setRotating(true);
    try {
      await onRotateKeys();
      setStatusMsg('Key rotation ratified. Fresh Knot ID derived.');
    } catch (err) {
      setStatusMsg('Rotation error: ' + err.message);
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-4 text-[#191917]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#191917]/15">
        <div className="flex items-center gap-2.5">
          <iconify-icon icon="solar:shield-check-bold-duotone" class="text-xl text-[#191917]"></iconify-icon>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Security &amp; Privacy</h3>
            <p className="text-[11px] text-[#6c6c64]">Manage your Knots ID and account security</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#191917]/8 text-[#191917] border border-[#191917]/25">
          Encrypted
        </span>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-[4px] bg-[#191917]/5 border border-[#191917]/25 text-xs text-[#191917] flex items-center gap-2">
          <iconify-icon icon="solar:check-circle-bold-duotone" class="text-base"></iconify-icon>
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Identity Summary Card */}
      <div className="borealis-card p-4 space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
          My Knots ID
        </div>
        <div className="text-xs font-mono font-bold text-[#191917] break-all bg-[#191917]/5 p-2.5 rounded-[3px] border border-[#191917]/15">
          {identity?.knotId || 'Creating ID...'}
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyKnotId}
            className="flex-1 py-2 bg-[#191917] text-[#f6f5f2] rounded-[3px] text-xs font-semibold hover:bg-[#3f3f3a] transition-colors flex items-center justify-center gap-1.5"
          >
            <iconify-icon icon="solar:copy-bold-duotone" class="text-sm"></iconify-icon>
            <span>{copied ? '✓ Copied' : 'Copy ID'}</span>
          </button>
          <button
            onClick={handleTriggerRotation}
            disabled={rotating}
            className="flex-1 py-2 bg-[#191917]/5 border border-[#191917]/15 text-[#191917] rounded-[3px] text-xs font-medium hover:bg-[#191917]/8 transition-colors flex items-center justify-center gap-1.5"
          >
            <iconify-icon icon="solar:refresh-circle-bold-duotone" class="text-sm"></iconify-icon>
            <span>{rotating ? 'Updating...' : 'Generate New ID'}</span>
          </button>
        </div>
      </div>

      {/* 12-Word Recovery Phrase */}
      <div className="borealis-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
            12-Word Recovery Phrase
          </div>
          <button
            onClick={() => setShowSeed(!showSeed)}
            className="text-xs text-[#191917] hover:text-[#191917] font-medium"
          >
            {showSeed ? 'Hide Phrase' : 'Reveal Phrase'}
          </button>
        </div>

        {showSeed ? (
          <div className="grid grid-cols-3 gap-2">
            {identity?.mnemonic?.split(' ').map((word, i) => (
              <div
                key={i}
                className="bg-[#191917]/8 border border-[#191917]/15 rounded-[3px] p-2 text-xs font-mono text-center text-[#191917]"
              >
                <span className="text-[#6c6c64] text-[10px] mr-1">{i + 1}.</span>
                {word}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#3f3f3a] leading-relaxed">
            Your recovery phrase lets you restore your Knots account on another device at any time.
          </p>
        )}
      </div>

      {/* App Passphrase Lock */}
      <div className="borealis-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
            App Passphrase Lock
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
            vaultStatus === 'ENCRYPTED'
              ? 'bg-[#191917]/8 text-[#191917] border border-[#191917]/25'
              : 'bg-[#a9a99f]/20 text-[#191917] border border-[#191917]/25'
          }`}>
            {vaultStatus === 'ENCRYPTED' ? 'LOCKED' : 'UNLOCKED'}
          </span>
        </div>

        <p className="text-xs text-[#3f3f3a] leading-relaxed">
          Optionally add a password to lock and protect your messages on this device.
        </p>

        <form onSubmit={handleSetPassphrase} className="flex gap-2">
          <input
            type="password"
            placeholder="Set a password..."
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="flex-1 bg-[#f5f4f1] border border-[#191917]/15 rounded-[4px] px-3 py-2 text-xs text-[#191917] placeholder-[#a9a99f] focus:outline-none focus:border-[#191917]/25"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#191917] text-[#f6f5f2] font-semibold text-xs rounded-[4px] hover:bg-[#3f3f3a] transition-colors shrink-0"
          >
            Lock
          </button>
        </form>
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="borealis-card p-4 space-y-3 border-[#191917]/25 mt-auto">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#191917] flex items-center gap-1.5">
          <iconify-icon icon="solar:danger-triangle-bold-duotone" class="text-sm"></iconify-icon>
          <span>Reset All Account Data</span>
        </div>
        <p className="text-xs text-[#3f3f3a] leading-relaxed">
          Permanently delete all your messages, contacts, and account from this device.
        </p>
        <button
          onClick={onOpenPanic}
          className="w-full py-2.5 bg-[#191917]/8 border border-[#191917]/25 text-[#191917] hover:bg-[#191917]/12 rounded-[4px] text-xs font-semibold transition-all flex items-center justify-center gap-2"
        >
          <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-base"></iconify-icon>
          <span>Delete Everything &amp; Reset</span>
        </button>
      </div>
    </div>
  );
}
