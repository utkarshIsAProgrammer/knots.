import React, { useState } from 'react';

export default function SidebarHeader({
  identity,
  onOpenProfile,
  onOpenNewChat,
  onOpenDossier,
  networkStats,
  relayStatus,
  onGoHome
}) {
  const [copied, setCopied] = useState(false);

  const copyKnotId = () => {
    if (!identity?.knotId) return;
    navigator.clipboard.writeText(identity.knotId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOnline = relayStatus?.status === 'ok';

  return (
    <div className="p-4 border-b border-[#191917]/15 flex flex-col gap-3 bg-[#f5f4f1]">
      {/* Brand Header & Action Icons */}
      <div className="flex items-center justify-between">
        <div
          onClick={onGoHome}
          role="button"
          tabIndex={0}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          {/* Brand Icon */}
          <div className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-[#191917]/8 border border-[#191917]/20 group-hover:bg-[#191917]/12 transition-colors">
            <iconify-icon icon="solar:star-fall-bold-duotone" class="text-xl text-[#191917]"></iconify-icon>
          </div>

          <div>
            <div className="text-base font-bold text-[#191917] tracking-tight flex items-center gap-1.5">
              <span>Knots</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64] font-medium">
              Private Messenger
            </div>
          </div>
        </div>

        {/* Operational Badge & Header Actions */}
        <div className="flex items-center gap-2">
          {/* Operational Pulse */}
          <div className="hidden sm:inline-flex items-center gap-1.5 bg-[#191917]/8 border border-[#191917]/20 px-2.5 py-1 rounded-full leading-none">
            <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isOnline ? 'bg-[#191917] animate-pulse' : 'bg-[#a9a99f]'}`}></span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#191917] font-semibold leading-none">
              {isOnline ? 'Active' : 'Sync'}
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onOpenNewChat}
            className="w-8 h-8 rounded-[3px] bg-[#191917]/8 border border-[#191917]/20 flex items-center justify-center text-[#191917] hover:bg-[#191917]/12 transition-colors"
          >
            <iconify-icon icon="solar:pen-new-square-bold-duotone" class="text-base"></iconify-icon>
          </button>

          {/* Privacy Dossier */}
          {onOpenDossier && (
            <button
              onClick={onOpenDossier}
              className="w-8 h-8 rounded-[3px] bg-[#191917]/8 border border-[#191917]/20 flex items-center justify-center text-[#191917] hover:bg-[#191917]/12 transition-colors"
            >
              <iconify-icon icon="solar:shield-warning-bold-duotone" class="text-base"></iconify-icon>
            </button>
          )}

          {/* Profile Button */}
          <button
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-[3px] bg-[#191917]/8 border border-[#191917]/20 flex items-center justify-center text-[#191917] hover:bg-[#191917]/12 transition-colors"
          >
            <iconify-icon icon="solar:user-circle-bold-duotone" class="text-base"></iconify-icon>
          </button>
        </div>
      </div>

      {/* User Identity Mini Card */}
      <div
        className="borealis-card p-2.5 flex items-center justify-between cursor-pointer hover:border-[#191917]/30 transition-all"
        onClick={copyKnotId}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[3px] bg-gradient-to-tr from-[#191917]/40 to-[#191917]/40 border border-[#191917]/20 flex items-center justify-center text-xs font-mono font-bold text-[#191917] shrink-0">
            {identity?.knotId ? identity.knotId.slice(4, 6) : 'ME'}
          </div>

          <div className="min-w-0">
            <div className="text-xs font-bold text-[#191917] flex items-center gap-2 leading-none">
              <span className="leading-none">My Knots ID</span>
              <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isOnline ? 'bg-[#191917]' : 'bg-[#a9a99f]'}`}></span>
            </div>
            <div className="text-[11px] font-mono text-[#6c6c64] truncate mt-1">
              {identity?.knotId ? identity.knotId.slice(0, 16) + '...' : 'Creating ID...'}
            </div>
          </div>
        </div>

        <button
          className="px-2.5 py-1 rounded-[3px] bg-[#191917]/8 border border-[#191917]/20 text-[10px] font-mono font-medium text-[#191917] hover:bg-[#191917]/12 transition-colors shrink-0 ml-2"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
