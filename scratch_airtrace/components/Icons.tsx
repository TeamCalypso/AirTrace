interface IconProps {
  className?: string;
}

const base = "h-4 w-4";

export function FireIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 22c4.4 0 7-2.8 7-6.5 0-3.2-2.2-5.2-3.8-7C13.7 6.8 13 5 13 2c-3 2-4.2 5-4.2 7.5C7.4 8.6 6.6 7.8 6.4 6.5 5 8.3 5 10.6 5 12.2 5 18 7.6 22 12 22Z" />
      <path d="M12 22c-2 0-3.2-1.6-3.2-3.4 0-1.7 1.3-2.9 3.2-4.6 1.9 1.7 3.2 2.9 3.2 4.6 0 1.8-1.2 3.4-3.2 3.4Z" />
    </svg>
  );
}

export function WindIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M3 8h9a3 3 0 1 0-3-3" />
      <path d="M3 12h14a3 3 0 1 1-3 3" />
      <path d="M3 16h6a2.5 2.5 0 1 1-2.5 2.5" />
    </svg>
  );
}

export function LayersIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 2.8 8 12 13l9.2-5L12 3Z" />
      <path d="m2.8 12.5 9.2 5 9.2-5" />
      <path d="m2.8 17 9.2 5 9.2-5" strokeDasharray="2 3" />
    </svg>
  );
}

export function OrbitIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M17.8 6.2c1.5 1.5 1.9 3 1.1 3.8M6.2 17.8c-1.5-1.5-1.9-3-1.1-3.8" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-28 12 12)" />
      <circle cx="19" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PinIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 21s-6.5-5.3-6.5-10a6.5 6.5 0 0 1 13 0c0 4.7-6.5 10-6.5 10Z" />
      <circle cx="12" cy="10.6" r="2.2" />
    </svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.9-4.9" />
    </svg>
  );
}

export function CheckIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function AlertIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.4" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function BellIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function ArrowDownIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 4v16m0 0-6-6m6 6 6-6" />
    </svg>
  );
}

export function CrosshairIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}
