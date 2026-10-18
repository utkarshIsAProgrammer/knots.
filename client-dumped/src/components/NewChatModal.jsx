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

export default function NewChatModal({
  isOpen,
  onClose,
  onSendRequest,
  discoveredNodes,
  myKnotId
}) {
  const [tab, setTab] = useState('direct'); // 'direct' | 'discover'
  const [targetId, setTargetId] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetId.trim()) return;
    setSubmitting(true);
    try {
      await onSendRequest(targetId.trim(), memo.trim());
      setTargetId('');
      setMemo('');
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickConnect = async (nodeId) => {
    setSubmitting(true);
    try {
      await onSendRequest(nodeId, "Hi, let's connect on Knots!");
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#191917]/15 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#191917] tracking-tight">Start New Chat</h3>
            <p className="text-[11px] text-[#6c6c64]">
              Enter a friend's Knots ID to start chatting
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[3px] bg-[#191917]/5 border border-[#191917]/15 flex items-center justify-center text-[#6c6c64] hover:text-[#191917] hover:bg-[#191917]/8 transition-colors"
          >
            <iconify-icon icon="solar:close-circle-bold-duotone" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-4 pt-3 gap-2 border-b border-[#191917]/10">
          <button
            onClick={() => setTab('direct')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-medium transition-all ${
              tab === 'direct'
                ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
                : 'bg-[#191917]/5 text-[#6c6c64] hover:text-[#191917]'
            }`}
          >
            Enter Knots ID
          </button>
          <button
            onClick={() => setTab('discover')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-medium transition-all flex items-center gap-1.5 ${
              tab === 'discover'
                ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
                : 'bg-[#191917]/5 text-[#6c6c64] hover:text-[#191917]'
            }`}
          >
            <span>Discover People</span>
            <span className="w-4 h-4 rounded-full bg-[#191917] text-[#f6f5f2] text-[9px] flex items-center justify-center font-bold">
              {discoveredNodes?.filter(n => n.knot_id !== myKnotId).length || 0}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh]">
          {tab === 'direct' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-[#3f3f3a] block mb-1.5">
                  Friend's Knots ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. KNT-8X9F-M2PQ-9VL4"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  autoFocus
                  required
                  className="w-full bg-[#f5f4f1] border border-[#191917]/15 rounded-[4px] px-3.5 py-2.5 text-xs text-[#191917] placeholder-[#a9a99f] focus:outline-none focus:border-[#191917]/25 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#3f3f3a] block mb-1.5">
                  Message (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hi, let's connect on Knots"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full bg-[#f5f4f1] border border-[#191917]/15 rounded-[4px] px-3.5 py-2.5 text-xs text-[#191917] placeholder-[#a9a99f] focus:outline-none focus:border-[#191917]/25"
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-[4px] bg-[#191917]/5 border border-[#191917]/15 text-xs text-[#191917] hover:bg-[#191917]/8 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !targetId.trim()}
                  className="px-4 py-2 rounded-[4px] bg-[#191917] text-[#f6f5f2] text-xs font-semibold hover:bg-[#3f3f3a] transition-colors disabled:opacity-40"
                >
                  {submitting ? 'Connecting...' : 'Send Request'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              {(!discoveredNodes || discoveredNodes.filter(n => n.knot_id !== myKnotId).length === 0) ? (
                <div className="py-10 text-center text-[#6c6c64] text-xs">
                  No other people found right now.
                </div>
              ) : (
                discoveredNodes
                  .filter(node => node.knot_id !== myKnotId)
                  .map((node) => (
                    <div
                      key={node.knot_id}
                      className="borealis-card p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-[3px] flex items-center justify-center font-bold text-xs text-[#191917] shrink-0 border border-[#191917]/15"
                          style={{ background: getAvatarGradient(node.knot_id) }}
                        >
                          {node.knot_id.slice(4, 6)}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-mono font-semibold text-[#191917] truncate">
                            {node.knot_id}
                          </div>
                          <div className="text-[10px] text-[#191917] mt-0.5">
                            Online on Knots
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleQuickConnect(node.knot_id)}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-[#191917] text-[#f6f5f2] rounded-[3px] text-xs font-semibold hover:bg-[#3f3f3a] transition-colors shrink-0"
                      >
                        Connect
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
