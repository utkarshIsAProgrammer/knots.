import React from 'react';

// Generates an elegant gradient based on string hash
function getAvatarGradient(str = '') {
  const gradients = [
    'linear-gradient(135deg, rgba(25, 25, 23, 0.16) 0%, rgba(25, 25, 23, 0.04) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.20) 0%, rgba(25, 25, 23, 0.06) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.12) 0%, rgba(25, 25, 23, 0.02) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.24) 0%, rgba(25, 25, 23, 0.08) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.14) 0%, rgba(25, 25, 23, 0.05) 100%)',
    'linear-gradient(135deg, rgba(25, 25, 23, 0.18) 0%, rgba(25, 25, 23, 0.03) 100%)'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export default function ContactItem({
  contact,
  isSelected,
  onSelect,
  lastMessage,
  onToggleMute,
  onDeleteEntireChat
}) {
  const initials = (contact.alias || contact.knot_id || 'U').slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onSelect}
      className={`p-3 mx-2 my-1 rounded-[4px] cursor-pointer transition-all flex items-center gap-3 border group ${
        isSelected
          ? 'bg-[#191917]/8 border-[#191917]/25'
          : 'bg-transparent border-transparent hover:bg-[#191917]/5 hover:border-[#191917]/15'
      }`}
    >
      {/* Contact Avatar */}
      <div
        className="w-11 h-11 rounded-[4px] flex items-center justify-center font-bold text-sm text-[#191917] shrink-0 relative border border-[#191917]/20"
        style={{ background: getAvatarGradient(contact.knot_id) }}
      >
        {initials}
        <span className="w-2.5 h-2.5 rounded-full bg-[#191917] border-2 border-[#ffffff] absolute -bottom-0.5 -right-0.5"></span>
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-sm font-semibold text-[#191917] truncate flex items-center gap-1.5">
            <span className="truncate">{contact.alias || contact.knot_id}</span>
            {contact.muted && (
              <iconify-icon icon="solar:bell-off-bold-duotone" class="text-xs text-[#a9a99f] shrink-0"></iconify-icon>
            )}
            <iconify-icon icon="solar:lock-keyhole-minimalistic-bold-duotone" class="text-xs text-[#191917] shrink-0"></iconify-icon>
          </div>

          <span className="text-[11px] font-mono text-[#6c6c64] shrink-0 ml-2">
            {lastMessage?.timestamp || 'Active'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-[#3f3f3a] truncate max-w-[190px]">
            {lastMessage?.type === 'sticker'
              ? '🎨 Sticker'
              : (lastMessage?.plaintext || 'Tap to start chatting')}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {contact.unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#191917] text-[#f6f5f2] text-[10px] font-bold">
                {contact.unreadCount}
              </span>
            )}

            {/* Quick delete / mute hover actions */}
            <div className="hidden group-hover:flex items-center gap-1">
              {onToggleMute && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute(contact.knot_id);
                  }}
                  className="p-1 text-[#6c6c64] hover:text-[#191917] rounded transition-colors"
                >
                  <iconify-icon icon={contact.muted ? "solar:bell-off-bold-duotone" : "solar:bell-bold-duotone"} class="text-xs"></iconify-icon>
                </button>
              )}
              {onDeleteEntireChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete entire chat with ${contact.alias || contact.knot_id}? All messages will be deleted.`)) {
                      onDeleteEntireChat(contact.knot_id);
                    }
                  }}
                  className="p-1 text-[#6c6c64] hover:text-[#191917] rounded transition-colors"
                >
                  <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-xs"></iconify-icon>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
