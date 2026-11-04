const SIZE = 20;

export function BackIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="#3c9a3c" stroke="#1d4d1d" />
      <path d="M11.5 5.5 7 10l4.5 4.5M7 10h7" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function ForwardIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="#3c9a3c" stroke="#1d4d1d" />
      <path d="M8.5 5.5 13 10l-4.5 4.5M13 10H6" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 2h8l4 4v8l-4 4H6l-4-4V6z" fill="#d42020" stroke="#6b0000" />
      <path d="m7 7 6 6m0-6-6 6" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" fill="#fff" stroke="#000" />
      <path d="M13 8a3.5 3.5 0 1 0 0 4" fill="none" stroke="#2a8a2a" strokeWidth="2" />
      <path d="M11 5.5h3.5V9z" fill="#2a8a2a" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 10 10 3l8 7" fill="none" stroke="#7a1a1a" strokeWidth="2" />
      <path d="M4.5 9v8h11V9L10 4.5z" fill="#f2e6b8" stroke="#000" />
      <rect x="8.5" y="12" width="3" height="5" fill="#8b5a2b" stroke="#000" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2" y="5" width="13" height="13" fill="#fff" stroke="#000" />
      <rect x="2" y="5" width="13" height="3" fill="#000080" />
      <path d="M10 10 18 2M13 2h5v5" fill="none" stroke="#c00" strokeWidth="2" />
    </svg>
  );
}

export function PageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#000" />
      <circle cx="8" cy="9" r="3.5" fill="#1e6fd9" />
      <path d="M5 8.5c2-1.5 4-2 6-1" stroke="#f5c400" fill="none" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="#1084d0" stroke="#000" />
      <path d="M3 6c3 1 3-1 5 1s-1 3 1 5M9 2c0 2 2 2 3 3" fill="none" stroke="#3c3" strokeWidth="1.5" />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1 15 14H1z" fill="#ffd400" stroke="#000" />
      <rect x="7.25" y="5" width="1.5" height="5" fill="#000" />
      <rect x="7.25" y="11" width="1.5" height="1.5" fill="#000" />
    </svg>
  );
}
