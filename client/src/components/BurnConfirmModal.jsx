import React, { useState } from 'react';

export default function BurnConfirmModal({
  isOpen,
  onClose,
  onConfirmBurn,
  knotId
}) {
  const [burning, setBurning] = useState(false);

  if (!isOpen) return null;

  const handleBurn = async () => {
    setBurning(true);
    try {
      await onConfirmBurn();
      onClose();
    } catch (err) {
      alert('Burn error: ' + err.message);
    } finally {
      setBurning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#191917]/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#191917]"></span>
            <h3 className="text-sm font-semibold text-[#191917] tracking-tight">
              Reset Account &amp; Delete Data
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[3px] bg-[#191917]/5 border border-[#191917]/15 flex items-center justify-center text-[#6c6c64] hover:text-[#191917] hover:bg-[#191917]/8 transition-colors"
          >
            <iconify-icon icon="solar:close-circle-bold-duotone" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5">
          <p className="text-xs text-[#3f3f3a] leading-relaxed">
            You are about to reset and delete your Knots account and all data on this device:
          </p>

          <div className="bg-[#191917]/5 border border-[#191917]/25 rounded-[4px] p-3 font-mono text-xs font-bold text-[#191917] break-all">
            {knotId}
          </div>

          <div className="borealis-card p-3 text-xs text-[#3f3f3a] space-y-1.5 leading-relaxed">
            <div>• All messages and chats deleted from this device.</div>
            <div>• All pending messages deleted from the server.</div>
            <div>• Your contact list and settings cleared.</div>
            <div>• A fresh, clean account will be created immediately.</div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <button
              onClick={onClose}
              disabled={burning}
              className="px-4 py-2 rounded-[4px] bg-[#191917]/5 border border-[#191917]/15 text-xs text-[#191917] hover:bg-[#191917]/8 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBurn}
              disabled={burning}
              className="px-4 py-2 bg-[#191917] text-[#f6f5f2] font-semibold text-xs rounded-[4px] hover:bg-[#3f3f3a] transition-colors disabled:opacity-40"
            >
              {burning ? 'Deleting Data...' : 'Delete All & Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
