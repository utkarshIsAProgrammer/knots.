import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCheck,
  Database,
  EyeOff,
  Fingerprint,
  Flame,
  Ghost,
  KeyRound,
  Loader2,
  Lock,
  Moon,
  Send,
  ShieldCheck,
  Smile,
  Sun,
  X,
  Zap
} from 'lucide-react';
import { KnotMark, Wordmark } from '../ui/Logo';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { Input } from '../ui/Input';
import { Overline, Reveal } from './Reveal';
import { useTheme } from '../../features/theme';
import { useIdentity } from '../../features/identity';
import { api } from '../../lib/api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._\- ]+$/;

type Mode = 'create' | 'signin';

interface AuthCardProps {
  onRestore: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

function AuthCard({ onRestore, mode, onModeChange }: AuthCardProps) {
  const signUp = useIdentity((s) => s.signUp);
  const signIn = useIdentity((s) => s.signIn);
  const busy = useIdentity((s) => s.busy);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; form?: string }>({});
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Debounced real-time username availability check for registration
  useEffect(() => {
    if (mode !== 'create') {
      setUsernameStatus('idle');
      return;
    }

    const trimmed = username.trim();
    if (trimmed.length < 2 || !USERNAME_RE.test(trimmed)) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkUsername(trimmed);
        if (res.available) {
          setUsernameStatus('available');
          setErrors((prev) => (prev.username?.includes('taken') ? { ...prev, username: undefined } : prev));
        } else {
          setUsernameStatus('taken');
        }
      } catch {
        setUsernameStatus('idle');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  const validate = () => {
    const next: { username?: string; email?: string; password?: string } = {};
    const name = username.trim();
    if (!name) next.username = 'Pick a username.';
    else if (name.length < 2) next.username = 'Use at least 2 characters.';
    else if (name.length > 24) next.username = 'Keep it under 24 characters.';
    else if (!USERNAME_RE.test(name)) next.username = 'Letters, numbers, spaces, . _ - only.';
    else if (mode === 'create' && usernameStatus === 'taken') next.username = 'This username is already taken. Please choose another.';

    if (mode === 'create' && email.trim() && !EMAIL_RE.test(email.trim())) {
      next.email = "That doesn't look like an email.";
    }
    if (password.length < 8) next.password = 'Use at least 8 characters.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setErrors({});
    try {
      if (mode === 'create') {
        await signUp(username.trim(), password, email.trim() || undefined);
      } else {
        await signIn(username.trim(), password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (lower.includes('already taken') || lower.includes('taken')) {
        setErrors({ username: msg });
        setUsernameStatus('taken');
      } else if (lower.includes('no account found') || lower.includes('no identity found') || lower.includes('not found')) {
        setErrors({ username: msg });
      } else if (lower.includes('incorrect password') || lower.includes('password')) {
        setErrors({ password: msg });
      } else {
        setErrors({ form: msg });
      }
    }
  };

  const usernameTrailing = mode === 'create' ? (
    usernameStatus === 'checking' ? (
      <Loader2 size={15} className="animate-spin text-zinc-400" />
    ) : usernameStatus === 'available' ? (
      <Check size={15} className="text-emerald-500" />
    ) : usernameStatus === 'taken' ? (
      <X size={15} className="text-rose-500" />
    ) : null
  ) : null;

  const usernameHint = errors.username
    ? undefined
    : mode === 'create'
    ? usernameStatus === 'available'
      ? '✓ Username is available'
      : usernameStatus === 'taken'
      ? '✗ Username is already taken'
      : 'Your unique handle. Used to derive your sovereign keypair.'
    : 'Enter your registered sovereign handle.';

  return (
    <GlassPanel elevation="floating" radius="xl" className="w-full max-w-md p-6 sm:p-7 border border-zinc-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#000000]">
      {/* Boxy Tab Switcher */}
      <div className="mb-6 flex rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] p-1">
        <button
          type="button"
          onClick={() => {
            onModeChange('create');
            setErrors({});
          }}
          className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${
            mode === 'create'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm border border-zinc-300/80 dark:border-white/20'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Create Identity
        </button>
        <button
          type="button"
          onClick={() => {
            onModeChange('signin');
            setErrors({});
            setUsernameStatus('idle');
          }}
          className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${
            mode === 'signin'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm border border-zinc-300/80 dark:border-white/20'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Sign In
        </button>
      </div>

      <div className="mb-5 space-y-1.5">
        <Overline>{mode === 'create' ? 'Instant Zero-Knowledge Setup' : 'Welcome back'}</Overline>
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-white">
          {mode === 'create' ? 'Create your sovereign identity.' : 'Sign back in.'}
        </h2>
        <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {mode === 'create'
            ? 'Choose a unique handle. Cryptographic keys are derived deterministically in WebCrypto.'
            : 'Enter your unique username and password to restore and unlock your encrypted vault.'}
        </p>
      </div>

      {errors.form && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-[12.5px] text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <X size={14} className="shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-3.5"
      >
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="anonymous name"
          autoComplete="off"
          error={errors.username}
          hint={usernameHint}
          trailing={usernameTrailing}
        />
        {mode === 'create' && (
          <Input
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anonymous@relay.local (optional)"
            autoComplete="off"
            error={errors.email}
            hint={errors.email ? undefined : 'Kept locally. Never broadcasted or shared.'}
          />
        )}
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="off"
          error={errors.password}
          hint={errors.password ? undefined : 'Stretches with 100k PBKDF2 rounds for AES encryption.'}
        />

        <Button variant="primary" size="lg" type="submit" loading={busy} className="w-full rounded-lg font-medium">
          {mode === 'create' ? 'Initialize Sovereign Identity' : 'Authenticate & Unlock Vault'}{' '}
          <ArrowRight size={16} />
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px]">
        <button
          type="button"
          onClick={() => {
            onModeChange(mode === 'create' ? 'signin' : 'create');
            setErrors({});
            setUsernameStatus('idle');
          }}
          className="text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
        >
          {mode === 'create' ? 'Already have an account? Sign In' : 'Need an account? Create Identity'}
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
        >
          <KeyRound size={13} /> Recovery phrase
        </button>
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-900/40 px-3.5 py-3">
        <Fingerprint size={15} className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
        <p className="text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {mode === 'signin'
            ? 'Have a 12-word backup phrase instead? Click "Recovery phrase" to restore directly without a password.'
            : 'Unique handles prevent key collisions and impersonation. Your private keys never leave this device.'}
        </p>
      </div>
    </GlassPanel>
  );
}

interface MockMessage {
  id: string;
  sender: 'me' | 'peer';
  text: string;
  time: string;
  burnSeconds: number;
  reactions?: Record<string, number>;
}

function InteractiveChatPreview() {
  const [messages, setMessages] = useState<MockMessage[]>([
    {
      id: '1',
      sender: 'peer',
      text: 'Keys rotated on-device via double ratchet. The relayer sees 0 bytes of plaintext.',
      time: '10:41 PM',
      burnSeconds: 24,
      reactions: { '🔥': 2 }
    },
    {
      id: '2',
      sender: 'me',
      text: 'Confirmed. Even our contact list and display names are hashed with PBKDF2.',
      time: '10:42 PM',
      burnSeconds: 48,
      reactions: { '🔒': 1 }
    },
    {
      id: '3',
      sender: 'peer',
      text: 'Self-destruct timer running. 100% ephemeral RAM relay.',
      time: '10:42 PM',
      burnSeconds: 15
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [burnTimer, setBurnTimer] = useState('30s');

  // Decrement burn countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setMessages((prev) =>
        prev
          .map((m) => ({ ...m, burnSeconds: m.burnSeconds - 1 }))
          .filter((m) => m.burnSeconds > 0)
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: MockMessage = {
      id: Date.now().toString(),
      sender: 'me',
      text: inputText.trim(),
      time: 'Just now',
      burnSeconds: 30
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Trigger mock auto-reply after 1.2s
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'peer',
          text: 'Received encrypted ciphertext blob. Verified and decrypted in WebCrypto.',
          time: 'Just now',
          burnSeconds: 25,
          reactions: { '⚡': 1 }
        }
      ]);
    }, 1200);
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const current = m.reactions?.[emoji] || 0;
        const next = current > 0 ? current - 1 : current + 1;
        const updated = { ...(m.reactions || {}) };
        if (next === 0) delete updated[emoji];
        else updated[emoji] = next;
        return { ...m, reactions: updated };
      })
    );
  };

