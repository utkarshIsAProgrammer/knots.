import React from 'react';
import NetworkRadar from './NetworkRadar.jsx';

export default function NetworkRadarModal({
  isOpen,
  onClose,
  networkStats,
  discoveredNodes,
  onInitiateHandshake,
  myKnotId
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#191917]/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#191917] animate-pulse"></span>
            <h3 className="text-sm font-semibold text-[#191917] tracking-tight">Discover People</h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[3px] bg-[#191917]/5 border border-[#191917]/15 flex items-center justify-center text-[#6c6c64] hover:text-[#191917] hover:bg-[#191917]/8 transition-colors"
          >
            <iconify-icon icon="solar:close-circle-bold-duotone" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[70vh]">
          <NetworkRadar
            networkStats={networkStats}
            discoveredNodes={discoveredNodes}
            onInitiateHandshake={(id) => {
              onInitiateHandshake(id);
              onClose();
            }}
            myKnotId={myKnotId}
          />
        </div>
      </div>
    </div>
  );
}
