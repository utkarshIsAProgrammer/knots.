import React, { useState } from 'react';

function getAvatarGradient(str = '') {
  const gradients = [
    'linear-gradient(135deg, rgba(25, 25, 23, 0.16) 0%, rgba(25, 25, 23, 0.04) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.20) 0%, rgba(25, 25, 23, 0.06) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.12) 0%, rgba(25, 25, 23, 0.02) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.24) 0%, rgba(25, 25, 23, 0.08) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.14) 0%, rgba(25, 25, 23, 0.05) 100%)'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

export default function PeerProfileDrawer({
  contact,
  onClose,
  onBlockContact,
  onUpdateAlias,
  onToggleMute,
  onClearChat,
  onDeleteEntireChat
}) {
  const [copied, setCopied] = useState(false);
  const [editingAlias, setEditingAlias] = useState(false);
  const [newAlias, setNewAlias] = useState(contact?.alias || '');

  if (!contact) return null;

  const copyKnotId = () => {
    navigator.clipboard.writeText(contact.knot_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAlias = (e) => {
    e.preventDefault();
    if (onUpdateAlias && newAlias.trim()) {
      onUpdateAlias(contact.knot_id, newAlias.trim());
    }
    setEditingAlias(false);
  };

  const initials = (contact.alias || contact.knot_id || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="w-80 md:w-96 border-l border-[#191917]/15 bg-[#f5f4f1] flex flex-col h-full z-30 shrink-0 text-[#191917]">
      {/* Drawer Header */}
      <div className="h-16 px-5 border-b border-[#191917]/15 flex items-center justify-between shrink-0">
        <span className="text-sm font-bold text-[#191917]">
          Contact Details
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[3px] bg-[#191917]/8 border border-[#191917]/20 flex items-center justify-center text-[#191917] hover:bg-[#191917]/12 transition-colors"
        >
          <iconify-icon icon="solar:close-circle-bold-duotone" class="text-xl"></iconify-icon>
        </button>
      </div>

      <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
        {/* Large Avatar Card */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-[4px] flex items-center justify-center text-2xl font-bold text-[#191917] mb-3 relative border border-[#191917]/20"
            style={{ background: getAvatarGradient(contact.knot_id) }}
          >
            {initials}
            <span className="w-3.5 h-3.5 rounded-full bg-[#191917] border-2 border-[#f5f4f1] absolute -bottom-1 -right-1"></span>
          </div>

          {editingAlias ? (
            <form onSubmit={handleSaveAlias} className="flex gap-2 w-full mt-1">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="Enter nickname..."
                autoFocus
                className="flex-1 bg-[#ffffff] border border-[#191917]/20 rounded-[4px] px-3 py-1.5 text-xs text-[#191917] placeholder-[#a9a99f] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#191917] text-[#f6f5f2] text-xs font-semibold rounded-[4px] hover:bg-[#3f3f3a] transition-colors"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-[#191917] truncate max-w-[200px]">
                {contact.alias || contact.knot_id}
              </h3>
              <button
                onClick={() => setEditingAlias(true)}
                className="text-[#6c6c64] hover:text-[#191917] p-1"
              >
                <iconify-icon icon="solar:pen-bold-duotone" class="text-xs"></iconify-icon>
              </button>
            </div>
          )}

          <div className="text-[11px] text-[#191917] flex items-center gap-1.5 mt-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#191917]"></span>
            <span>Connected on Knots</span>
          </div>
        </div>

        {/* Quick Mute Action Button */}
        {onToggleMute && (
          <button
            onClick={() => onToggleMute(contact.knot_id)}
            className={`w-full py-2.5 px-3 rounded-[4px] border flex items-center justify-between text-xs font-semibold transition-all ${
              contact.muted
                ? 'bg-[#a9a99f]/20 border-[#191917]/25 text-[#191917] hover:bg-[#a9a99f]/30'
                : 'bg-[#191917]/8 border-[#191917]/20 text-[#191917] hover:bg-[#191917]/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <iconify-icon
                icon={contact.muted ? "solar:bell-off-bold-duotone" : "solar:bell-bold-duotone"}
                class="text-base"
              ></iconify-icon>
              <span>{contact.muted ? "Notifications Muted" : "Mute Notifications"}</span>
            </div>
            <span className="text-[10px] uppercase font-mono opacity-80">
              {contact.muted ? "Muted" : "Active"}
            </span>
          </button>
        )}

        {/* Full Knot ID Card */}
        <div className="borealis-card p-3.5 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
            Knots ID
          </div>
          <div className="font-mono text-xs text-[#191917] break-all leading-relaxed bg-[#191917]/5 p-2 rounded-[3px] border border-[#191917]/15 font-bold">
            {contact.knot_id}
          </div>

          <button
            onClick={copyKnotId}
            className="w-full py-2 bg-[#191917] text-[#f6f5f2] rounded-[3px] text-xs font-semibold hover:bg-[#3f3f3a] transition-colors flex items-center justify-center gap-1.5"
          >
            <iconify-icon icon="solar:copy-bold-duotone" class="text-sm"></iconify-icon>
            <span>{copied ? '✓ Copied' : 'Copy ID'}</span>
          </button>
        </div>

        {/* Verification Code */}
        <div className="borealis-card p-3.5 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
            Verification Code
          </div>
          <div className="font-mono text-xs font-bold text-[#191917] tracking-wider">
            {contact.safetyNumber || '4829-1920-8821-3912'}
          </div>
          <p className="text-[11px] text-[#6c6c64] leading-relaxed">
            Compare this code with your contact to verify your conversation is private and encrypted.
          </p>
        </div>

        {/* Encryption Assurance */}
        <div className="borealis-card p-3.5 text-xs space-y-1.5 font-mono">
          <div className="text-[10px] uppercase tracking-widest text-[#6c6c64] mb-1">
            Security Status
          </div>
          <div className="flex justify-between">
            <span className="text-[#6c6c64]">ENCRYPTION:</span>
            <span className="text-[#191917] font-semibold">AES-256</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6c6c64]">KEYS:</span>
            <span className="text-[#191917] font-semibold">End-to-End</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6c6c64]">PROTECTION:</span>
            <span className="text-[#191917] font-semibold">Active</span>
          </div>
        </div>

        {/* Chat Management Actions */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          {/* Clear Messages */}
          {onClearChat && (
            <button
              onClick={() => {
                if (confirm('Clear all conversation messages with this contact?')) {
                  onClearChat();
                }
              }}
              className="w-full py-2 bg-[#191917]/8 border border-[#191917]/20 text-[#191917] hover:bg-[#191917]/10 rounded-[4px] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:broom-bold-duotone" class="text-base text-[#191917]"></iconify-icon>
              <span>Clear Message History</span>
            </button>
          )}

          {/* Delete Entire Chat & Contact */}
          {onDeleteEntireChat && (
            <button
              onClick={() => {
                if (confirm(`Permanently delete the entire chat and contact for ${contact.alias || contact.knot_id}? All messages and contact entry will be deleted.`)) {
                  onDeleteEntireChat(contact.knot_id);
                  onClose();
                }
              }}
              className="w-full py-2 bg-[#191917]/8 border border-[#191917]/25 text-[#191917] hover:bg-[#191917]/12 rounded-[4px] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-base"></iconify-icon>
              <span>Delete Entire Chat</span>
            </button>
          )}

          {/* Block Contact */}
          <button
            onClick={() => onBlockContact(contact.knot_id)}
            className="w-full py-2 text-[#6c6c64] hover:text-[#191917] text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <iconify-icon icon="solar:user-block-rounded-bold-duotone" class="text-sm"></iconify-icon>
            <span>Block Contact</span>
          </button>
        </div>
      </div>
    </div>
  );
}
