"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "▚▞░▒▓<>/\\|=+*·:";

/**
 * Scramble-decode reveal for instrument labels.
 * Screen readers always get the real text; motion is skipped
 * under prefers-reduced-motion.
 */
export default function DecodeText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const innerRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    let raf = 0;
    let timeout = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = text;
      return;
    }
    const run = () => {
      if (started.current) return;
      started.current = true;
      let frame = 0;
      const total = Math.max(16, Math.round(text.length * 1.6));
      const tick = () => {
        frame++;
        const reveal = Math.floor((frame / total) * text.length);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === " " || i < reveal) out += ch;
          else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (reveal < text.length) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          timeout = window.setTimeout(run, delay);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [text, delay]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={innerRef} aria-hidden="true" className="whitespace-pre-wrap">
        {text}
      </span>
    </span>
  );
}
