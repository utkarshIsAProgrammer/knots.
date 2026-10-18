import { Sheet } from '../ui/Sheet';
import { Overline } from '../landing/Reveal';

const protectedItems = [
  ['Message contents', 'Encrypted with AES-256-GCM on your device before the server ever sees them.'],
  ['Private keys & phrases', 'Created and stored on your device. Never sent, logged, or backed up for you.'],
  ['Contact names', 'Only labels on your device. The server learns nothing about who you talk to.'],
  ['A breached server', 'It holds only scrambled IDs, public keys and encrypted data — nothing it can read.']
];

const exposedItems = [
  ['Timing', 'The server can see when a message is sent, how big it is and its timer.'],
  ['Traffic patterns', 'Observers on the network may match up your traffic.'],
  ['A hacked device', 'Malware, a hostile update or physical access defeats any encryption.'],
  ['Who you share your ID with', 'A Knots ID works like a key. Share it carefully.']
];

const responsibilities = [
  'Back up your 12-word phrase offline — it is the only way back in.',
  'Confirm a new contact is really them before you trust the chat.',
  'Keep your device updated — no encryption can protect a hacked phone.',
  'Turn on auto-delete for sensitive chats. Assume anything received can be screenshotted.'
];

export function ThreatModelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Threat model" description="What Knots protects — and what it can't.">
      <div className="space-y-6 pb-4">
        <p className="font-display text-[17px] italic leading-relaxed text-[var(--text-2)]">
          “Encryption protects the message on its way. It does not protect the person at either end.”
        </p>

        <section className="space-y-3">
          <Overline>Protected</Overline>
          <div className="space-y-3">
            {protectedItems.map(([title, body]) => (
              <div key={title} className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#000000] p-4 shadow-sm hover:border-zinc-300 dark:hover:border-white/15 transition-colors">
                <p className="text-[14px] font-semibold text-[var(--success)]">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-2)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Overline>Not protected</Overline>
          <div className="space-y-3">
            {exposedItems.map(([title, body]) => (
              <div key={title} className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#000000] p-4 shadow-sm hover:border-zinc-300 dark:hover:border-white/15 transition-colors">
                <p className="text-[14px] font-semibold text-[var(--warning)]">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-2)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Overline>Your responsibilities</Overline>
          <ul className="space-y-2.5">
            {responsibilities.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                <span className="filament-text mt-0.5 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <p className="border-t border-[var(--hairline)] pt-5 text-[12px] leading-relaxed text-[var(--text-3)]">
          Knots is built for people who can&apos;t afford to be careless. It doesn&apos;t replace good security
          habits — and it doesn&apos;t pretend to.
        </p>
      </div>
    </Sheet>
  );
}
