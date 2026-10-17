import React from 'react';

export default function NetworkRadar({
  networkStats,
  discoveredNodes,
  onInitiateHandshake,
  myKnotId
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col gap-4 text-[#191917]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#191917]/15">
        <div className="flex items-center gap-2.5">
          <iconify-icon icon="solar:compass-bold-duotone" class="text-xl text-[#6c6c64]"></iconify-icon>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Discover People</h3>
            <p className="text-[11px] text-[#6c6c64]">Find and connect with people on Knots</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#191917]/8 backdrop-blur-md border border-[#191917]/15 px-2.5 py-1 rounded-full leading-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#191917] animate-pulse inline-block shrink-0"></span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#191917] leading-none">Live</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="borealis-card p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
            Active Users
          </div>
          <div className="text-2xl font-bold font-mono text-[#191917] mt-1">
            {networkStats?.nodes_active || 1}
          </div>
          <div className="text-[10px] text-[#6c6c64] mt-0.5">Online now</div>
        </div>

        <div className="borealis-card p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
            Pending Messages
          </div>
          <div className="text-2xl font-bold font-mono text-[#6c6c64] mt-1">
            {networkStats?.queue_depth || 0}
          </div>
          <div className="text-[10px] text-[#6c6c64] mt-0.5">In transit</div>
        </div>
      </div>

      {/* Security Status */}
      <div className="borealis-card p-3.5 text-xs font-mono space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-[#6c6c64] mb-1">
          Connection &amp; Security
        </div>
        <div className="flex justify-between">
          <span className="text-[#6c6c64]">SERVER:</span>
          <span className="text-[#191917]">ONLINE</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6c6c64]">PRIVACY:</span>
          <span className="text-[#191917]">ZERO-KNOWLEDGE</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6c6c64]">ENCRYPTION:</span>
          <span className="text-[#6c6c64]">END-TO-END</span>
        </div>
      </div>

      {/* Discovered Users List */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64] flex items-center justify-between">
          <span>Available People</span>
          <span className="text-[#191917]/60">({discoveredNodes?.filter(n => n.knot_id !== myKnotId).length || 0})</span>
        </div>

        <div className="flex flex-col gap-2">
          {(!discoveredNodes || discoveredNodes.filter(n => n.knot_id !== myKnotId).length === 0) ? (
            <div className="py-8 text-center text-[#6c6c64] text-xs borealis-card p-4">
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
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-semibold text-[#191917] truncate">
                      {node.knot_id}
                    </div>
                    <div className="text-[10px] font-mono text-[#191917] truncate mt-0.5">
                      Online on Knots
                    </div>
                  </div>

                  <button
                    onClick={() => onInitiateHandshake(node.knot_id)}
                    className="px-3 py-1.5 bg-[#191917] text-[#f6f5f2] text-xs font-semibold rounded-[3px] hover:bg-[#3f3f3a] transition-colors shrink-0"
                  >
                    Connect
                  </button>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Privacy Guarantees */}
      <div className="borealis-card p-3.5 text-xs text-[#3f3f3a] space-y-1.5 mt-auto">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64] mb-1">
          Privacy Guarantees
        </div>
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:check-circle-bold-duotone" class="text-sm text-[#191917]"></iconify-icon>
          <span>No phone number or email required</span>
        </div>
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:check-circle-bold-duotone" class="text-sm text-[#191917]"></iconify-icon>
          <span>Messages are encrypted on your device</span>
        </div>
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:check-circle-bold-duotone" class="text-sm text-[#191917]"></iconify-icon>
          <span>Messages can self-destruct automatically</span>
        </div>
      </div>
    </div>
  );
}
