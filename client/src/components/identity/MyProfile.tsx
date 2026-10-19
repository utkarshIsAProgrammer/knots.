import { useEffect, useState } from 'react';
import { LogOut, Shield, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tabs } from '../ui/Tabs';
import { Dialog } from '../ui/Dialog';
import { Avatar } from '../ui/Avatar';
import { KnotIdCard } from './KnotIdCard';
import { Overline } from '../landing/Reveal';
import { useIdentity } from '../../features/identity';
import { useUI } from '../../features/ui';

type Tab = 'profile' | 'security' | 'about';

export function MyProfile() {
  const { identity, alias, email, authUser, authMethod, avatarSeed, setAlias, signOut, busy } = useIdentity();
  const setSection = useUI((s) => s.setSection);
  const openOverlay = useUI((s) => s.openOverlay);
  const [tab, setTab] = useState<Tab>('profile');
  const [draft, setDraft] = useState(alias);
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Keep the input and the header in step with the stored name.
  useEffect(() => setDraft(alias), [alias]);

  // Persist shortly after you stop typing, so the name stays live everywhere.
  useEffect(() => {
    if (draft.trim() === alias) return;
    const t = setTimeout(() => setAlias(draft.trim()), 400);
    return () => clearTimeout(t);
  }, [draft, alias, setAlias]);

  if (!identity) return null;

  const shownName = draft.trim() || 'No name set';

  return (
    <div className="scroll-area h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-5 px-5 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar knotId={avatarSeed || identity.knotId} size="xl" />
          <div>
            <p className="text-[20px] font-semibold tracking-[-0.03em]">{shownName}</p>
            <p className="mono mt-0.5 text-[12px] text-[var(--text-3)]">{identity.safetyNumber}</p>
          </div>
        </div>

        <Tabs
          tabs={[
            { value: 'profile', label: 'Profile' },
            { value: 'security', label: 'Security' },
            { value: 'about', label: 'About' }
          ]}
          value={tab}
          onChange={setTab}
          className="justify-center"
        />

        {tab === 'profile' && (
          <div className="space-y-4">
            <GlassPanel elevation="raised" radius="lg" className="space-y-4">
              <Input
                label="Display name"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="How you see yourself"
                hint="Only stored on your device."
                maxLength={24}
              />
              {authMethod === 'password' && authUser && (
                <p className="px-1 text-[12px] text-[var(--text-3)]">
                  Sign-in name: <span className="text-[var(--text-2)]">{authUser}</span> · changing your display name
                  doesn&apos;t change it
                </p>
              )}
              {email && (
                <p className="px-1 text-[12px] text-[var(--text-3)]">
                  Email on file: <span className="text-[var(--text-2)]">{email}</span> · kept on this device only
                </p>
              )}
            </GlassPanel>
            <KnotIdCard identity={identity} />
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-3">
            <GlassPanel radius="lg" className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em]">Security</p>
                  <p className="text-[12.5px] text-[var(--text-2)]">Backups, key rotation and emergency delete.</p>
                </div>
              </div>
              <Button variant="primary" className="w-full" onClick={() => setSection('vault')}>
                Open security
              </Button>
            </GlassPanel>

            <GlassPanel className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em]">Threat model</p>
                  <p className="text-[12.5px] text-[var(--text-2)]">Read how Knots guarantees zero metadata and forward secrecy.</p>
                </div>
              </div>
              <Button variant="glass" className="w-full justify-start" onClick={() => openOverlay('threat')}>
                <Shield size={16} /> Read the details
              </Button>
            </GlassPanel>

            <GlassPanel radius="lg" className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                  <LogOut size={18} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em]">Sign out</p>
                  <p className="text-[12.5px] text-[var(--text-2)]">
                    Clears this device. Come back with your username and password.
                  </p>
                </div>
              </div>
              <Button variant="glass" className="w-full justify-start" onClick={() => setSignOutOpen(true)}>
                <LogOut size={16} /> Sign out of this device
              </Button>
            </GlassPanel>
          </div>
        )}

        {tab === 'about' && (
          <GlassPanel elevation="raised" radius="lg" className="space-y-4">
            <Overline>About Knots.</Overline>
            <p className="text-[14px] leading-relaxed text-[var(--text-2)]">
              Knots is a private messenger where the server can&apos;t read your messages. There&apos;s no account to
              verify and nothing about you is uploaded — your keys are created on this device, and a username plus
              password only rebuild them for you. People reach you through a shareable Knots ID.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                ['Protocol', 'KNOTS-v1'],
                ['Cipher', 'AES-256-GCM'],
                ['Key agreement', 'X3DH'],
                ['Session', 'Double Ratchet']
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#000000] px-3.5 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-3)]">{label}</p>
                  <p className="mono mt-1 text-[13px]">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[var(--text-3)]">Client build · vite · react 18 · typescript</p>
          </GlassPanel>
        )}
      </div>

      <Dialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out of this session?"
        description="Sign out of this session. Your auto-delete messages remain active until their countdown timers expire. Signing in with your username and password brings your identity back."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setSignOutOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              onClick={async () => {
                await signOut();
                setSignOutOpen(false);
              }}
            >
              Sign out
            </Button>
          </>
        }
      />
    </div>
  );
}
