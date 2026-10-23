import { ChainLinkIcon } from "@/components/ui/chain-icon";

export function ConnectorLinkIcon({ className = "connector-link-icon" }: { className?: string }) {
  return <ChainLinkIcon className={className} />;
}

export function ConnectorDisconnectIcon({ className = "connector-unlink-icon" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m8.4 15.6-1.2 1.2a3.6 3.6 0 0 1-5.1-5.1l1.7-1.7" strokeDasharray="1 2.1" />
    <path d="m15.6 8.4 1.2-1.2a3.6 3.6 0 0 1 5.1 5.1L20.2 14" strokeDasharray="1 2.1" />
    <path d="M7.5 7.5 5.6 5.6M16.5 16.5l1.9 1.9M5.7 15.7l-2.5.8M18.3 8.3l2.5-.8M8.3 18.3l-.8 2.5M15.7 5.7l.8-2.5" />
  </svg>;
}
