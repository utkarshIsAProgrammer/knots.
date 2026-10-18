import React from 'react';
import { Reveal, Eyebrow } from './Primitives.jsx';

const HERO_IMAGE =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=black%20and%20white%20editorial%20photograph%2C%20close-up%20of%20two%20hands%20tying%20a%20knot%20in%20coarse%20linen%20thread%2C%20soft%20directional%20window%20light%2C%20deep%20shadows%2C%20high%20contrast%20monochrome%2C%20fine%20film%20grain%2C%20minimal%20light%20grey%20studio%20background&image_size=portrait_4_3';

const TICKER =
  'Server-blind · Zero PII · X3DH · Double Ratchet · Disappearing messages · Forward secrecy ·';

export default function LandingHero({ onEnter }) {
  return (
    <section className="kn-hero" id="top">
      <div className="kn-wrap">
        <div className="kn-hero__grid">
          <div>
            <Reveal>
              <Eyebrow>End-to-end encrypted messenger</Eyebrow>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="kn-display">
                Private words,
                <br />
                tied in a <em>single knot</em>.
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="kn-hero__lede">
                Knots is an end-to-end encrypted messenger with no accounts and no
                plaintext. Your keys are generated on your device, sessions are sealed
                with X3DH and the Double Ratchet, and the relay only ever sees ciphertext.
              </p>
            </Reveal>

            <Reveal delay={240} className="kn-hero__cta">
              <button type="button" className="kn-btn" onClick={onEnter}>
                <span>Open Knots</span>
                <iconify-icon className="kn-btn__ic" icon="solar:arrow-right-up-linear"></iconify-icon>
              </button>
              <a className="kn-btn kn-btn--ghost" href="#capabilities">
                <span>Explore the system</span>
              </a>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <figure>
              <div className="kn-plate kn-plate--portrait">
                <img
                  src={HERO_IMAGE}
                  alt="Two hands tying a knot in linen thread, photographed in black and white"
                />
              </div>
              <figcaption className="kn-plate__cap">Fig. 01 — The knot never leaves the device</figcaption>
            </figure>
          </Reveal>
        </div>
      </div>

      <div className="kn-marquee" aria-hidden="true">
        <div className="kn-marquee__track">
          {Array.from({ length: 6 }).map((_, i) => (
            <span className="kn-marquee__item" key={i}>
              {TICKER}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
