import { GlassPanel } from '../ui/GlassPanel';
import { CopyButton } from '../ui/CopyButton';
import type { Identity } from '../../lib/api/types';

export function KnotIdCard({ identity, compact }: { identity: Identity; compact?: boolean }) {
  return (
    <GlassPanel elevation="raised" radius="xl" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-[var(--text-3)]">Your Knots ID</p>
          <p className="mono mt-1.5 break-all text-[15px] leading-relaxed text-[var(--text)]">{identity.knotId}</p>
        </div>
        <CopyButton value={identity.knotId} label="ID" />
      </div>

      {!compact && (
        <div className="space-y-3 border-t border-[var(--hairline)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-[var(--text-3)]">Safety number</p>
              <p className="mono mt-1 text-[13px] text-[var(--text-2)]">{identity.safetyNumber}</p>
            </div>
            <CopyButton value={identity.safetyNumber} label="Number" compact />
          </div>
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-[var(--text-3)]">X25519 public key</p>
            <p className="mono mt-1 break-all text-[12px] leading-relaxed text-[var(--text-3)]">{identity.publicKey}</p>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
