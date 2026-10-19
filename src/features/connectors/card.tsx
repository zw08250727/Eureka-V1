import { connectorToolCount, type Connector } from "./model";
import { ConnectorMark } from "./mark";
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
      className={`connector-card ${connector.custom ? "is-custom" : "is-system"}`}
      data-connected={connector.connected}
      onClick={onOpen}
      aria-label={`查看 ${connector.name}`}
      title={`${connector.name} · ${connector.connected ? "已连接" : "未连接"}`}
    >
      <span className="connector-card-top">
        <ConnectorMark connector={connector} />
        <span className="connector-card-heading"><strong>{connector.name}</strong><span className="connector-kind">{connector.custom ? `已连接 ${connector.connected ? connectorToolCount(connector) : 0} 个tools` : connector.id === "tencent-meeting" ? "账号授权" : "CLI 授权"}</span></span>
        {connector.connected
          ? <span className="connector-connected-badge"><i aria-hidden="true" />已连接</span>
          : <span className="connector-card-action" aria-hidden="true">+</span>}
      </span>
      <span className="connector-description">{connector.description}</span>
    </button>
  );
}
