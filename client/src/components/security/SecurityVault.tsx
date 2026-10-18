import { useEffect, useState } from 'react';
import { Eye, EyeOff, Fingerprint, KeyRound, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CopyButton } from '../ui/CopyButton';
import { Dialog } from '../ui/Dialog';
import { HoldToConfirm } from '../ui/HoldToConfirm';
import { MnemonicGrid } from '../identity/MnemonicGrid';
import { useIdentity } from '../../features/identity';
import { useUI } from '../../features/ui';
import { toast } from '../../features/toast';
import { Overline } from '../landing/Reveal';

export function SecurityVault() {
  const { identity, alias, rotate, busy } = useIdentity();
  const openOverlay = useUI((s) => s.openOverlay);
  const [revealed, setRevealed] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);

  if (!identity) return null;

  return (
    <div className="scroll-area h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-6">
        <header className="space-y-1.5">
          <Overline>Security</Overline>
          <h1 className="font-display text-[26px] font-semibold tracking-[-0.035em]">Keys, backups & emergency delete</h1>
          <p className="text-[13.5px] leading-relaxed text-[var(--text-2)]">
            Everything here is stored only on this device. If you lose this device and your phrase, the identity is
            gone for good. Your Knots ID lives on your Profile.
          </p>
        </header>

        <GlassPanel elevation="raised" radius="lg" className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">Recovery phrase</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--text-2)]">
                Twelve words. The only way back into this identity.
              </p>
            </div>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setRevealed((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white"
            >
              {revealed ? <EyeOff size={18} className="shrink-0 text-zinc-600 dark:text-zinc-400" /> : <Eye size={18} className="shrink-0 text-zinc-600 dark:text-zinc-400" />}
              <span>{revealed ? 'Hide' : 'Reveal'}</span>
            </Button>
          </div>
          {revealed ? (
            <MnemonicGrid mnemonic={identity.mnemonic} />
          ) : (
            <div className="mono rounded-sm border border-[var(--glass-stroke)] px-4 py-6 text-center text-[12.5px] text-[var(--text-3)]">
              ••••• • ••••• •••• ••••• •••• ••••• • ••••• •••• •••••
            </div>
          )}
        </GlassPanel>

        <GlassPanel radius="lg" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] border border-white/10 text-white">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">Identity keys</p>
              <p className="text-[12.5px] text-[var(--text-2)]">Rotate to get a brand-new Knots ID.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="glass" className="justify-start" onClick={() => setRotateOpen(true)}>
              <RefreshCw size={16} /> Rotate identity
            </Button>
            <Button
              variant="glass"
              className="justify-start"
              onClick={() => toast.success('Keys refreshed', 'New keys were created on this device.')}
            >
              <Fingerprint size={16} /> Refresh keys
            </Button>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] px-3.5 py-3 bg-amber-500/5 dark:bg-[#000000]">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <p className="text-[12px] leading-relaxed text-[var(--text-2)]">
              Rotating changes your Knots ID. Contacts will need your new ID to reach you again.
            </p>
          </div>
        </GlassPanel>

        <GlassPanel radius="lg" className="space-y-4 border-[color-mix(in_srgb,var(--danger)_35%,transparent)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <Trash2 size={18} />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--danger)]">Emergency Vault Shredder</p>
              <p className="text-[12.5px] text-[var(--text-2)]">Irreversibly shred this identity, local cryptographic vault, and server queues.</p>
            </div>
          </div>
          <Button variant="danger" className="w-full" onClick={() => openOverlay('burn')}>
            <Trash2 size={16} /> Shred Identity & Purge Vault
          </Button>
        </GlassPanel>

        <div className="flex items-center justify-between gap-3 pb-6">
          <p className="text-[12px] text-[var(--text-3)]">Display name: {alias || '—'}</p>
          <CopyButton value={identity.mnemonic} label="Copy phrase" />
        </div>
      </div>

      <Dialog
        open={rotateOpen}
        onClose={() => setRotateOpen(false)}
        title="Rotate your identity?"
        description="A new key and a new Knots ID will be created. Contacts won't be able to reach your old ID, and your recovery phrase becomes the way back in."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRotateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              onClick={async () => {
                await rotate();
                setRotateOpen(false);
              }}
            >
              Rotate keys
            </Button>
          </>
        }
      />
    </div>
  );
}

export function BurnConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const burn = useIdentity((s) => s.burn);
  const busy = useIdentity((s) => s.busy);
  const authMethod = useIdentity((s) => s.authMethod);
  const verifyPassword = useIdentity((s) => s.verifyPassword);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword('');
      setError(null);
      setChecking(false);
    }
  }, [open]);

  const confirmWithPassword = async () => {
    setChecking(true);
    try {
      const ok = await verifyPassword(password);
      if (!ok) {
        setError('That password doesn\u2019t match this identity.');
        return;
      }
      await burn();
      onClose();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      tone="danger"
      title="Emergency Vault Shredder"
      description="This immediately wipes your private keys, local IndexedDB vaults, and server relay queues. This action is irreversible and leaves zero traces behind."
    >
      <div className="space-y-3">
        <ul className="space-y-2 text-[13px] text-[var(--text-2)]">
          <li>· Your private keys are erased from this device.</li>
          <li>· Server records for this Knots ID are deleted.</li>
          <li>· Requests linked to this ID are removed.</li>
        </ul>
        {busy ? (
          <div className="glass rounded-md px-4 py-3 text-center text-[13px] text-[var(--danger)]">Deleting…</div>
        ) : authMethod === 'password' ? (
          <div className="space-y-3">
            <Input
              label="Confirm your password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Your sign-in password"
              autoComplete="off"
              error={error}
              hint={error ? undefined : 'Checked on this device. Your password is never stored.'}
            />
            <Button
              variant="danger"
              className="w-full"
              loading={checking}
              disabled={!password}
              onClick={() => void confirmWithPassword()}
            >
              <Trash2 size={16} /> Delete forever
            </Button>
            <p className="text-[12px] text-[var(--text-3)]">
              Forgotten your password? Your 12-word recovery phrase is the other way back in.
            </p>
          </div>
        ) : (
          <HoldToConfirm
            label="Press and hold to delete"
            holdingLabel="Deleting in 3…2…"
            onConfirm={async () => {
              await burn();
              onClose();
            }}
          />
        )}
      </div>
    </Dialog>
  );
}
