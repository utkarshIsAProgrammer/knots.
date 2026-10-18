import React, { useState, useEffect, useRef } from 'react';
import EmojiStickerTray from './EmojiStickerTray.jsx';

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
  return gradients[Math.abs(hash) % gradients.length];
}

const QUICK_REACTIONS = ['❤️', '👍', '🔥', '😂', '😮', '😢'];

function getMenuCoordinates(x, y, isOutgoing) {
  const menuWidth = 280;
  const menuHeight = 260;
  const pad = 16;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;

  let posX = isOutgoing ? x - menuWidth + 30 : x - 30;
  posX = Math.max(pad, Math.min(posX, vw - menuWidth - pad));

  let posY;
  const spaceBelow = vh - y;
  const spaceAbove = y;

  if (spaceBelow >= menuHeight + 20) {
    posY = y + 8;
  } else if (spaceAbove >= menuHeight + 20) {
    posY = y - menuHeight - 8;
  } else {
    posY = Math.max(pad, Math.min(y - 120, vh - menuHeight - pad));
  }

  return { posX, posY };
}

export default function ChatView({
  activeContact,
  messages,
  onSendMessage,
  onReactMessage,
  onEditMessage,
  onDeleteMessage,
  onClearChat,
  onToggleMute,
  onDeleteEntireChat,
  identity,
  onOpenNewChat,
  onToggleDetails,
  detailsOpen,
  isPeerTyping,
  isPeerOnline,
  onSendTyping,
  onGoHome
}) {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [ttl, setTtl] = useState(86400); // default 24 hours
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [reactionPickerTargetId, setReactionPickerTargetId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Active burn ticker for real-time countdown display
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Swipe-to-reply gesture map: msgId -> offset (px)
  const [swipeOffsetMap, setSwipeOffsetMap] = useState({});
  const touchStartRef = useRef({ x: 0, y: 0, msgId: null, isSwiping: false, triggered: false });

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const textareaRef = useRef(null);
  const longPressTimerRef = useRef(null);

  // Auto-scroll to bottom on new messages or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContact, isPeerTyping]);

  // Reset actions when active contact changes
  useEffect(() => {
    setReplyingTo(null);
    setEditingMsg(null);
    setActionMenu(null);
    setSearchQuery('');
    setDeleteConfirmOpen(false);
  }, [activeContact?.knot_id]);

  // Auto-expanding textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 22), 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputText]);

  // Close menus on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActionMenu(null);
        setReactionPickerTargetId(null);
        setDeleteConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (onSendTyping && activeContact) {
      onSendTyping(activeContact.knot_id);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onSendTyping(null);
      }, 3000);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeContact || sending) return;

    if (editingMsg) {
      const textToUpdate = inputText.trim();
      setSending(true);
      try {
        await onEditMessage(editingMsg.id, textToUpdate);
        setEditingMsg(null);
        setInputText('');
        if (textareaRef.current) textareaRef.current.style.height = '22px';
      } finally {
        setSending(false);
      }
      return;
    }

    const textToSend = inputText.trim();
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = '22px';
    setSending(true);

    try {
      const replyPayload = replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.plaintext ? replyingTo.plaintext.slice(0, 60) : '[Sticker]',
        sender: replyingTo.senderKnotId
      } : null;

      await onSendMessage(activeContact.knot_id, textToSend, ttl, replyPayload, 'text', null);
      setReplyingTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleSendSticker = async (sticker) => {
    if (!activeContact || sending) return;
    setSending(true);
    try {
      const replyPayload = replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.plaintext ? replyingTo.plaintext.slice(0, 60) : '[Sticker]',
        sender: replyingTo.senderKnotId
      } : null;

      await onSendMessage(
        activeContact.knot_id,
        `[Sticker: ${sticker.title}]`,
        ttl,
        replyPayload,
        'sticker',
        sticker
      );
      setReplyingTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleCopyMessage = (msg) => {
    if (!msg?.plaintext) return;
    navigator.clipboard.writeText(msg.plaintext);
    setCopiedId(msg.id);
    setTimeout(() => {
      setCopiedId(null);
      setActionMenu(null);
    }, 1200);
  };

  const handleStartEdit = (msg) => {
    setEditingMsg(msg);
    setInputText(msg.plaintext || '');
    setReplyingTo(null);
    setActionMenu(null);
    textareaRef.current?.focus();
  };

  const handleDelete = (msgId) => {
    if (confirm('Delete this message for everyone?')) {
      onDeleteMessage(msgId);
      setActionMenu(null);
    }
  };

  const startLongPress = (msg, x, y, isOutgoing) => {
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setActionMenu({ msg, x, y, isOutgoing });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(35); } catch {}
      }
    }, 420);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e, msg, isOutgoing) => {
    e.preventDefault();
    setActionMenu({ msg, x: e.clientX, y: e.clientY, isOutgoing });
  };

  const handleTouchStart = (e, msg, isOutgoing) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      msgId: msg.id || msg._id,
      isSwiping: false,
      triggered: false
    };
    startLongPress(msg, touch.clientX, touch.clientY, isOutgoing);
  };

  const handleTouchMove = (e, msgId) => {
    if (!touchStartRef.current.msgId || touchStartRef.current.msgId !== msgId) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      cancelLongPress();
    }

    if (deltaX > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      touchStartRef.current.isSwiping = true;
      const distance = Math.min(Math.max(deltaX * 0.55, 0), 75);
      setSwipeOffsetMap(prev => ({ ...prev, [msgId]: distance }));

      if (distance >= 48 && !touchStartRef.current.triggered) {
        touchStartRef.current.triggered = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(25); } catch {}
        }
      }
    }
  };

  const handleTouchEnd = (msg) => {
    cancelLongPress();
    const msgId = msg.id || msg._id;
    const currentOffset = swipeOffsetMap[msgId] || 0;

    if (currentOffset >= 48 && !actionMenu) {
      setReplyingTo(msg);
      textareaRef.current?.focus();
    }

    setSwipeOffsetMap(prev => ({ ...prev, [msgId]: 0 }));
    touchStartRef.current = { x: 0, y: 0, msgId: null, isSwiping: false, triggered: false };
  };

  const handleMouseDown = (e, msg, isOutgoing) => {
    if (e.button !== 0) return;
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      msgId: msg.id || msg._id,
      isSwiping: false,
      triggered: false
    };
    startLongPress(msg, e.clientX, e.clientY, isOutgoing);
  };

  const handleMouseMove = (e, msgId) => {
    if (!touchStartRef.current.msgId || touchStartRef.current.msgId !== msgId) return;
    const deltaX = e.clientX - touchStartRef.current.x;
    const deltaY = e.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      cancelLongPress();
    }

    if (deltaX > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      touchStartRef.current.isSwiping = true;
      const distance = Math.min(Math.max(deltaX * 0.55, 0), 75);
      setSwipeOffsetMap(prev => ({ ...prev, [msgId]: distance }));

      if (distance >= 48 && !touchStartRef.current.triggered) {
        touchStartRef.current.triggered = true;
      }
    }
  };

  const handleMouseUp = (msg) => {
    cancelLongPress();
    const msgId = msg.id || msg._id;
    const currentOffset = swipeOffsetMap[msgId] || 0;

    if (currentOffset >= 48 && !actionMenu) {
      setReplyingTo(msg);
      textareaRef.current?.focus();
    }

    setSwipeOffsetMap(prev => ({ ...prev, [msgId]: 0 }));
    touchStartRef.current = { x: 0, y: 0, msgId: null, isSwiping: false, triggered: false };
  };

  // 1. Clean, Friendly Standby View (When no contact is selected)
  if (!activeContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 text-center bg-[#ffffff] relative overflow-hidden select-none">
        <div className="max-w-xl flex flex-col items-center z-10 animate-on-scroll [animation:animationIn_0.8s_ease-out_0.05s_both]">
          <div className="w-16 h-16 rounded-[4px] bg-[#191917]/8 border border-[#191917]/25 flex items-center justify-center mb-5">
            <iconify-icon icon="solar:chat-round-line-bold-duotone" class="text-3xl text-[#191917]"></iconify-icon>
          </div>

          <h2 className="text-2xl lg:text-4xl font-bold tracking-tight text-[#191917] mb-3">
            Private Messaging Made Simple
          </h2>

          <p className="text-sm text-[#3f3f3a] max-w-md font-normal leading-relaxed mb-8">
            Chat freely with complete privacy. No phone numbers, no emails, no tracking.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8">
            <div className="borealis-card p-3.5 text-left border border-[#191917]/15">
              <div className="text-xs font-bold text-[#191917] mb-1">Private &amp; Secure</div>
              <div className="text-[11px] text-[#6c6c64] leading-relaxed">Only you and your recipient can read messages.</div>
            </div>

            <div className="borealis-card p-3.5 text-left border border-[#191917]/15">
              <div className="text-xs font-bold text-[#191917] mb-1">No Personal Info</div>
              <div className="text-[11px] text-[#6c6c64] leading-relaxed">No phone numbers or central accounts needed.</div>
            </div>

            <div className="borealis-card p-3.5 text-left border border-[#191917]/15">
              <div className="text-xs font-bold text-[#191917] mb-1">Auto-Burn Option</div>
              <div className="text-[11px] text-[#6c6c64] leading-relaxed">Set messages to automatically disappear.</div>
            </div>
          </div>

          <button
            onClick={onOpenNewChat}
            className="px-6 py-3 bg-[#191917] text-[#f6f5f2] font-semibold rounded-[4px] text-xs hover:bg-[#3f3f3a] transition-all flex items-center gap-2"
          >
            <span>+ Start a New Chat</span>
            <iconify-icon icon="solar:arrow-right-bold-duotone" class="text-sm"></iconify-icon>
          </button>
        </div>
      </div>
    );
  }

  const contactMessages = messages[activeContact.knot_id] || [];
  const displayMessages = searchQuery.trim()
    ? contactMessages.filter(m => (m.plaintext || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : contactMessages;
  const initials = (activeContact.alias || activeContact.knot_id || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#ffffff]">
      {/* Top Chat Bar */}
      <div className="h-16 px-4 lg:px-6 border-b border-[#191917]/15 bg-[#f5f4f1] flex items-center justify-between shrink-0 z-20">
        {/* Contact Info & Back Nav */}
        <div className="flex items-center gap-3 min-w-0">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="w-9 h-9 rounded-[4px] bg-[#191917]/8 border border-[#191917]/20 flex items-center justify-center text-[#191917] hover:bg-[#191917]/12 transition-colors shrink-0"
            >
              <iconify-icon icon="solar:alt-arrow-left-bold-duotone" class="text-xl"></iconify-icon>
            </button>
          )}

          <div
            className="w-10 h-10 rounded-[4px] flex items-center justify-center font-bold text-sm text-[#191917] shrink-0 relative border border-[#191917]/20"
            style={{ background: getAvatarGradient(activeContact.knot_id) }}
          >
            {initials}
            <span className={`w-2.5 h-2.5 rounded-full border-2 border-[#ffffff] absolute -bottom-0.5 -right-0.5 ${
              isPeerOnline ? 'bg-[#191917]' : 'bg-[#a9a99f]'
            }`}></span>
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <div className="text-sm font-bold text-[#191917] truncate flex items-center gap-1.5 leading-tight">
              <span className="truncate">{activeContact.alias || activeContact.knot_id}</span>
              {activeContact.muted && (
                <iconify-icon icon="solar:bell-off-bold-duotone" class="text-xs text-[#6c6c64] shrink-0"></iconify-icon>
              )}
            </div>

            {/* Vertically centered active dot and text */}
            <div className="flex items-center gap-1.5 text-xs text-[#6c6c64] mt-0.5 leading-none">
              {isPeerTyping ? (
                <span className="text-[#191917] font-semibold animate-pulse leading-none">typing...</span>
              ) : isPeerOnline ? (
                <span className="inline-flex items-center gap-1.5 leading-none text-[#191917] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#191917] shrink-0 inline-block"></span>
                  <span className="leading-none">Online</span>
                </span>
              ) : (
                <span className="leading-none">Last seen recently</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Auto-Burn Selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#191917]/5 border border-[#191917]/15 px-2 py-1 rounded-[3px]">
            <iconify-icon icon="solar:fire-bold-duotone" class="text-xs text-[#6c6c64]"></iconify-icon>
            <select
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className="bg-transparent border-none text-[11px] font-medium text-[#6c6c64] focus:outline-none cursor-pointer"
            >
              <option value={30} className="bg-[#ffffff] text-[#191917]">30 seconds burn</option>
              <option value={3600} className="bg-[#ffffff] text-[#191917]">1 hour burn</option>
              <option value={86400} className="bg-[#ffffff] text-[#191917]">24 hours burn</option>
              <option value={604800} className="bg-[#ffffff] text-[#191917]">7 days burn</option>
            </select>
          </div>

          {/* Search in Chat Button */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setSearchQuery('');
            }}
            className={`w-9 h-9 rounded-[4px] border flex items-center justify-center transition-colors ${
              searchOpen
                ? 'bg-[#191917] text-[#f6f5f2] border-[#191917]'
                : 'bg-[#191917]/8 border-[#191917]/20 text-[#191917] hover:bg-[#191917]/12'
            }`}
          >
            <iconify-icon icon="solar:magnifer-bold-duotone" class="text-lg"></iconify-icon>
          </button>

          {/* Mute / Unmute Button */}
          {onToggleMute && (
            <button
              type="button"
              onClick={() => onToggleMute(activeContact.knot_id)}
              className={`w-9 h-9 rounded-[4px] border flex items-center justify-center transition-colors ${
                activeContact.muted
                  ? 'bg-[#a9a99f]/25 border-[#a9a99f]/50 text-[#6c6c64]'
                  : 'bg-[#191917]/8 border-[#191917]/20 text-[#191917] hover:bg-[#191917]/12'
              }`}
            >
              <iconify-icon
                icon={activeContact.muted ? "solar:bell-off-bold-duotone" : "solar:bell-bold-duotone"}
                class="text-lg"
              ></iconify-icon>
            </button>
          )}

          {/* Delete / Clear Chat Menu Button */}
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(!deleteConfirmOpen)}
            className="w-9 h-9 rounded-[4px] bg-[#191917]/8 border border-[#191917]/20 flex items-center justify-center text-[#191917] hover:bg-[#191917]/10 hover:border-[#191917]/30 transition-colors"
          >
            <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-lg"></iconify-icon>
          </button>

          {/* Three-Dot Menu Button (Replaced Info Circle Button) */}
          <button
            type="button"
            onClick={onToggleDetails}
            className={`w-9 h-9 rounded-[4px] border flex items-center justify-center transition-colors ${
              detailsOpen
                ? 'bg-[#191917] text-[#f6f5f2] border-[#191917]'
                : 'bg-[#191917]/8 border-[#191917]/20 text-[#191917] hover:bg-[#191917]/12'
            }`}
          >
            <iconify-icon icon="solar:menu-dots-vertical-bold-duotone" class="text-lg"></iconify-icon>
          </button>
        </div>
      </div>

      {/* Delete / Clear Chat Options Modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#191917]/70 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="bg-[#ffffff] border border-[#191917]/25 rounded-[4px] p-5 max-w-sm w-full flex flex-col gap-3 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[#191917]">
              <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-2xl"></iconify-icon>
              <h4 className="text-sm font-bold text-[#191917]">Delete Chat Options</h4>
            </div>

            <p className="text-xs text-[#3f3f3a] leading-relaxed">
              Choose an action for conversation with <strong className="text-[#191917]">{activeContact.alias || activeContact.knot_id}</strong>:
            </p>

            <div className="flex flex-col gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onClearChat();
                }}
                className="w-full py-2.5 px-3 rounded-[4px] bg-[#191917]/8 border border-[#191917]/20 text-xs font-semibold text-[#191917] hover:bg-[#191917]/12 transition-all text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-bold">Clear Messages Only</div>
                  <div className="text-[10px] text-[#6c6c64] font-normal">Deletes all messages, keeps contact in list</div>
                </div>
                <iconify-icon icon="solar:broom-bold-duotone" class="text-lg text-[#6c6c64]"></iconify-icon>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  if (onDeleteEntireChat) {
                    onDeleteEntireChat(activeContact.knot_id);
                  } else {
                    onClearChat();
                  }
                }}
                className="w-full py-2.5 px-3 rounded-[4px] bg-[#191917]/10 border border-[#191917]/30 text-xs font-semibold text-[#191917] hover:bg-[#191917]/12 transition-all text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[#191917]">Delete Entire Chat &amp; Contact</div>
                  <div className="text-[10px] text-[#6c6c64] font-normal">Purges all messages and removes contact</div>
                </div>
                <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-lg text-[#191917]"></iconify-icon>
              </button>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-1.5 rounded-[3px] text-xs font-medium text-[#6c6c64] hover:text-[#191917]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Search Bar */}
      {searchOpen && (
        <div className="px-4 py-2.5 bg-[#ffffff] border-b border-[#191917]/15 flex items-center gap-2.5 z-10">
          <iconify-icon icon="solar:magnifer-bold-duotone" class="text-sm text-[#6c6c64]"></iconify-icon>
          <input
            type="text"
            placeholder="Search in conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent border-none text-xs text-[#191917] placeholder-[#a9a99f] focus:outline-none"
          />
          {searchQuery && (
            <span className="text-[11px] font-mono text-[#191917] font-semibold">
              {displayMessages.length} match{displayMessages.length === 1 ? '' : 'es'}
            </span>
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#6c6c64] hover:text-[#191917] px-1.5"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
            className="text-xs text-[#3f3f3a] hover:text-[#191917] px-2 py-1 bg-[#191917]/8 rounded-[3px]"
          >
            Done
          </button>
        </div>
      )}

      {/* Messages Scroll Canvas */}
      <div
        onScroll={() => {
          cancelLongPress();
          if (actionMenu) setActionMenu(null);
        }}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2.5 relative bg-[#ffffff]"
      >
        {contactMessages.length === 0 ? (
          <div className="m-auto text-center text-[#6c6c64] text-xs max-w-xs leading-relaxed">
            Send a message to start chatting!
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="m-auto text-center text-[#6c6c64] text-xs">
            No messages found matching "{searchQuery}"
          </div>
        ) : (
          displayMessages.map((msg, index) => {
            const isOutgoing = msg.senderKnotId === identity.knotId;
            const swipeOffset = swipeOffsetMap[msg.id || index] || 0;
            const isMenuTarget = actionMenu?.msg?.id === msg.id;

            // Burn countdown calculation
            const remainingSeconds = msg.expiresAt ? Math.max(0, Math.ceil((msg.expiresAt - now) / 1000)) : null;

            return (
              <div
                key={msg.id || index}
                className={`flex w-full relative ${isOutgoing ? 'justify-end' : 'justify-start'}`}
              >
                {/* Swipe-to-Reply Badge Indicator */}
                {swipeOffset > 0 && (
                  <div
                    className="swipe-reply-badge"
                    style={{
                      left: isOutgoing ? 'auto' : `${Math.min(swipeOffset - 36, 12)}px`,
                      right: isOutgoing ? `${Math.min(swipeOffset - 36, 12)}px` : 'auto',
                      opacity: Math.min(swipeOffset / 40, 1),
                      transform: `translateY(-50%) scale(${Math.min(swipeOffset / 48, 1)})`,
                      background: swipeOffset >= 48 ? '#191917' : 'rgba(25, 25, 23, 0.25)',
                      color: swipeOffset >= 48 ? '#f6f5f2' : '#191917'
                    }}
                  >
                    <iconify-icon icon="solar:reply-bold-duotone" class="text-base"></iconify-icon>
                  </div>
                )}

                <div
                  className={`bubble ${isOutgoing ? 'outgoing' : 'incoming'} transition-transform`}
                  onTouchStart={(e) => handleTouchStart(e, msg, isOutgoing)}
                  onTouchMove={(e) => handleTouchMove(e, msg.id || index)}
                  onTouchEnd={() => handleTouchEnd(msg)}
                  onMouseDown={(e) => handleMouseDown(e, msg, isOutgoing)}
                  onMouseMove={(e) => handleMouseMove(e, msg.id || index)}
                  onMouseUp={() => handleMouseUp(msg)}
                  onMouseLeave={() => handleMouseUp(msg)}
                  onContextMenu={(e) => handleContextMenu(e, msg, isOutgoing)}
                  style={{
                    transform: `translateX(${swipeOffset}px)`,
                    boxShadow: isMenuTarget ? '0 0 0 2px #191917, 0 10px 30px rgba(25, 25, 23, 0.25)' : undefined
                  }}
                >
                  {/* Quoted Reply Banner */}
                  {msg.reply_to && (
                    <div className="bg-[#191917]/40 border-l-2 border-[#191917] rounded-[3px] p-2 mb-2 text-xs">
                      <div className="font-bold text-[#f6f5f2]">
                        {msg.reply_to.sender === identity.knotId ? 'You' : (activeContact.alias || 'Contact')}
                      </div>
                      <div className="text-[#f6f5f2]/70 truncate text-[11px] mt-0.5 font-medium">
                        {msg.reply_to.text}
                      </div>
                    </div>
                  )}

                  {/* Message Body (Sticker or Text) */}
                  {msg.type === 'sticker' && msg.sticker ? (
                    msg.sticker.image ? (
                      <div className="rounded-[4px] p-1 my-1 inline-flex items-center justify-center bg-[#191917]/40 border border-[#191917]/20">
                        <img
                          src={msg.sticker.image}
                          alt={msg.sticker.title || 'Sticker'}
                          className="max-w-[160px] max-h-[160px] object-contain rounded-[3px]"
                        />
                      </div>
                    ) : (
                      <div
                        className="rounded-[4px] p-3.5 text-center text-[#f6f5f2] my-1"
                        style={{ background: msg.sticker.bg || 'linear-gradient(135deg, #191917 0%, #3a3a35 100%)' }}
                      >
                        <div className="text-3xl mb-1">{msg.sticker.icon}</div>
                        <div className="font-bold text-xs">{msg.sticker.title}</div>
                        <div className="text-[10px] opacity-90">{msg.sticker.subtitle}</div>
                      </div>
                    )
                  ) : (
                    <div className="text-[15px] font-normal leading-relaxed whitespace-pre-wrap break-words">
                      {msg.plaintext}
                    </div>
                  )}

                  {/* Reactions Bar */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => {
                        const isMine = msg.reactions?.some(r => r.knotId === identity?.knotId && r.emoji === emoji);
                        return (
                          <span
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onReactMessage) onReactMessage(msg.id, emoji);
                            }}
                            className={`px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1 cursor-pointer transition-all ${
                              isMine
                                ? 'bg-[#191917]/10 border border-[#191917] text-[#191917] font-bold'
                                : 'bg-[#191917]/50 border border-[#191917]/25 text-[#f6f5f2] hover:bg-[#191917]/12'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-mono font-bold">{count}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Bubble Meta (Timestamp, Burn Countdown, Edited tag, Compact Double Check Marks) */}
                  <div className="bubble-meta">
                    {/* Burn Countdown Timer */}
                    {remainingSeconds !== null && remainingSeconds <= 86400 && (
                      <span className="text-[10px] font-mono text-[#6c6c64] mr-1 flex items-center gap-0.5">
                        <iconify-icon icon="solar:fire-bold-duotone" class="text-xs"></iconify-icon>
                        <span>{remainingSeconds > 60 ? `${Math.ceil(remainingSeconds / 60)}m` : `${remainingSeconds}s`}</span>
                      </span>
                    )}

                    {msg.edited && (
                      <span className="text-[10px] italic text-[#3f3f3a] mr-1">
                        (edited)
                      </span>
                    )}

                    <span>{msg.timestamp || 'Now'}</span>

                    {isOutgoing && (
                      <span
                        className={`inline-flex items-center ml-1 ${
                          msg.status === 'read' ? 'text-[#191917]' : 'text-[#6c6c64]'
                        }`}
                        style={{
                          filter: msg.status === 'read' ? 'drop-shadow(0 0 3px rgba(25, 25, 23, 0.45))' : 'none'
                        }}
                      >
                        <svg width="15" height="10" viewBox="0 0 16 11" fill="none">
                          <path
                            d="M1 5.5L4.5 9L11 1.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 5.5L8.5 9L15 1.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Peer Typing Indicator Bubble */}
        {isPeerTyping && (
          <div className="flex w-full justify-start">
            <div className="bubble incoming flex items-center gap-2 py-2 px-3">
              <span className="text-xs text-[#191917] font-medium">typing</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#191917] animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#191917] animate-pulse [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#191917] animate-pulse [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#ffffff] border-t border-[#191917]/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[#191917] font-bold">Replying to:</span>
            <span className="text-[#191917] truncate">"{replyingTo.plaintext}"</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-xs text-[#6c6c64] hover:text-[#191917] px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMsg && (
        <div className="px-4 py-2 bg-[#a9a99f]/20 border-t border-[#a9a99f]/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[#6c6c64] font-bold">✏️ Editing message:</span>
            <span className="text-[#191917] truncate font-medium">"{editingMsg.plaintext}"</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMsg(null);
              setInputText('');
              if (textareaRef.current) textareaRef.current.style.height = '22px';
            }}
            className="text-xs text-[#6c6c64] hover:text-[#191917] font-semibold"
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Composer Dock - Center Aligned Input & Buttons */}
      <form onSubmit={handleSend} className="composer-dock">
        <div className="composer-input-pill">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={editingMsg ? "Edit message..." : "Type a message..."}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            className="composer-textarea"
            autoFocus
          />

          {/* Emoji/Stickers Button */}
          <button
            type="button"
            onClick={() => setTrayOpen(!trayOpen)}
            className="text-lg text-[#191917] hover:scale-110 transition-transform shrink-0 p-1 flex items-center justify-center leading-none"
          >
            😊
          </button>
        </div>

        {/* Send / Update Button */}
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="w-10 h-10 rounded-full bg-[#191917] text-[#f6f5f2] flex items-center justify-center font-bold text-sm shrink-0 hover:bg-[#3f3f3a] disabled:opacity-30 disabled:hover:bg-[#191917] transition-all leading-none"
        >
          {sending ? (
            <span className="text-xs leading-none">...</span>
          ) : editingMsg ? (
            <iconify-icon icon="solar:check-read-bold-duotone" class="text-base"></iconify-icon>
          ) : (
            <iconify-icon icon="solar:plain-2-bold-duotone" class="text-base"></iconify-icon>
          )}
        </button>
      </form>

      {/* Main Composer Emoji & Sticker Tray Popover */}
      <EmojiStickerTray
        isOpen={trayOpen}
        onClose={() => setTrayOpen(false)}
        onSelectEmoji={(em) => setInputText(prev => prev + em)}
        onSendSticker={handleSendSticker}
      />

      {/* Reaction Full Emoji Picker Modal */}
      {reactionPickerTargetId && (
        <div
          className="modal-overlay"
          onClick={() => setReactionPickerTargetId(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <EmojiStickerTray
              isOpen={true}
              onClose={() => setReactionPickerTargetId(null)}
              onSelectEmoji={(emoji) => {
                if (onReactMessage && reactionPickerTargetId) {
                  onReactMessage(reactionPickerTargetId, emoji);
                }
                setReactionPickerTargetId(null);
              }}
              title="React with Any Emoji"
              hideStickers={true}
            />
          </div>
        </div>
      )}

      {/* Instagram-Style Message Context Menu Overlay */}
      {actionMenu && (
        <div
          className="fixed inset-0 bg-[#191917]/40 z-[9000] animate-fadeIn"
          onClick={() => setActionMenu(null)}
        >
          {(() => {
            const { posX, posY } = getMenuCoordinates(actionMenu.x, actionMenu.y, actionMenu.isOutgoing);
            const msg = actionMenu.msg;
            const isOutgoing = actionMenu.isOutgoing;

            return (
              <div
                style={{
                  position: 'fixed',
                  left: `${posX}px`,
                  top: `${posY}px`,
                  zIndex: 9001,
                  transformOrigin: isOutgoing ? 'top right' : 'top left'
                }}
                className="flex flex-col gap-2 animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Reaction Tray (Top) */}
                <div className="bg-[#ffffff] border border-[#191917]/25 rounded-full px-2.5 py-1.5 flex items-center gap-1">
                  {QUICK_REACTIONS.map((emoji) => {
                    const isSelected = msg.reactions?.some(r => r.knotId === identity?.knotId && r.emoji === emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          if (onReactMessage) onReactMessage(msg.id, emoji);
                          setActionMenu(null);
                        }}
                        className={`text-xl p-1 rounded-full hover:scale-125 transition-transform ${
                          isSelected ? 'bg-[#191917]/15' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}

                  {/* Plus button to open full emoji reaction picker */}
                  <button
                    type="button"
                    onClick={() => {
                      setReactionPickerTargetId(msg.id);
                      setActionMenu(null);
                    }}
                    className="w-7 h-7 rounded-full bg-[#191917]/8 border border-[#191917]/25 flex items-center justify-center text-xs text-[#191917] hover:bg-[#191917]/15 transition-all ml-1"
                  >
                    ➕
                  </button>
                </div>

                {/* 2. Action Options List */}
                <div className="bg-[#ffffff] border border-[#191917]/25 rounded-[4px] p-1.5 w-52 flex flex-col gap-0.5">
                  {/* Reply */}
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(msg);
                      setActionMenu(null);
                      textareaRef.current?.focus();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-semibold text-[#191917] hover:bg-[#191917]/8 transition-colors w-full text-left"
                  >
                    <span>Reply</span>
                    <iconify-icon icon="solar:reply-bold-duotone" class="text-base text-[#3f3f3a]"></iconify-icon>
                  </button>

                  {/* Copy Text */}
                  {msg.plaintext && msg.type !== 'sticker' && (
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg)}
                      className={`flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-semibold transition-colors w-full text-left ${
                        copiedId === msg.id
                          ? 'text-[#191917] bg-[#191917]/8'
                          : 'text-[#191917] hover:bg-[#191917]/8'
                      }`}
                    >
                      <span>{copiedId === msg.id ? 'Copied!' : 'Copy Text'}</span>
                      <iconify-icon icon="solar:copy-bold-duotone" class="text-base text-[#3f3f3a]"></iconify-icon>
                    </button>
                  )}

                  {/* Edit Message (Sender Outgoing only) */}
                  {isOutgoing && msg.type !== 'sticker' && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(msg)}
                      className="flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-semibold text-[#6c6c64] hover:bg-[#a9a99f]/15 transition-colors w-full text-left"
                    >
                      <span>Edit Message</span>
                      <iconify-icon icon="solar:pen-bold-duotone" class="text-base text-[#6c6c64]"></iconify-icon>
                    </button>
                  )}

                  <div className="h-px bg-[#191917]/8 my-1"></div>

                  {/* Delete for Everyone */}
                  <button
                    type="button"
                    onClick={() => handleDelete(msg.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-bold text-[#191917] hover:bg-[#191917]/10 transition-colors w-full text-left"
                  >
                    <span>Delete for Everyone</span>
                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone" class="text-base text-[#191917]"></iconify-icon>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
