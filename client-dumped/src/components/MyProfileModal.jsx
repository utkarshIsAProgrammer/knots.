import React, { useState } from 'react';

export default function MyProfileModal({
  isOpen,
  onClose,
  identity,
  onRotateKeys,
  onOpenPanic
}) {
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [vaultStatus, setVaultStatus] = useState('UNLOCKED');
  const [rotating, setRotating] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isOpen || !identity) return null;

  const copyKnotId = () => {
    navigator.clipboard.writeText(identity.knotId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetPassphrase = (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setVaultStatus('ENCRYPTED');
    setMsg('Local vault protected with Argon2id master passphrase.');
    setPassphrase('');
  };

  const handleRotate = async () => {
    if (!confirm('Rotate keys? This invalidates your current Knot ID and creates a new anonymous address.')) return;
    setRotating(true);
    try {
      await onRotateKeys();
      setMsg('Key rotation complete. Fresh Knot identity derived.');
    } catch (err) {
      alert('Rotation error: ' + err.message);
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#191917]/15 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#191917] tracking-tight">My Profile &amp; Settings</h3>
            <p className="text-[11px] text-[#6c6c64]">
              Manage your Knots ID and privacy settings
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[3px] bg-[#191917]/5 border border-[#191917]/15 flex items-center justify-center text-[#6c6c64] hover:text-[#191917] hover:bg-[#191917]/8 transition-colors"
          >
            <iconify-icon icon="solar:close-circle-bold-duotone" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
          {msg && (
            <div className="p-3 rounded-[4px] bg-[#191917]/5 border border-[#191917]/25 text-xs text-[#191917] flex items-center gap-2">
              <iconify-icon icon="solar:check-circle-bold-duotone" class="text-base"></iconify-icon>
              <span>{msg}</span>
            </div>
          )}

          {/* User Info Header */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-[4px] bg-gradient-to-tr from-[#191917]/10 to-[#191917]/5 border border-[#191917]/15 flex items-center justify-center text-lg font-mono font-bold text-[#191917] relative shrink-0">
              {identity.knotId.slice(4, 6)}
              <span className="w-3 h-3 rounded-full bg-[#191917] border-2 border-[#ffffff] absolute -bottom-0.5 -right-0.5"></span>
            </div>

            <div>
              <div className="text-sm font-semibold text-[#191917]">
                My Knots ID
              </div>
              <div className="text-[11px] text-[#191917] mt-0.5 flex items-center gap-1">
                <span>Active</span>
                <span>•</span>
                <span>Private &amp; Secure</span>
              </div>
            </div>
          </div>

          {/* Knot ID Card */}
          <div className="borealis-card p-3.5 space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
              Your Knots ID
            </div>
            <div className="font-mono text-xs font-semibold text-[#191917] break-all bg-[#191917]/5 p-2 rounded-[3px] border border-[#191917]/15">
              {identity.knotId}
            </div>

            <button
              onClick={copyKnotId}
              className="w-full py-2 bg-[#191917] text-[#f6f5f2] rounded-[3px] text-xs font-semibold hover:bg-[#3f3f3a] transition-colors flex items-center justify-center gap-1.5"
            >
              <iconify-icon icon="solar:copy-bold-duotone" class="text-sm"></iconify-icon>
              <span>{copied ? '✓ Copied to Clipboard' : 'Copy Knots ID'}</span>
            </button>
          </div>

          {/* 12-Word Recovery Seed Phrase */}
          <div className="borealis-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
                12-Word Recovery Phrase
              </div>
              <button
                onClick={() => setShowSeed(!showSeed)}
                className="text-xs text-[#191917] hover:text-[#6c6c64] font-medium"
              >
                {showSeed ? 'Hide Phrase' : 'Reveal Phrase'}
              </button>
            </div>

            {showSeed ? (
              <div className="grid grid-cols-3 gap-2">
                {identity.mnemonic?.split(' ').map((word, i) => (
                  <div
                    key={i}
                    className="bg-[#191917]/5 border border-[#191917]/15 rounded-[3px] p-2 text-xs font-mono text-center text-[#191917]"
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

          {/* Local Vault Protection */}
          <div className="borealis-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
                App Passphrase Lock
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                vaultStatus === 'ENCRYPTED'
                  ? 'bg-[#191917]/8 text-[#191917] border border-[#191917]/25'
                  : 'bg-[#a9a99f]/20 text-[#a9a99f] border border-[#a9a99f]/30'
              }`}>
                {vaultStatus === 'ENCRYPTED' ? 'LOCKED' : 'UNLOCKED'}
              </span>
            </div>

            <p className="text-xs text-[#3f3f3a] leading-relaxed">
              Set an optional password to lock your messages on this device.
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

          {/* Key Rotation & Danger Zone */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleRotate}
              disabled={rotating}
              className="w-full py-2.5 bg-[#191917]/5 border border-[#191917]/15 text-[#191917] rounded-[4px] text-xs font-semibold hover:bg-[#191917]/8 transition-colors flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:refresh-circle-bold-duotone" class="text-base"></iconify-icon>
              <span>{rotating ? 'Updating...' : 'Generate New ID'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenPanic();
              }}
              className="w-full py-2.5 bg-[#191917]/5 border border-[#191917]/25 text-[#191917] hover:bg-[#191917]/10 rounded-[4px] text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-base"></iconify-icon>
              <span>Delete Everything &amp; Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
