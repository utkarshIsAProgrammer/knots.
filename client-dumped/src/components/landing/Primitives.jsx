import React, { useEffect, useRef, useState } from 'react';

/**
 * Observes an element and reports the first time it enters the viewport.
 * Kept local to the landing surface so the app's global
 * `window.initInViewAnimations()` helper stays untouched.
 */
export function useInView({ threshold = 0.16, rootMargin = '0px 0px -8% 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}

/** Fades + lifts its children into place the first time they scroll into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView();

  return (
    <Tag
      ref={ref}
      className={`kn-reveal ${inView ? 'is-in' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms`, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Small uppercase label with a leading rule. */
export function Eyebrow({ children, className = '' }) {
  return <span className={`kn-eyebrow ${className}`.trim()}>{children}</span>;
}

/** Editorial two-column section header: eyebrow on the left, title + lede on the right. */
export function SectionHeading({ eyebrow, title, lede, id }) {
  return (
    <div className="kn-secthead" id={id}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : <span />}
      <div>
        {title ? <h2 className="kn-secthead__title">{title}</h2> : null}
        {lede ? <p className="kn-secthead__lede">{lede}</p> : null}
      </div>
    </div>
  );
}
