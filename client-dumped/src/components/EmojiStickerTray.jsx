import React, { useState, useEffect } from 'react';

const EMOJI_GROUPS = [
  {
    name: 'Top Reactions',
    emojis: ['❤️', '👍', '🔥', '😂', '😮', '😢', '👏', '🚀', '💯', '🎉', '⚡', '🔒']
  },
  {
    name: 'Smileys & People',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '🥹', '😅', '🤣', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜',
      '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞'
    ]
  },
  {
    name: 'Gestures & Hearts',
    emojis: ['👋', '🙌', '🤝', '✌️', '🤞', '🤟', '🤙', '👈', '👉', '👆', '👇', '✋', '💖', '💘', '💜', '💙', '💚', '🖤']
  },
  {
    name: 'Privacy & Crypto',
    emojis: ['🔒', '🔓', '🛡️', '👁️', '⚡', '🕶️', '💻', '🕵️', '🗝️', '📡', '🛰️', '☣️', '⚠️', '🌐', '📦', '⏳', '💾', '🪙']
  }
];

const PRESET_STICKERS = [
  { id: 'stk_1', title: 'SERVER-BLIND', icon: '🕶️', subtitle: 'Zero Plaintext Wire', bg: 'linear-gradient(135deg, #191917, #3a3a35)' },
  { id: 'stk_2', title: 'ENCRYPTED', icon: '🔒', subtitle: 'Double Ratchet Active', bg: 'linear-gradient(135deg, #26262a, #41413c)' },
  { id: 'stk_3', title: 'VERIFIED', icon: '🛡️', subtitle: 'Safety Key Confirmed', bg: 'linear-gradient(135deg, #1f1f1c, #383833)' },
  { id: 'stk_4', title: 'TOP SECRET', icon: '👁️', subtitle: 'Classified E2EE', bg: 'linear-gradient(135deg, #2a2a26, #45453f)' },
  { id: 'stk_5', title: 'AUTO-BURN', icon: '🔥', subtitle: 'Self-Destruct Queue', bg: 'linear-gradient(135deg, #232320, #3d3d38)' },
  { id: 'stk_6', title: 'TO THE MOON', icon: '🚀', subtitle: 'Node In Orbit', bg: 'linear-gradient(135deg, #303030, #4d4d47)' },
  { id: 'stk_7', title: 'CONFIRMED', icon: '💯', subtitle: 'All Checks Green', bg: 'linear-gradient(135deg, #2c2c28, #4a4a44)' },
  { id: 'stk_8', title: 'HACKER CAT', icon: '🐱', subtitle: 'Terminal Mode', bg: 'linear-gradient(135deg, #1c1c19, #353530)' }
];

