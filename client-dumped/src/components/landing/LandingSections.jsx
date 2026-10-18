import React, { useState } from 'react';
import { Reveal, SectionHeading } from './Primitives.jsx';

const IMG = {
  mesh: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=black%20and%20white%20macro%20photograph%20of%20interwoven%20threads%20pulled%20into%20a%20taut%20mesh%2C%20dark%20background%2C%20single%20soft%20light%2C%20high%20contrast%20monochrome%2C%20fine%20film%20grain&image_size=landscape_4_3',
  hands: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=black%20and%20white%20photograph%2C%20two%20hands%20reaching%20toward%20each%20other%20about%20to%20clasp%2C%20tight%20crop%2C%20dramatic%20side%20light%2C%20high%20contrast%20monochrome%2C%20film%20grain&image_size=landscape_4_3',
  gears: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=black%20and%20white%20photograph%20of%20a%20precision%20mechanical%20ratchet%20and%20brass%20gears%20resting%20on%20plain%20paper%2C%20studio%20light%2C%20minimal%20composition%2C%20high%20contrast%20monochrome&image_size=landscape_4_3',
  paper: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=black%20and%20white%20macro%20photograph%20of%20torn%20paper%20scraps%20dissolving%20into%20shadow%20on%20a%20white%20surface%2C%20minimal%2C%20high%20contrast%20monochrome%2C%20fine%20film%20grain&image_size=landscape_4_3',
  corridor: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=black%20and%20white%20architectural%20photograph%2C%20brutalist%20concrete%20corridor%20pierced%20by%20one%20shaft%20of%20daylight%2C%20empty%20and%20quiet%2C%20minimal%20composition%2C%20high%20contrast%20monochrome%2C%20fine%20film%20grain&image_size=portrait_4_3'
};

const CAPABILITIES = [
  {
    idx: '01',
    title: 'Relay mesh',
    desc: 'Messages travel through stateless relays that hold nothing but ciphertext — no sender, no recipient, no readable body.',
    img: IMG.mesh
  },
  {
    idx: '02',
    title: 'X3DH handshake',
    desc: 'Two strangers agree on a shared secret from published keys alone. The server brokers the handshake; it never learns the result.',
    img: IMG.hands
  },
  {
    idx: '03',
    title: 'Double Ratchet',
    desc: 'Every message gets its own key. Compromise one and the rest stay sealed — forward secrecy and post-compromise security, by default.',
    img: IMG.gears
  },
  {
    idx: '04',
    title: 'Disappearing messages',
    desc: 'Set a timer and the words are gone from both devices when it runs out. Delete means delete, on the wire and on disk.',
    img: IMG.paper
  }
];

const PRINCIPLES = [
  ['No accounts', 'A Knot ID is generated on your device. No email, no phone number, nothing to leak.'],
  ['No plaintext, ever', 'Encryption happens before a message leaves the browser. The relay is a blind courier.'],
  ['Forward secrecy by default', 'Keys rotate with every message, so yesterday cannot be decrypted with today.'],
  ['Delete means delete', 'Burn a conversation and it is purged from both devices and the relay queue.'],
  ['Honest about limits', 'Open about the threat model — what Knots protects, and what it cannot.']
];

const STEPS = [
  ['Generate identity', 'Ed25519 and X25519 keys are created in your browser and never leave it.'],
  ['Send a request', 'A signed handshake carries a short memo. Accept or block without revealing more.'],
  ['Establish the session', 'X3DH agrees a root key; the Double Ratchet starts turning.'],
  ['Exchange & burn', 'Messages are sealed, delivered, and destroyed on your terms.']
];

const NOTES = [
  ['STRIDE threat model', 'Security'],
  ['X3DH + Double Ratchet', 'Cryptography'],
  ['Server-blind architecture', 'Architecture'],
  ['Relay API reference', 'API'],
  ['Free-tier deployment', 'Deployment']
];

const FAQ = [
  [
    'Is Knots really private?',
    'Messages are encrypted on your device before they are sent. The relay stores ciphertext, and even a full database breach reveals no readable content.'
  ],
  [
    'What does the server actually store?',
    'Hashed Knot IDs, public keys, and encrypted blobs with short TTLs. No names, no contact graph, no message content.'
  ],
  [
    'Do I need a phone number or email?',
    'No. Identity is a key pair generated in your browser, so there is nothing to sign up for and nothing to recover through a third party.'
  ],
  [
    'What happens if my device is seized?',
    'Keys live in your device storage, not on a server. Rotate your identity at any time, and burn conversations with a single action.'
  ],
  [
    'Is it free to run?',
    'Knots is built to run on free-tier infrastructure — a serverless relay, a TTL-indexed store, and a static client.'
  ]
];

const STATS = [
  ['0', 'bytes of PII held by the relay'],
  ['2', 'key pairs per identity'],
  ['100%', 'client-side encryption']
];