  return (
    <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white/95 dark:bg-[#000000] shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col h-[520px]">
      {/* Mock Chat Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.08] px-4 py-3 bg-zinc-50/80 dark:bg-zinc-950/60">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-[13px] shadow-sm">
            EV
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-black bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[14px] text-zinc-900 dark:text-white">Elena Vance</span>
              <span className="inline-flex items-center gap-1 rounded bg-zinc-200/80 dark:bg-white/10 px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-700 dark:text-zinc-300">
                <Lock size={10} className="text-emerald-500" /> Verified
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="font-mono">knt_8f9c2d1e...</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Flame size={12} /> {burnTimer} burn
          </span>
        </div>
      </div>

      {/* Mock Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-100/40 dark:bg-[#000000]/40">
        <div className="flex justify-center my-1">
          <span className="rounded-md border border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-zinc-900/80 px-2.5 py-0.5 text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400">
            Today • Double Ratchet Active
          </span>
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'} transition-all`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 shadow-sm text-[13.5px] leading-relaxed transition-all ${
                m.sender === 'me'
                  ? 'bg-[#e4e4e7] dark:bg-[#1f1f23] text-zinc-900 dark:text-white border border-[#d4d4d8] dark:border-white/10'
                  : 'bg-white dark:bg-[#000000] text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/[0.08]'
              }`}
            >
              <p>{m.text}</p>
              <div className="mt-1 flex items-center justify-end gap-1.5 text-[10.5px] opacity-75">
                <span>{m.time}</span>
                {m.sender === 'me' && <CheckCheck size={12} className="text-[#0284c7] dark:text-emerald-400" />}
              </div>
            </div>

            {/* Sub-meta: burn chip & reactions */}
            <div className="mt-1 flex items-center gap-1.5 px-1">
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-amber-600 dark:text-amber-400">
                <Flame size={10} /> {m.burnSeconds}s
              </span>

              {m.reactions &&
                Object.entries(m.reactions).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => toggleReaction(m.id, emoji)}
                    className="inline-flex items-center gap-1 rounded border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 hover:scale-105 transition-transform"
                  >
                    <span>{emoji}</span>
                    <span className="font-mono">{count}</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mock Composer */}
      <div className="border-t border-zinc-200 dark:border-white/[0.08] p-3 bg-white dark:bg-[#000000] flex items-center gap-2">
        <button
          type="button"
          aria-label="Emoji tray"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <Smile size={18} />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type an anonymous message..."
          className="flex-1 rounded-md border border-zinc-200 dark:border-white/[0.09] bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 text-[13px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-white/20"
        />

        <button
          type="button"
          onClick={() => setBurnTimer(burnTimer === '30s' ? '15s' : '30s')}
          title="Toggle burn timer"
          className="flex h-8 w-8 items-center justify-center rounded-md text-amber-500 hover:bg-amber-500/10 transition-colors"
        >
          <Flame size={17} />
        </button>

        <button
          type="button"
          onClick={handleSend}
          aria-label="Send message"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm hover:opacity-90 transition-opacity"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

const radarSpecs = [
  {
    icon: Database,
    title: 'Zero Metadata Stored',
    subtitle: 'RAM-Only Ephemeral Relaying',
    body: 'Relayers hold 0 bytes of persistent conversation history. Once delivered to your device, messages are immediately purged from server memory.'
  },
  {
    icon: Lock,
    title: 'AES-256-GCM + Ratchet',
    subtitle: 'Continuous Key Rotation',
    body: 'Every message is sealed with a unique ephemeral session key derived locally in WebCrypto. Complete forward and backward secrecy.'
  },
  {
    icon: EyeOff,
    title: '100% Anonymous Identity',
    subtitle: 'No Phone, Email, or KYC',
    body: 'No phone numbers or telecom identifiers. Your sovereign Knots ID is cryptographically derived directly on your browser or phone.'
  },
  {
    icon: Zap,
    title: '<10ms SSE Real-Time Stream',
    subtitle: 'Zero-Latency Delivery',
    body: 'Server-Sent Events streaming delivers encrypted packets instantaneously to IndexedDB with automatic background queue synchronization.'
  }
];

const comparisons = [
  {
    vector: 'Account Identity',
    bigTech: 'Mandatory Phone number, SMS OTP, or Google account',
    knots: 'Sovereign Knots ID, zero personal identifiers'
  },
  {
    vector: 'Cryptographic Keys',
    bigTech: 'Managed or synced across cloud infrastructure',
    knots: '100% Client-Side WebCrypto on local device'
  },
  {
    vector: 'Contact Graph',
    bigTech: 'Centralized address book uploaded to servers',
    knots: 'Locally salted & encrypted contact storage'
  },
  {
    vector: 'Message Persistence',
    bigTech: 'Indefinite backup files on Google Drive / iCloud',
    knots: 'Strict auto-burn timers (15s to 24h) + emergency vault shredder'
  },
  {
    vector: 'Server Seizure Immunity',
    bigTech: 'Relayer holds metadata, timestamps, and graph',
    knots: 'Blind relayer: Scrambled IDs and zero plaintext'
  }
];

const steps = [
  {
    n: '01',
    title: 'Derive Sovereign Identity',
    body: 'Choose any handle. Your browser computes an Ed25519/X25519 keypair and creates your 12-word recovery phrase locally.'
  },
  {
    n: '02',
    title: 'Exchange Knots IDs',
    body: 'Share your short Knots ID or scan a QR code. Contact names and nicknames are kept strictly inside your encrypted local vault.'
  },
  {
    n: '03',
    title: 'Ephemeral Zero-Trace Chat',
    body: 'Send messages, custom GIFs, and stickers. Auto-burn countdown timers guarantee messages self-destruct on all devices.'
  }
];

export function Landing({ onRestore }: { onRestore: () => void }) {
  const { resolved, toggle } = useTheme();
  const authRef = useRef<HTMLDivElement>(null);
  const [authMode, setAuthMode] = useState<Mode>('create');

  const scrollToAuth = (targetMode: Mode = 'create') => {
    setAuthMode(targetMode);
    authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="relative z-10 min-h-full">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 px-4 pt-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-black/70 px-4 py-2.5 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2.5">
            <KnotMark className="h-7 w-7" />
            <Wordmark />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-lg h-9 w-9 p-0 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => scrollToAuth('signin')}
              className="rounded-lg font-medium text-[13px] px-3.5 py-1.5"
            >
              Sign In <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        {/* Hero Section */}
        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="space-y-6">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/[0.09] bg-zinc-100/90 dark:bg-zinc-900/60 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] font-medium tracking-tight text-zinc-700 dark:text-zinc-300">
                  Zero-Knowledge End-to-End Encryption
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="font-display text-[clamp(2.5rem,6vw,4.4rem)] font-bold leading-[1.04] tracking-[-0.04em] text-zinc-900 dark:text-white">
                Anonymous messaging.
                <br />
                <span className="filament-text">Zero trace left behind.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="max-w-lg text-[16.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                No phone number. No centralized user database. No plaintext stored on servers. Knots derives your keys
                directly on your device — making conversations mathematically unreadable to everyone else.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => scrollToAuth('create')}
                  className="rounded-lg font-medium"
                >
                  Create Identity <ArrowRight size={17} />
                </Button>
                <Button variant="glass" size="lg" onClick={onRestore} className="rounded-lg font-medium">
                  <Fingerprint size={17} /> Restore Phrase
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="flex flex-wrap items-center gap-4 text-[12px] font-mono text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-500" /> AES-256-GCM
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-500" /> Double Ratchet
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-500" /> Auto-Burn Timers
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="flex justify-center lg:justify-end">
            <div ref={authRef} className="w-full max-w-md">
              <AuthCard onRestore={onRestore} mode={authMode} onModeChange={setAuthMode} />
            </div>
          </Reveal>
        </section>