export default function EmojiStickerTray({
  isOpen,
  onClose,
  onSelectEmoji,
  onSendSticker,
  title = null,
  hideStickers = false,
  positionStyle = null
}) {
  const [activeTab, setActiveTab] = useState('emojis');
  const [customStickers, setCustomStickers] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('knots_custom_stickers_v1');
      if (stored) setCustomStickers(JSON.parse(stored));
    } catch {}
  }, []);

  const saveCustomStickers = (list) => {
    setCustomStickers(list);
    try {
      localStorage.setItem('knots_custom_stickers_v1', JSON.stringify(list));
    } catch {}
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Sticker image must be under 2MB.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const newSticker = {
        id: 'cust_' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, '').slice(0, 14),
        image: reader.result,
        isCustom: true
      };
      saveCustomStickers([...customStickers, newSticker]);
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  const handleDeleteCustomSticker = (e, id) => {
    e.stopPropagation();
    saveCustomStickers(customStickers.filter(s => s.id !== id));
  };

  if (!isOpen) return null;

  const defaultPosition = {
    position: 'absolute',
    bottom: '76px',
    right: '16px',
    zIndex: 100
  };

  return (
    <div
      style={{
        ...defaultPosition,
        ...(positionStyle || {}),
        width: '330px',
        maxHeight: '380px'
      }}
      className="bg-[#ffffff]/95 backdrop-blur-2xl border border-[#191917]/15 rounded-[4px] flex flex-col overflow-hidden animate-scaleUp text-[#191917]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3 border-b border-[#191917]/15 flex items-center justify-between bg-[#191917]/[0.02]">
        {hideStickers ? (
          <div className="text-xs font-semibold text-[#191917] flex items-center gap-1.5">
            <span>😊</span>
            <span>{title || 'Choose Reaction'}</span>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('emojis')}
              className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-all ${
                activeTab === 'emojis'
                  ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
                  : 'bg-[#191917]/5 text-[#6c6c64] hover:text-[#191917]'
              }`}
            >
              Emojis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stickers')}
              className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'stickers'
                  ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
                  : 'bg-[#191917]/5 text-[#6c6c64] hover:text-[#191917]'
              }`}
            >
              <span>Stickers</span>
              {customStickers.length > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-[#191917] text-[#f6f5f2] text-[9px] flex items-center justify-center font-bold">
                  {customStickers.length}
                </span>
              )}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[#a9a99f] hover:text-[#191917] p-1"
        >
          ✕
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {activeTab === 'emojis' ? (
          <div className="flex flex-col gap-3.5">
            {EMOJI_GROUPS.map((group, idx) => (
              <div key={idx}>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#a9a99f] mb-1.5">
                  {group.name}
                </div>
                <div className="grid grid-cols-6 gap-1 text-center">
                  {group.emojis.map((emoji, eIdx) => (
                    <button
                      key={eIdx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="p-1.5 text-xl rounded-[3px] hover:bg-[#191917]/8 hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Stickers Tab */
          <div>
            {/* Custom Sticker Upload Action */}
            <div className="mb-3">
              <label className="flex items-center justify-center gap-2 p-2 bg-[#191917]/5 border border-dashed border-[#191917]/25 rounded-[4px] text-xs font-medium text-[#191917] cursor-pointer hover:bg-[#191917]/8 transition-colors">
                <span>➕</span>
                <span>{uploading ? 'Processing Image...' : 'Add Custom Sticker'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Custom Uploaded Stickers Section */}
            {customStickers.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#a9a99f] mb-1.5">
                  My Custom Stickers
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {customStickers.map((stk) => (
                    <div
                      key={stk.id}
                      onClick={() => onSendSticker(stk)}
                      className="relative bg-[#191917]/40 border border-[#191917]/15 rounded-[4px] p-2 flex flex-col items-center cursor-pointer hover:scale-105 hover:border-[#191917]/25 transition-all"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomSticker(e, stk.id)}
                        className="absolute top-1 right-1 bg-[#191917]/80 text-[#f6f5f2] rounded-full w-4 h-4 text-[9px] flex items-center justify-center"
                      >
                        ✕
                      </button>

                      <img
                        src={stk.image}
                        alt={stk.title}
                        className="w-12 h-12 object-contain rounded"
                      />
                      <span className="text-[10px] text-[#6c6c64] truncate mt-1 max-w-[70px]">
                        {stk.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preset Pack Stickers */}
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#a9a99f] mb-1.5">
              Preset Cyber Pack
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_STICKERS.map((stk) => (
                <div
                  key={stk.id}
                  onClick={() => onSendSticker(stk)}
                  style={{ background: stk.bg }}
                  className="rounded-[4px] p-2.5 text-center cursor-pointer border border-[#191917]/15 hover:border-[#191917]/30 transition-all"
                >
                  <div className="text-2xl mb-0.5">{stk.icon}</div>
                  <div className="text-[11px] font-bold text-[#f6f5f2] tracking-tight">
                    {stk.title}
                  </div>
                  <div className="text-[9px] text-[#f6f5f2]">
                    {stk.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
