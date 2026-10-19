import { ConnectorLogo } from "./logo";
import type { Connector } from "./model";
export function ConnectorCard({
  connector,
  onOpen,
}: {
  connector: Connector;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="connector-card"
      onClick={onOpen}
      aria-label={`查看 ${connector.name}`}
    >
      <span className="connector-card-top">
        <ConnectorLogo connector={connector} />
        <strong>{connector.name}</strong>
        <span
          className={
            connector.connected
              ? "connector-state connected"
              : "connector-state"
          }
        >
          {connector.connected ? "已连接" : "未连接"}
        </span>
      </span>
      <span className="connector-description">{connector.description}</span>
    </button>
  );
}
