/** Compact outline transport icon, with a direction-independent 15-second label. */
export function MediaSkipIcon({ forward = false }: { forward?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 7.5a8 8 0 1 1-1.8 7M6 3.5v4H2" transform={forward ? "translate(24 0) scale(-1 1)" : undefined} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <text x="12" y="16.5" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="inherit">15</text>
  </svg>;
}