        {/* Live Interactive Knots Chat UI Showcase */}
        <section className="py-12 border-t border-zinc-200 dark:border-white/[0.08]">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <Overline>Live Interface Preview</Overline>
            <h2 className="font-display text-[28px] sm:text-[34px] font-bold tracking-tight text-zinc-900 dark:text-white">
              Precision boxy UI. Blazing speed.
            </h2>
            <p className="text-[14.5px] text-zinc-600 dark:text-zinc-400">
              Try the interactive preview below. Experience real-time message bubbles, instant reactions, and
              ephemeral burn countdowns.
            </p>
          </div>

          <Reveal className="flex justify-center">
            <InteractiveChatPreview />
          </Reveal>
        </section>

        {/* Cryptographic Radar Grid */}
        <section className="py-14 border-t border-zinc-200 dark:border-white/[0.08]">
          <div className="mb-8">
            <Overline>Cryptographic Architecture</Overline>
            <h2 className="mt-2 font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-zinc-900 dark:text-white">
              Built for sovereign privacy.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {radarSpecs.map((spec, i) => (
              <Reveal key={spec.title} delay={i * 0.05}>
                <div className="h-full rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#000000] p-5 shadow-sm space-y-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    <spec.icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">{spec.title}</h3>
                    <p className="text-[11.5px] font-mono text-zinc-500 dark:text-zinc-400">{spec.subtitle}</p>
                  </div>
                  <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">{spec.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Head-to-Head Comparison */}
        <section className="py-14 border-t border-zinc-200 dark:border-white/[0.08]">
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <Overline>Architectural Differences</Overline>
            <h2 className="mt-2 font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-zinc-900 dark:text-white">
              Knots vs. Traditional Messengers
            </h2>
            <p className="mt-2 text-[14px] text-zinc-600 dark:text-zinc-400">
              Why end-to-end encryption alone isn&apos;t enough if the relayer retains metadata.
            </p>
          </div>

          <Reveal>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#000000] shadow-sm">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-zinc-950/60">
                    <th className="p-4 font-semibold text-zinc-900 dark:text-white">Vector</th>
                    <th className="p-4 font-semibold text-zinc-500 dark:text-zinc-400">
                      Big Tech (WhatsApp, Signal, Telegram)
                    </th>
                    <th className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">Knots Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.08]">
                  {comparisons.map((item) => (
                    <tr key={item.vector} className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                      <td className="p-4 font-medium text-zinc-900 dark:text-white">{item.vector}</td>
                      <td className="p-4 text-zinc-500 dark:text-zinc-400">{item.bigTech}</td>
                      <td className="p-4 font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                        <Check size={15} className="text-emerald-500 shrink-0" />
                        <span>{item.knots}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* Threat Model */}
        <section className="py-14 border-t border-zinc-200 dark:border-white/[0.08]">
          <Reveal>
            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#000000] p-6 sm:p-10 shadow-sm">
              <Overline>Cryptographic Guarantees</Overline>
              <h2 className="mt-3 font-display text-[26px] sm:text-[32px] font-bold tracking-tight text-zinc-900 dark:text-white">
                Honest about what we protect — and what we can&apos;t.
              </h2>
              <div className="mt-8 grid gap-8 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={16} /> Protected Guarantees
                  </div>
                  <ul className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Message contents — encrypted on your device before touching the wire.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Contact aliases and notes — stored only in your encrypted local vault.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Private keys and recovery seeds — never uploaded or synced to any cloud.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Server breach immunity — the relayer holds nothing that can decrypt traffic.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-5">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Ghost size={16} /> Physical & Host Threat Boundaries
                  </div>
                  <ul className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span>Compromised device OS: If keyloggers or malware infect your OS, inputs can be captured.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span>Physical shoulder surfing: Always protect your screen in crowded public areas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span>Recipient discretion: A peer can photograph their screen with an external camera.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span>Lost master password: Without your password or 12-word seed, keys cannot be recovered.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* 3 Steps */}
        <section className="py-14 border-t border-zinc-200 dark:border-white/[0.08]">
          <div className="mb-8">
            <Overline>Onboarding Workflow</Overline>
            <h2 className="mt-2 font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-zinc-900 dark:text-white">
              Start messaging in seconds.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.06}>
                <div className="h-full rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#000000] p-6 shadow-sm">
                  <span className="font-mono text-[12px] font-semibold text-zinc-400 dark:text-zinc-500">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-[16px] font-semibold text-zinc-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-white/[0.08] px-5 py-10 bg-zinc-50/60 dark:bg-black">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <KnotMark className="h-6 w-6" />
            <Wordmark />
          </div>
          <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
            No accounts. No telemetry. No plaintext. Ever.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {resolved === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>{resolved === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