export function StatementSection() {
  return (
    <section className="kn-section">
      <div className="kn-wrap">
        <div className="kn-statement">
          <Reveal>
            <p className="kn-eyebrow">Statement</p>
          </Reveal>
          <Reveal delay={80}>
            <p className="kn-statement__body">
              There is no account, no phone number, no server-side contact book.
              Messages are sealed before they leave your device — and the knot that
              ties two people together <em>never leaves their hands</em>.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function CapabilitiesSection() {
  return (
    <section className="kn-section" id="capabilities">
      <div className="kn-wrap">
        <SectionHeading
          eyebrow="Capabilities"
          title="Four pieces of machinery, one private thread."
          lede="Every layer is designed so that the server — and anyone who compromises it — learns as little as possible."
        />

        <div className="kn-cap-list">
          {CAPABILITIES.map((cap, i) => (
            <Reveal className="kn-cap" key={cap.idx} delay={i * 60}>
              <span className="kn-cap__idx">{cap.idx}</span>
              <div>
                <h3 className="kn-cap__title">{cap.title}</h3>
                <p className="kn-cap__desc">{cap.desc}</p>
              </div>
              <div className="kn-plate kn-cap__thumb">
                <img src={cap.img} alt={`${cap.title}, in black and white`} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuoteSection() {
  return (
    <section className="kn-section kn-section--dark kn-quote">
      <div className="kn-wrap">
        <Reveal>
          <p className="kn-quote__text">
            Even a full database breach reveals nothing — because the server never held
            anything worth reading.
          </p>
        </Reveal>
        <Reveal delay={120} className="kn-quote__cite">
          From the Knots threat model
        </Reveal>
      </div>
    </section>
  );
}

export function PrinciplesSection() {
  return (
    <section className="kn-section" id="principles">
      <div className="kn-wrap">
        <SectionHeading
          eyebrow="Principles"
          title="Five rules we refuse to break."
          lede="These are not features. They are constraints the rest of the system is built around."
        />

        <div className="kn-principles">
          {PRINCIPLES.map(([title, desc], i) => (
            <Reveal className="kn-principle" key={title} delay={i * 50}>
              <span className="kn-principle__idx">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="kn-principle__title">{title}</h3>
                <p className="kn-principle__desc">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="kn-section" id="about">
      <div className="kn-wrap">
        <div className="kn-about">
          <Reveal>
            <figure>
              <div className="kn-plate kn-plate--portrait">
                <img src={IMG.corridor} alt="A sunlit concrete corridor, photographed in black and white" />
              </div>
              <figcaption className="kn-plate__cap">Fig. 02 — The relay holds the corridor, not the conversation</figcaption>
            </figure>
          </Reveal>

          <Reveal delay={100} className="kn-about__body">
            <h3>Built for people who would rather not be seen.</h3>
            <p>
              Knots is a server-blind messenger: the relay routes sealed envelopes
              without ever holding a key. Identity is a key pair created in the browser,
              and every session is negotiated directly between two devices.
            </p>
            <p>
              The result is a system where a breach of the infrastructure is not a breach
              of the conversation — and where deleting something actually deletes it.
            </p>

            <div className="kn-stats">
              {STATS.map(([value, label]) => (
                <div key={label}>
                  <div className="kn-stat__value">{value}</div>
                  <div className="kn-stat__label">{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function ProcessSection() {
  return (
    <section className="kn-section" id="process">
      <div className="kn-wrap">
        <SectionHeading
          eyebrow="Process"
          title="From first key to last message."
          lede="Four steps, none of which require trusting the server with a secret."
        />

        <div className="kn-process">
          {STEPS.map(([title, desc], i) => (
            <Reveal className="kn-step" key={title} delay={i * 70}>
              <span className="kn-step__idx">{String(i + 1).padStart(2, '0')}</span>
              <div className="kn-step__rule" />
              <h3 className="kn-step__title">{title}</h3>
              <p className="kn-step__desc">{desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NotesSection() {
  return (
    <section className="kn-section" id="notes">
      <div className="kn-wrap">
        <SectionHeading
          eyebrow="Field notes"
          title="The design, written down."
          lede="Everything the system claims is documented in the open, from the threat model to the wire format."
        />

        <div className="kn-notes">
          {NOTES.map(([title, chapter], i) => (
            <Reveal className="kn-note" key={title} delay={i * 45}>
              <span className="kn-note__title">{title}</span>
              <span className="kn-note__meta">Ch. {String(i + 1).padStart(2, '0')} — {chapter}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="kn-section" id="faq">
      <div className="kn-wrap">
        <SectionHeading
          eyebrow="Questions"
          title="What Knots does — and does not — protect."
        />

        <div className="kn-faq">
          {FAQ.map(([question, answer], i) => {
            const isOpen = open === i;
            return (
              <div className={`kn-faq__item ${isOpen ? 'is-open' : ''}`} key={question}>
                <button
                  type="button"
                  className="kn-faq__q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span>{question}</span>
                  <iconify-icon className="kn-faq__icon" icon="solar:add-circle-linear"></iconify-icon>
                </button>
                <div className="kn-faq__a">
                  <div>
                    <p>{answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AcquireSection({ onEnter }) {
  return (
    <section className="kn-section kn-section--dark kn-acquire">
      <div className="kn-wrap">
        <Reveal className="kn-acquire__inner">
          <p className="kn-eyebrow">Acquire</p>
          <h2 className="kn-acquire__title">Get the knot.</h2>
          <button type="button" className="kn-btn kn-btn--ondark" onClick={onEnter}>
            <span>Open Knots</span>
            <iconify-icon className="kn-btn__ic" icon="solar:arrow-right-up-linear"></iconify-icon>
          </button>
          <p className="kn-acquire__note">No account · No email · Keys on device</p>
        </Reveal>
      </div>
    </section>
  );
}
