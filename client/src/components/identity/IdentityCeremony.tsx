import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { TextArea } from '../ui/Input';
import { KnotMark, Wordmark } from '../ui/Logo';
import { MnemonicGrid } from './MnemonicGrid';
import { KnotIdCard } from './KnotIdCard';
import { CopyButton } from '../ui/CopyButton';
import { Overline } from '../landing/Reveal';
import { isValidMnemonic } from '../../lib/crypto/webcrypto';
import { useIdentity } from '../../features/identity';
import type { Identity } from '../../lib/api/types';

type Step = 'choose' | 'forge' | 'reveal' | 'ready' | 'recover';

const transition = { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const };

export function IdentityCeremony({ onDone, initialStep = 'choose' }: { onDone: () => void; initialStep?: Step }) {
  const { create, recover, busy } = useIdentity();
  const [step, setStep] = useState<Step>(initialStep);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);

  const forge = async () => {
    setStep('forge');
    const created = await create('base58');
    setIdentity(created);
    setStep('reveal');
  };

  const doRecover = async () => {
    if (!isValidMnemonic(phrase)) {
      setError('That phrase is not a valid 12-word Knots mnemonic.');
      return;
    }
    setError(null);
    await recover(phrase);
    onDone();
  };

  return (
    <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-5 py-14">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <KnotMark className="h-7 w-7" />
          <Wordmark />
        </div>

        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={transition}>
              <div className="mb-7 space-y-3 text-center">
                <Overline>Set up your identity</Overline>
                <h1 className="font-display text-[clamp(1.9rem,4.6vw,2.8rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
                  Create your <span className="filament-text">identity</span>.
                </h1>
                <p className="mx-auto max-w-md text-[14.5px] leading-relaxed text-[var(--text-2)]">
                  Prefer to skip the username and password? Create keys straight on this device — then a 12-word
                  phrase is the only way back in.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={forge} className="group text-left">
                  <GlassPanel elevation="raised" radius="lg" className="h-full transition-transform group-hover:-translate-y-0.5">
                    <div className="filament-bg grid h-11 w-11 place-items-center rounded-md text-[var(--on-accent)]">
                      <Sparkles size={19} />
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.02em]">Create a new identity</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-2)]">
                      Generate new keys and a Knots ID. Best for a new device.
                    </p>
                  </GlassPanel>
                </button>
                <button onClick={() => setStep('recover')} className="group text-left">
                  <GlassPanel radius="lg" className="h-full transition-transform group-hover:-translate-y-0.5">
                    <div className="glass grid h-11 w-11 place-items-center rounded-md text-[var(--accent-2)]">
                      <KeyRound size={19} />
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.02em]">Restore an identity</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-2)]">
                      Bring back an identity you already backed up.
                    </p>
                  </GlassPanel>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'forge' && (
            <motion.div key="forge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                className="grid h-24 w-24 place-items-center"
              >
                <KnotMark className="h-20 w-20" />
              </motion.div>
              <div className="space-y-1 text-center">
                <p className="text-[15px] font-medium">Creating your keys…</p>
                <p className="mono text-[12px] text-[var(--text-3)]">WebCrypto · X25519 · Ed25519</p>
              </div>
            </motion.div>
          )}

          {step === 'reveal' && identity && (
            <motion.div key="reveal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={transition} className="space-y-5">
              <div className="space-y-2 text-center">
                <Overline>Step 1 of 2 — Backup</Overline>
                <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-semibold tracking-[-0.04em]">
                  Write these twelve words down.
                </h1>
                <p className="mx-auto max-w-md text-[13.5px] leading-relaxed text-[var(--text-2)]">
                  These words are the only way to recover your identity. We never see them and can&apos;t recover them
                  for you.
                </p>
              </div>
              <MnemonicGrid mnemonic={identity.mnemonic} />
              <div className="flex items-center justify-between gap-3">
                <CopyButton value={identity.mnemonic} label="Copy phrase" />
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text-2)]">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  I&apos;ve written this down
                </label>
              </div>
              <Button variant="primary" size="lg" className="w-full" disabled={!confirmed} onClick={() => setStep('ready')}>
                Continue <ArrowRight size={17} />
              </Button>
            </motion.div>
          )}

          {step === 'ready' && identity && (
            <motion.div key="ready" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={transition} className="space-y-5">
              <div className="space-y-2 text-center">
                <Overline>Step 2 of 2 — Your Knots ID</Overline>
                <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-semibold tracking-[-0.04em]">
                  This is your Knots ID.
                </h1>
                <p className="mx-auto max-w-md text-[13.5px] leading-relaxed text-[var(--text-2)]">
                  Share it only with people you trust. Anyone who has it can send you a request.
                </p>
              </div>
              <KnotIdCard identity={identity} />
              <Button variant="primary" size="lg" className="w-full" onClick={onDone}>
                Get started <ArrowRight size={17} />
              </Button>
            </motion.div>
          )}

          {step === 'recover' && (
            <motion.div key="recover" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={transition} className="space-y-5">
              <button
                onClick={() => {
                  setStep('choose');
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div className="space-y-2 text-center">
                <Overline>Recovery</Overline>
                <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] font-semibold tracking-[-0.04em]">
                  Enter your twelve words.
                </h1>
              </div>
              <form noValidate onSubmit={(e) => { e.preventDefault(); void doRecover(); }}>
                <TextArea
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="void cipher shadow bunker vector knot …"
                  error={error}
                  hint="Words are lower-case and space separated."
                  className="mono"
                  autoFocus
                />
                <div className="mt-4 flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/5 dark:bg-[#000000] px-3.5 py-3">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" />
                  <p className="text-[12.5px] leading-relaxed text-[var(--text-2)]">
                    Recovery happens entirely on this device. Your phrase is never sent anywhere.
                  </p>
                </div>
                <Button variant="primary" size="lg" type="submit" loading={busy} className="mt-4 w-full">
                  Recover identity
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-[11.5px] text-[var(--text-3)]">
          Keys are generated locally. Nothing about you is uploaded.
        </p>
      </div>
    </div>
  );
}
